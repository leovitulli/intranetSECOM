import { useState, useMemo } from 'react';
import { CalendarRange, CheckCircle2, Clock, MapPin, BarChart3, PieChart as PieChartIcon, Target, Users } from 'lucide-react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useData } from '../contexts/DataContext';
import type { Task } from '../types/kanban';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import TaskModal from '../components/TaskModal';
import './Reports.css';

type FilterPeriod = 'today' | 'week' | 'month' | 'custom';

export default function Reports() {
    const { tasks, loading } = useData();
    const [period, setPeriod] = useState<FilterPeriod>('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const [activeFilter, setActiveFilter] = useState<{ type: 'type' | 'status' | 'secretaria', value: string } | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const filteredTasks = useMemo(() => {
        const now = new Date();
        let start: Date;
        let end: Date;

        switch (period) {
            case 'today':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case 'week':
                start = startOfWeek(now, { weekStartsOn: 1 });
                end = endOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'month':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'custom':
                start = customStart ? startOfDay(new Date(customStart)) : new Date(0);
                end = customEnd ? endOfDay(new Date(customEnd)) : new Date(8640000000000000);
                break;
            default:
                start = startOfMonth(now);
                end = endOfMonth(now);
        }

        return tasks.filter(task => {
            if ((task.status as string) === 'deleted' || (task as any).deleted === true) return false;
            if (task.archived === true) return false;
            if (!task.createdAt) return true;
            return isWithinInterval(task.createdAt, { start, end });
        });
    }, [period, customStart, customEnd, tasks]);

    // Helper to check if an inauguration is finished by checklist
    const isInaugurationFinished = (t: Task) => {
        if (t.status !== 'inauguracao') return false;
        if (!t.inauguracao_checklist || t.inauguracao_checklist.length === 0) return false;
        return t.inauguracao_checklist.every(item => item.done);
    };

    // Top Level Metrics (General Overview)
    const totalAbertas = filteredTasks.length;
    const totalConcluidas = filteredTasks.filter(t => t.status === 'publicado' || t.status === 'cancelado' || isInaugurationFinished(t)).length;
    const totalAndamento = filteredTasks.filter(t => 
        ['solicitado', 'producao', 'correcao'].includes(t.status) || 
        (t.status === 'inauguracao' && !isInaugurationFinished(t))
    ).length;
    const totalInauguracoes = filteredTasks.filter(t => t.type.includes('inauguracao') || t.status === 'inauguracao').length;
    const totalAprovadas = filteredTasks.filter(t => t.status === 'aprovado').length;
    const totalCanceladas = filteredTasks.filter(t => t.status === 'cancelado').length;

    // Chart Data: Tipos de Material
    const materialData = useMemo(() => {
        const counts = { release: 0, post: 0, video: 0, foto: 0, inauguracao: 0, arte: 0 };
        filteredTasks.forEach(task => {
            if (task.type.includes('release')) counts.release++;
            if (task.type.includes('post')) counts.post++;
            if (task.type.includes('video')) counts.video++;
            if (task.type.includes('foto')) counts.foto++;
            if (task.type.includes('arte')) counts.arte++;
            if (task.type.includes('inauguracao')) counts.inauguracao++;
        });

        return [
            { name: 'Release', value: counts.release, color: '#4F46E5', filter: 'release' },
            { name: 'Post', value: counts.post, color: '#D97706', filter: 'post' },
            { name: 'Vídeo', value: counts.video, color: '#EC4899', filter: 'video' },
            { name: 'Foto', value: counts.foto, color: '#10B981', filter: 'foto' },
            { name: 'Arte', value: counts.arte, color: '#8B5CF6', filter: 'arte' },
            { name: 'Inauguração', value: counts.inauguracao, color: '#F59E0B', filter: 'inauguracao' },
        ].filter(d => d.value > 0);
    }, [filteredTasks]);

    // Chart Data: Status Geral (Funil de Kanban)
    const statusData = useMemo(() => {
        const counts = {
            solicitado: 0,
            producao: 0,
            correcao: 0,
            aprovado: 0,
            publicado: 0,
            cancelado: 0,
            inauguracao: 0
        };

        filteredTasks.forEach(task => {
            if (counts[task.status] !== undefined) {
                counts[task.status]++;
            }
        });

        // Use standard CSS variables indirectly via hsl raw values approximating the css vars for recharts
        return [
            { name: 'Solicitação', value: counts.solicitado, color: 'hsl(225, 75%, 55%)', filter: 'solicitado' },
            { name: 'Em Produção', value: counts.producao, color: 'hsl(250, 70%, 60%)', filter: 'producao' },
            { name: 'Correção', value: counts.correcao, color: 'hsl(270, 70%, 60%)', filter: 'correcao' },
            { name: 'Aprovado', value: counts.aprovado, color: 'hsl(280, 70%, 55%)', filter: 'aprovado' },
            { name: 'Publicado', value: counts.publicado, color: 'hsl(290, 70%, 55%)', filter: 'publicado' },
            { name: 'Reprovado', value: counts.cancelado, color: 'hsl(0, 70%, 55%)', filter: 'cancelado' },
            { name: 'Inauguração', value: counts.inauguracao, color: 'hsl(310, 75%, 55%)', filter: 'inauguracao' },
        ].filter(d => d.value > 0);
    }, [filteredTasks]);

    // Chart Data: Ranking de Secretarias
    const rankingSecretarias = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredTasks.forEach(task => {
            const secretarias = (task.inauguracao_secretarias && task.inauguracao_secretarias.length > 0)
                ? task.inauguracao_secretarias
                : ['Gerais / Não Classificado'];

            secretarias.forEach(sec => {
                counts[sec] = (counts[sec] || 0) + 1;
            });
        });

        return Object.entries(counts)
            .map(([name, Demandas]) => ({ name, Demandas }))
            .sort((a, b) => b.Demandas - a.Demandas)
            .slice(0, 8); // Top 8 secretarias
    }, [filteredTasks]);

    // Table mapping
    const displayedTasks = useMemo(() => {
        if (!activeFilter) return filteredTasks;

        return filteredTasks.filter(t => {
            if (activeFilter.type === 'status') {
                if (activeFilter.value === 'andamento') {
                    return ['solicitado', 'producao', 'correcao'].includes(t.status) || 
                           (t.status === 'inauguracao' && !isInaugurationFinished(t));
                }
                if (activeFilter.value === 'concluida') {
                    return t.status === 'publicado' || t.status === 'cancelado' || isInaugurationFinished(t);
                }
                return t.status === activeFilter.value;
            }
            if (activeFilter.type === 'type') {
                return t.type.includes(activeFilter.value as any) || (activeFilter.value === 'inauguracao' && t.status === 'inauguracao');
            }
            if (activeFilter.type === 'secretaria') {
                return t.inauguracao_secretarias?.includes(activeFilter.value) ||
                    (activeFilter.value === 'Gerais / Não Classificado' && (!t.inauguracao_secretarias || t.inauguracao_secretarias.length === 0));
            }
            return true;
        });
    }, [filteredTasks, activeFilter]);


    if (loading) {
        return (
            <div className="reports-page loading">
                <p>Carregando métricas executivas...</p>
            </div>
        );
    }

    return (
        <div className="reports-page">
            <header className="page-header reports-header">
                <div className="header-left">
                    <h1 className="page-title">
                        <BarChart3 className="title-icon" />
                        Visão Executiva
                    </h1>
                    <p className="page-subtitle">Monitoramento de diretoria: Produtividade e demandas ativas.</p>
                </div>

                <div className="period-filters">
                    <button
                        className={`filter-btn ${period === 'today' ? 'active' : ''}`}
                        onClick={() => setPeriod('today')}
                    >Hoje</button>
                    <button
                        className={`filter-btn ${period === 'week' ? 'active' : ''}`}
                        onClick={() => setPeriod('week')}
                    >Nesta Semana</button>
                    <button
                        className={`filter-btn ${period === 'month' ? 'active' : ''}`}
                        onClick={() => setPeriod('month')}
                    >Neste Mês</button>
                    <button
                        className={`filter-btn ${period === 'custom' ? 'active' : ''}`}
                        onClick={() => setPeriod('custom')}
                    >
                        <CalendarRange size={16} /> Personalizado
                    </button>
                </div>
            </header>

            {period === 'custom' && (
                <div className="custom-date-row glass-panel">
                    <div className="date-field">
                        <label>Data Inicial</label>
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                    </div>
                    <div className="date-field">
                        <label>Data Final</label>
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                    </div>
                </div>
            )}

            {/* Top KPI Cards */}
            <div className="kpi-grid">
                <div
                    className={`kpi-card kpi-total ${activeFilter === null ? 'active-kpi' : ''}`}
                    onClick={() => setActiveFilter(null)}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="kpi-icon-wrapper">
                        <Target size={24} />
                    </div>
                    <div className="kpi-content">
                        <h3>Total de Demandas</h3>
                        <div className="kpi-value">{totalAbertas}</div>
                        <p className="kpi-label">Pautas geradas no período</p>
                    </div>
                </div>

                <div
                    className={`kpi-card kpi-success ${activeFilter?.value === 'concluida' ? 'active-kpi' : ''}`}
                    onClick={() => setActiveFilter({ type: 'status', value: 'concluida' })}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="kpi-icon-wrapper">
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="kpi-content">
                        <h3>Concluídas</h3>
                        <div className="kpi-value">{totalConcluidas}</div>
                        <p className="kpi-label">Pautas publicadas e/ou canceladas</p>
                    </div>
                </div>

                <div
                    className={`kpi-card kpi-warning ${activeFilter?.value === 'andamento' ? 'active-kpi' : ''}`}
                    onClick={() => setActiveFilter({ type: 'status', value: 'andamento' })}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="kpi-icon-wrapper">
                        <Clock size={24} />
                    </div>
                    <div className="kpi-content">
                        <h3>Em Andamento</h3>
                        <div className="kpi-value">{totalAndamento}</div>
                        <p className="kpi-label">No funil de produção</p>
                    </div>
                </div>

                <div
                    className={`kpi-card kpi-inaug ${activeFilter?.value === 'inauguracao' ? 'active-kpi' : ''}`}
                    onClick={() => setActiveFilter({ type: 'type', value: 'inauguracao' })}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="kpi-icon-wrapper">
                        <MapPin size={24} />
                    </div>
                    <div className="kpi-content">
                        <h3>Inaugurações</h3>
                        <div className="kpi-value">{totalInauguracoes}</div>
                        <p className="kpi-label">Eventos mapeados no período</p>
                    </div>
                </div>

                <div
                    className={`kpi-card kpi-aprovado ${activeFilter?.value === 'aprovado' ? 'active-kpi' : ''}`}
                    onClick={() => setActiveFilter({ type: 'status', value: 'aprovado' })}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="kpi-icon-wrapper">
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="kpi-content">
                        <h3>Aprovadas</h3>
                        <div className="kpi-value">{totalAprovadas}</div>
                        <p className="kpi-label">Aguardando publicação</p>
                    </div>
                </div>

                <div
                    className={`kpi-card kpi-cancelado ${activeFilter?.value === 'cancelado' ? 'active-kpi' : ''}`}
                    onClick={() => setActiveFilter({ type: 'status', value: 'cancelado' })}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="kpi-icon-wrapper">
                        <Target size={24} />
                    </div>
                    <div className="kpi-content">
                        <h3>Reprovadas</h3>
                        <div className="kpi-value">{totalCanceladas}</div>
                        <p className="kpi-label">Canceladas ou reprovadas</p>
                    </div>
                </div>
            </div>

            {/* Main Charts Area */}
            <div className="charts-grid-main">
                {/* Ranking de Secretarias */}
                <div className="chart-card ranking-card glass-panel">
                    <div className="chart-card-header">
                        <h3><Users size={18} /> Ranking de Secretarias</h3>
                        <p>Secretarias que mais demandaram pautas no período</p>
                    </div>
                    <div className="chart-body" style={{ height: 320 }}>
                        {rankingSecretarias.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={rankingSecretarias} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--color-border)" />
                                    <XAxis type="number" fontSize={12} stroke="var(--color-text-muted)" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={190} fontSize={11} stroke="var(--color-text-muted)" />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--color-surface))', color: 'hsl(var(--color-text))', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        itemStyle={{ color: 'hsl(var(--color-text))' }}
                                    />
                                    <Bar
                                        dataKey="Demandas"
                                        fill="#4F46E5"
                                        radius={[0, 4, 4, 0]}
                                        barSize={24}
                                        onClick={(data) => setActiveFilter({ type: 'secretaria', value: data.name || '' })}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-chart">Nenhuma demanda registrada no período.</div>
                        )}
                    </div>
                </div>

                <div className="charts-grid-secondary">
                    {/* Tipos de Material */}
                    <div className="chart-card glass-panel">
                        <div className="chart-card-header">
                            <h3><PieChartIcon size={18} /> Tipos de Material</h3>
                            <p>Clique no gráfico para filtrar a tabela</p>
                        </div>
                        <div className="chart-body" style={{ height: 260 }}>
                            {materialData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={materialData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            onClick={(data) => setActiveFilter({ type: 'type', value: data.filter || '' })}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {materialData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--color-surface))', color: 'hsl(var(--color-text))', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            itemStyle={{ color: 'hsl(var(--color-text))' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-chart">Sem dados no período</div>
                            )}
                        </div>
                    </div>

                    {/* Status Geral */}
                    <div className="chart-card glass-panel">
                        <div className="chart-card-header">
                            <h3><Target size={18} /> Status Geral</h3>
                            <p>Clique no gráfico para filtrar a tabela</p>
                        </div>
                        <div className="chart-body" style={{ height: 260 }}>
                            {statusData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={statusData} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                        <XAxis 
                                            dataKey="name" 
                                            fontSize={11} 
                                            stroke="var(--color-text-muted)" 
                                            interval={0}
                                            tick={(props: any) => {
                                                const { x, y, payload } = props;
                                                const words = payload.value.split('/');
                                                return (
                                                    <g transform={`translate(${x},${y})`}>
                                                        <text x={0} y={0} dy={16} textAnchor="middle" fill="var(--color-text-muted)" fontSize={11}>
                                                            {words[0]}
                                                        </text>
                                                        {words.length > 1 && (
                                                            <text x={0} y={0} dy={28} textAnchor="middle" fill="var(--color-text-muted)" fontSize={11}>
                                                                /{words[1]}
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            }}
                                        />
                                        <YAxis fontSize={12} stroke="var(--color-text-muted)" allowDecimals={false} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                            contentStyle={{ backgroundColor: 'hsl(var(--color-surface))', color: 'hsl(var(--color-text))', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            itemStyle={{ color: 'hsl(var(--color-text))' }}
                                        />
                                        <Bar
                                            dataKey="value"
                                            radius={[4, 4, 0, 0]}
                                            barSize={50}
                                            onClick={(data) => setActiveFilter({ type: 'status', value: data.filter || '' })}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-chart">Sem dados no período</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtered Tasks Table */}
            <div className="table-card glass-panel">
                <div className="table-header">
                    <h3>Detalhamento das Pautas do Período {activeFilter && `(Filtro Ativo: ${activeFilter.type === 'secretaria' ? 'Secretaria' : activeFilter.type === 'type' ? 'Tipo' : 'Status'})`}</h3>
                    {activeFilter && (
                        <button className="clear-filter-btn" onClick={() => setActiveFilter(null)}>
                            Limpar Filtro de Gráfico
                        </button>
                    )}
                </div>
                <div className="table-responsive">
                    <table className="rep-table">
                        <thead>
                            <tr>
                                <th>Título</th>
                                <th>Status</th>
                                <th>Secretarias</th>
                                <th>Criação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedTasks.map(t => (
                                <tr key={t.id} onClick={() => setSelectedTask(t)} className="clickable-row">
                                    <td className="t-title">{t.title}</td>
                                    <td>
                                        <span className={`status-badge stat-${t.status}`}>
                                            {t.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        {t.inauguracao_secretarias && t.inauguracao_secretarias.length > 0
                                            ? t.inauguracao_secretarias.join(', ')
                                            : 'Gerais'}
                                    </td>
                                    <td>{t.createdAt ? t.createdAt.toLocaleDateString('pt-BR') : '-'}</td>
                                </tr>
                            ))}
                            {displayedTasks.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="empty-table">Nenhuma pauta encontrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={() => { }}
                />
            )}
        </div>
    );
}
