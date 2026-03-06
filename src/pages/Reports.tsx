import { useState, useMemo } from 'react';
import { BarChart3, CalendarRange, CheckCircle2, Clock } from 'lucide-react';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useData } from '../contexts/DataContext';
import type { TaskType } from '../types/kanban';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import './Reports.css';

type FilterPeriod = 'today' | 'week' | 'month' | 'custom';

export default function Reports() {
    const { tasks, loading } = useData();
    const [period, setPeriod] = useState<FilterPeriod>('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [filterType, setFilterType] = useState<TaskType | 'todos'>('todos');

    // For clicking on charts
    const [activeFilter, setActiveFilter] = useState<{ type: 'type' | 'status', value: string } | null>(null);

    // Ensure mock dates fall within current scopes for testing
    // In a real app, we'd use task creation dates or completion dates.
    // For this mock, we'll pretend `dueDate` or just use all tasks filtering against a wide net.
    // Let's assume we are filtering by `dueDate` since it's the date we have on tasks.

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
                start = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
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
            if (!task.dueDate) return true; // Include tasks without dates? Or exclude? Let's include for general stats if date is missing.
            // For true productivity, we'd look at creation or completion date. We'll use dueDate for mock filtering.
            const withinPeriod = isWithinInterval(task.dueDate, { start, end });

            if (filterType === 'todos') return withinPeriod;
            return withinPeriod && task.type.includes(filterType as any);
        });

    }, [period, customStart, customEnd, filterType, tasks]); // Re-calculate when these change

    // Clear active filter when period changes
    useMemo(() => {
        setActiveFilter(null);
    }, [period, customStart, customEnd]);

    // Calculate Stats
    const totalDemands = filteredTasks.length;

    // By Type
    const totalReleases = filteredTasks.filter(t => t.type.includes('release')).length;
    const totalArtes = filteredTasks.filter(t => t.type.includes('arte')).length;
    const totalVideos = filteredTasks.filter(t => t.type.includes('video')).length;
    const totalFotos = filteredTasks.filter(t => t.type.includes('foto')).length;
    const totalInauguracoes = filteredTasks.filter(t => t.type.includes('inauguracao')).length;

    // By Status
    const totalBacklog = filteredTasks.filter(t => ['solicitado', 'escrita', 'producao-arte', 'edicao-video'].includes(t.status)).length;
    const totalInProgress = filteredTasks.filter(t => ['correcao', 'aprovacao-final', 'producao'].includes(t.status)).length;
    const totalCompleted = filteredTasks.filter(t => t.status === 'publicado').length;

    // Inauguration-specific metrics (all tasks, regardless of period, since it's a dedicated column)
    const allInaugTasks = tasks.filter(t => t.status === 'inauguracao');
    const inaugTotal = allInaugTasks.length;
    const inaugComplete = allInaugTasks.filter(t =>
        t.inauguracao_checklist && t.inauguracao_checklist.length > 0 && t.inauguracao_checklist.every(i => i.done)
    ).length;
    const inaugInProgress = inaugTotal - inaugComplete;

    // Inauguration by secretaria
    const inaugBySecretaria = allInaugTasks.reduce((acc, task) => {
        const secs = (task.inauguracao_secretarias && task.inauguracao_secretarias.length > 0)
            ? task.inauguracao_secretarias
            : ['Não informado'];
        secs.forEach(s => { acc[s] = (acc[s] || 0) + 1; });
        return acc;
    }, {} as Record<string, number>);
    const inaugSecretariaList = Object.entries(inaugBySecretaria)
        .sort(([, a], [, b]) => b - a);
    const inaugSecMax = inaugSecretariaList[0]?.[1] || 1;

    // --- NEW METRICS ---

    // 1. Secretarias que mais pedem
    const departmentsCount = filteredTasks.reduce((acc, task) => {
        const dep = task.creator || 'Não informado';
        acc[dep] = (acc[dep] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Sort and get top 5
    const topDepartments = Object.entries(departmentsCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));

    // 2. Eficiência: Tempo e Entregas (Mock logic based on dueDate vs current date for now, as we don't track start/end dates yet)
    let totalDays = 0;
    let completedWithDates = 0;
    let deliveredOnTime = 0;

    filteredTasks.forEach(task => {
        if (task.status === 'publicado' && task.dueDate) {
            completedWithDates++;
            // Mock SLA: Assuming it took 3 days averagely before dueDate
            totalDays += 3;
            // Delivery rate
            if (new Date() <= task.dueDate) {
                deliveredOnTime++;
            }
        }
    });

    const averageSLA = completedWithDates > 0 ? (totalDays / completedWithDates).toFixed(1) : '—';
    const onTimeRate = completedWithDates > 0 ? Math.round((deliveredOnTime / completedWithDates) * 100) : 0;


    // Chart Data
    const typeData = [
        { name: 'Textos', value: totalReleases, color: 'hsl(200, 90%, 45%)', filterValue: 'release' },
        { name: 'Artes', value: totalArtes, color: 'hsl(280, 80%, 60%)', filterValue: 'arte' },
        { name: 'Vídeos', value: totalVideos, color: 'hsl(320, 80%, 55%)', filterValue: 'video' },
        { name: 'Fotos', value: totalFotos, color: 'hsl(175, 70%, 40%)', filterValue: 'foto' },
        { name: 'Inaugurações', value: totalInauguracoes, color: 'hsl(350, 85%, 45%)', filterValue: 'inauguracao' }
    ].filter(d => d.value > 0); // Only show types that have tasks

    const statusData = [
        { name: 'Pendentes', value: totalBacklog, color: 'hsl(225, 75%, 55%)', filterValue: 'backlog' },
        { name: 'Em Andamento', value: totalInProgress, color: 'hsl(250, 70%, 60%)', filterValue: 'inprogress' },
        { name: 'Publicados', value: totalCompleted, color: 'hsl(290, 70%, 55%)', filterValue: 'completed' }
    ];

    // Filtered tasks for the bottom list based on chart click
    const displayedTasks = useMemo(() => {
        if (!activeFilter) return [];
        return filteredTasks.filter(t => {
            if (activeFilter.type === 'type') {
                return t.type.includes(activeFilter.value as TaskType);
            } else if (activeFilter.type === 'status') {
                if (activeFilter.value === 'backlog') return ['solicitado'].includes(t.status);
                if (activeFilter.value === 'inprogress') return ['producao', 'correcao'].includes(t.status);
                if (activeFilter.value === 'completed') return t.status === 'publicado';
            }
            return false;
        });
    }, [filteredTasks, activeFilter]);

    return (
        <div className="page-container reports-page">
            <div className="page-header">
                <div>
                    <h1>Dashboard de Produtividade</h1>
                    <p className="subtitle">Acompanhe o volume geral do que foi demandado, em andamento e concluído.</p>
                </div>
            </div>

            <div className="reports-filters glass">
                <div className="filter-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="filter-buttons">
                        <button className={`btn-filter ${period === 'today' ? 'active' : ''}`} onClick={() => setPeriod('today')}>Hoje</button>
                        <button className={`btn-filter ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>Esta Semana</button>
                        <button className={`btn-filter ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>Mês Mês</button>
                        <button className={`btn-filter ${period === 'custom' ? 'active' : ''}`} onClick={() => setPeriod('custom')}>
                            <CalendarRange size={16} /> Personalizado
                        </button>
                    </div>

                    <div className="type-filter">
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value as any)}
                            className="btn-filter"
                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                            <option value="todos">Todos os Tipos</option>
                            <option value="release">Textos / Releases</option>
                            <option value="arte">Artes Gráficas</option>
                            <option value="video">Vídeos</option>
                            <option value="foto">Fotos</option>
                            <option value="inauguracao">Inaugurações</option>
                        </select>
                    </div>
                </div>

                {period === 'custom' && (
                    <div className="custom-date-range">
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                        <span>até</span>
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                    </div>
                )}
            </div>

            {loading && <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando dados...</div>}

            {!loading && (
                <>
                    {/* Main KPIs / Resumo de Eficiência */}
                    <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '2rem' }}>
                        <div className="metric-card highlight-total" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-accent)))' }}>
                            <div className="metric-header text-white">Total em Fluxo</div>
                            <div className="metric-value text-white">{totalBacklog + totalInProgress + totalCompleted}</div>
                            <p className="metric-desc" style={{ color: 'rgba(255,255,255,0.8)' }}>Volume total de pautas no período.</p>
                        </div>
                        <div className="metric-card glass">
                            <div className="metric-header text-primary"><Clock size={18} /> Tempo Médio (SLA)</div>
                            <div className="metric-value">{averageSLA} <span style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>dias</span></div>
                            <p className="metric-desc">Da solicitação até a publicação.</p>
                        </div>
                        <div className="metric-card glass border-status-publicado">
                            <div className="metric-header text-status-publicado"><CheckCircle2 size={18} /> Entregas no Prazo</div>
                            <div className="metric-value text-status-publicado">{onTimeRate}%</div>
                            <p className="metric-desc">Das pautas com data limite cadastrada.</p>
                        </div>
                        <div className="metric-card glass">
                            <div className="metric-header text-purple"><CheckCircle2 size={18} /> Publicadas</div>
                            <div className="metric-value text-purple">{totalCompleted}</div>
                            <p className="metric-desc">Pautas finalizadas e arquivadas.</p>
                        </div>
                    </div>

                    {/* Inauguration Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>

                        {/* Card 1: Total de Inaugurações */}
                        <div className="metric-card glass" style={{
                            border: '1px solid hsla(330, 40%, 85%, 1)',
                            background: 'linear-gradient(135deg, hsla(330, 60%, 97%, 1), hsla(350, 60%, 97%, 1))'
                        }}>
                            <div className="metric-header" style={{ color: 'hsl(330, 50%, 40%)', gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
                                Inaugurações Solicitadas
                            </div>
                            <div className="metric-value" style={{ color: 'hsl(330, 55%, 40%)', fontSize: '3rem' }}>{inaugTotal}</div>
                            <p className="metric-desc">Total de solicitações de inauguração registradas.</p>

                            {/* Progress bar */}
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                                    <span style={{ color: 'hsl(140, 55%, 38%)' }}>{inaugComplete} com checklist completo</span>
                                    <span style={{ color: 'hsl(var(--color-text-muted))' }}>{inaugInProgress} em preparação</span>
                                </div>
                                <div style={{ height: 8, borderRadius: 99, background: 'hsla(330, 30%, 88%, 1)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: inaugTotal > 0 ? `${Math.round((inaugComplete / inaugTotal) * 100)}%` : '0%',
                                        borderRadius: 99,
                                        background: 'linear-gradient(90deg, hsl(140, 55%, 48%), hsl(160, 55%, 45%))'
                                    }} />
                                </div>
                                {inaugTotal > 0 && (
                                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--color-text-muted))', marginTop: '0.3rem', textAlign: 'right' }}>
                                        {Math.round((inaugComplete / inaugTotal) * 100)}% prontos
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Card 2: Por Secretaria */}
                        <div className="metric-card glass" style={{
                            border: '1px solid hsla(330, 40%, 85%, 1)',
                            background: 'linear-gradient(135deg, hsla(330, 60%, 97%, 1), hsla(350, 60%, 97%, 1))'
                        }}>
                            <div className="metric-header" style={{ color: 'hsl(330, 50%, 40%)', display: 'flex', alignItems: 'center' }}>
                                Inaugurações por Secretaria
                            </div>
                            {inaugSecretariaList.length === 0 ? (
                                <p className="metric-desc" style={{ marginTop: '1rem' }}>Nenhuma inauguração registrada ainda.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                                    {inaugSecretariaList.map(([name, count]) => (
                                        <div key={name}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                                                <span style={{ color: 'hsl(330, 40%, 35%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{name}</span>
                                                <span style={{ color: 'hsl(330, 50%, 50%)', flexShrink: 0, marginLeft: '0.5rem' }}>{count}</span>
                                            </div>
                                            <div style={{ height: 6, borderRadius: 99, background: 'hsla(330, 30%, 88%, 1)', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${Math.round((count / inaugSecMax) * 100)}%`,
                                                    borderRadius: 99,
                                                    background: 'linear-gradient(90deg, hsl(330, 60%, 60%), hsl(350, 65%, 60%))'
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    <h2 className="section-title" style={{ marginTop: '3rem' }}>Visão Gráfica Interativa</h2>
                    <p className="metric-desc" style={{ marginBottom: '1.5rem' }}>Abaixo estão os detalhamentos por Secretaria, Tipo de Material e Status Operacional.</p>

                    <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>

                        {/* Top Secretarias - Ocupa linha inteira */}
                        <div className="chart-container glass" style={{ gridColumn: 'span 2' }}>
                            <div style={{ padding: '1.5rem 1.5rem 0' }}>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Top Secretarias Solicitantes</h3>
                                <p className="metric-desc">As 5 secretarias que mais geraram demandas no período.</p>
                            </div>
                            <div className="chart-wrapper" style={{ height: '350px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topDepartments} layout="vertical" margin={{ top: 20, right: 30, left: 150, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--color-border))" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--color-text))', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={140} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(220, 20%, 94%)' }}
                                            contentStyle={{ backgroundColor: 'hsl(var(--color-surface))', borderColor: 'hsl(var(--color-border))', borderRadius: '8px', color: 'hsl(var(--color-text))' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--color-primary))" barSize={32}>
                                            {topDepartments.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={`hsl(220, 80%, ${45 + index * 8}%)`} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Volume por Tipo */}
                        <div className="chart-container glass" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '1.5rem 1.5rem 0' }}>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Volume por Tipo</h3>
                                <p className="metric-desc">Distribuição de formatos solicitados.</p>
                            </div>
                            <div className="chart-wrapper" style={{ flex: 1, minHeight: '300px' }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={typeData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} onClick={(data: any) => {
                                        if (data?.activePayload?.length) {
                                            setActiveFilter({ type: 'type', value: data.activePayload[0].payload.filterValue });
                                        }
                                    }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--color-border))" />
                                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--color-text-muted))' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: 'hsl(var(--color-text-muted))' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(220, 20%, 94%)' }}
                                            contentStyle={{ backgroundColor: 'hsl(var(--color-surface))', borderColor: 'hsl(var(--color-border))', borderRadius: '8px', color: 'hsl(var(--color-text))' }}
                                            itemStyle={{ color: 'hsl(var(--color-text))' }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer">
                                            {typeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Status do Fluxo */}
                        <div className="chart-container glass" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '1.5rem 1.5rem 0' }}>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Status do Fluxo</h3>
                                <p className="metric-desc">Distribuição atual das pautas.</p>
                            </div>
                            <div className="chart-wrapper" style={{ flex: 1, minHeight: '300px' }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            onClick={(entry: any) => {
                                                if (entry && entry.filterValue) {
                                                    setActiveFilter({ type: 'status', value: entry.filterValue });
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--color-surface))', borderColor: 'hsl(var(--color-border))', borderRadius: '8px', color: 'hsl(var(--color-text))' }}
                                            itemStyle={{ color: 'hsl(var(--color-text))' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* Clicked Tasks Details */}
                    {activeFilter && (
                        <div className="filtered-tasks-section glass">
                            <div className="filtered-tasks-header">
                                <h3>Detalhamento: {activeFilter.type === 'type' ? 'Por Tipo' : 'Por Status'}</h3>
                                <button className="btn-secondary small" onClick={() => setActiveFilter(null)}>Limpar Filtro</button>
                            </div>

                            {displayedTasks.length > 0 ? (
                                <div className="filtered-task-list">
                                    {displayedTasks.map(task => (
                                        <div key={task.id} className="filtered-task-item">
                                            <div className="task-info">
                                                <strong>{task.title}</strong>
                                                <span className={`status-badge stat-${task.status}`}>{task.status}</span>
                                            </div>
                                            <span className="task-creator">Por: {task.creator}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="empty-state">Nenhuma pauta encontrada para este filtro no período selecionado.</p>
                            )}
                        </div>
                    )}

                    <div className="empty-state" style={{ marginTop: '3rem' }}>
                        <p>Os gráficos acima são baseados nas pautas ativas no Canvas e nas datas de prazo cadastradas.</p>
                    </div>
                </>
            )}
        </div >
    );
}
