import { useState, useMemo } from 'react';
import { 
    CalendarRange, 
    CheckCircle2, 
    Clock, 
    BarChart3, 
    PieChart as PieChartIcon, 
    Target, 
    Users, 
    TrendingUp, 
    Zap, 
    ArrowUpRight, 
    ArrowDownRight,
    Search,
    Download,
    Filter,
    LayoutDashboard,
    Gauge
} from 'lucide-react';
import { 
    startOfDay, 
    endOfDay, 
    startOfWeek, 
    endOfWeek, 
    startOfMonth, 
    endOfMonth, 
    isWithinInterval, 
    differenceInDays,
    subMonths,
    format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '../contexts/DataContext';
import type { Task } from '../types/kanban';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell, 
    PieChart, 
    Pie, 
    Legend,
    AreaChart,
    Area,
    LineChart,
    Line
} from 'recharts';
import TaskModal from '../components/TaskModal';
import './ReportsPremium.css';

type FilterPeriod = 'today' | 'week' | 'month' | 'lastMonth' | 'custom';

export default function ReportsPremium() {
    const { tasks, loading } = useData();
    const [period, setPeriod] = useState<FilterPeriod>('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [activeFilter, setActiveFilter] = useState<{ type: 'type' | 'status' | 'secretaria' | 'responsible', value: string } | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Pre-processing tasks for analytics
    const allTasks = useMemo(() => {
        return tasks.filter(t => !t.archived && !(t as any).deleted);
    }, [tasks]);

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
            case 'lastMonth':
                start = startOfMonth(subMonths(now, 1));
                end = endOfMonth(subMonths(now, 1));
                break;
            case 'custom':
                start = customStart ? startOfDay(new Date(customStart)) : new Date(0);
                end = customEnd ? endOfDay(new Date(customEnd)) : new Date(8640000000000000);
                break;
            default:
                start = startOfMonth(now);
                end = endOfMonth(now);
        }

        return allTasks.filter(task => {
            if (!task.createdAt) return false;
            const date = typeof task.createdAt === 'string' ? new Date(task.createdAt) : task.createdAt;
            return isWithinInterval(date, { start, end });
        });
    }, [period, customStart, customEnd, allTasks]);

    // Comparison data for last period (performance trending)
    const prevPeriodTasks = useMemo(() => {
        const now = new Date();
        let start: Date;
        let end: Date;

        if (period === 'month') {
            start = startOfMonth(subMonths(now, 1));
            end = endOfMonth(subMonths(now, 1));
        } else if (period === 'week') {
            const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
            start = startOfWeek(subMonths(startOfThisWeek, 1), { weekStartsOn: 1 }); // Simplificado para exemplo, ideal seria calcular semanas
            end = endOfWeek(subMonths(startOfThisWeek, 1), { weekStartsOn: 1 });
        } else {
            return []; // Outros períodos não comparados por enquanto
        }

        return allTasks.filter(task => {
            if (!task.createdAt) return false;
            const date = typeof task.createdAt === 'string' ? new Date(task.createdAt) : task.createdAt;
            return isWithinInterval(date, { start, end });
        });
    }, [period, allTasks]);

    // Metrics Calculation
    const stats = useMemo(() => {
        const total = filteredTasks.length;
        const totalPrev = prevPeriodTasks.length;
        
        const completed = filteredTasks.filter(t => t.status === 'publicado').length;
        const completedPrev = prevPeriodTasks.filter(t => t.status === 'publicado').length;

        const growth = totalPrev > 0 ? ((total - totalPrev) / totalPrev) * 100 : 0;
        const completedGrowth = completedPrev > 0 ? ((completed - completedPrev) / completedPrev) * 100 : 0;

        // Lead Time calculation (average days from creation to completion)
        const completedWithDates = filteredTasks.filter(t => t.status === 'publicado' && t.createdAt);
        const avgLeadTime = completedWithDates.length > 0 
            ? completedWithDates.reduce((acc, t) => {
                const start = typeof t.createdAt === 'string' ? new Date(t.createdAt) : t.createdAt;
                // Idealmente teríamos uma data de conclusão real, usando o dueDate como proxy ou data atual se publicado
                const end = t.dueDate ? (typeof t.dueDate === 'string' ? new Date(t.dueDate) : t.dueDate) : new Date();
                return acc + differenceInDays(end, start);
            }, 0) / completedWithDates.length 
            : 0;

        return {
            total,
            growth,
            completed,
            completedGrowth,
            avgLeadTime: Math.abs(Math.round(avgLeadTime)),
            inProgress: filteredTasks.filter(t => ['solicitado', 'producao', 'correcao'].includes(t.status)).length,
            inaugurations: filteredTasks.filter(t => t.type.includes('inauguracao') || t.status === 'inauguracao').length
        };
    }, [filteredTasks, prevPeriodTasks]);

    // Chart Data: Production Funnel (Gargalo)
    const funnelData = useMemo(() => {
        const counts = { solicitado: 0, producao: 0, correcao: 0, aprovado: 0, publicado: 0 };
        filteredTasks.forEach(t => {
            if (counts[t.status as keyof typeof counts] !== undefined) counts[t.status as keyof typeof counts]++;
        });

        return [
            { stage: 'Solicitado', value: counts.solicitado, color: '#facc15' },
            { stage: 'Produção', value: counts.producao, color: '#3b82f6' },
            { stage: 'Correção', value: counts.correcao, color: '#ef4444' },
            { stage: 'Aprovado', value: counts.aprovado, color: '#10b981' },
            { stage: 'Publicado', value: counts.publicado, color: '#6366f1' },
        ];
    }, [filteredTasks]);

    // Chart Data: Ranking de Responsáveis
    const responsibleRanking = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredTasks.forEach(t => {
            if (t.assignees && t.assignees.length > 0) {
                t.assignees.forEach(id => {
                    counts[id] = (counts[id] || 0) + 1;
                });
            } else {
                counts['Sem Responsável'] = (counts['Sem Responsável'] || 0) + 1;
            }
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [filteredTasks]);

    // Daily production trend
    const trendData = useMemo(() => {
        const now = new Date();
        const days = 14; // Last 14 days
        const data = [];
        
        for (let i = days; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const dayName = format(date, 'dd/MM', { locale: ptBR });
            
            const dayTasks = allTasks.filter(t => {
                const tDate = t.createdAt ? (typeof t.createdAt === 'string' ? new Date(t.createdAt) : t.createdAt) : null;
                return tDate && format(tDate, 'yyyy-MM-dd') === dateStr;
            });
            
            data.push({
                name: dayName,
                produzidas: dayTasks.length,
                concluidas: dayTasks.filter(t => t.status === 'publicado').length
            });
        }
        return data;
    }, [allTasks]);

    const displayedTasks = useMemo(() => {
        let list = [...filteredTasks];
        
        if (searchTerm) {
            list = list.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (activeFilter) {
            list = list.filter(t => {
                if (activeFilter.type === 'status') return t.status === activeFilter.value;
                if (activeFilter.type === 'type') return t.type.includes(activeFilter.value as any);
                if (activeFilter.type === 'responsible') return t.assignees?.includes(activeFilter.value);
                return true;
            });
        }

        return list;
    }, [filteredTasks, searchTerm, activeFilter]);

    if (loading) {
        return (
            <div className="reports-premium loading">
                <div className="pulse-loader"></div>
                <p>Analisando indicadores de produtividade...</p>
            </div>
        );
    }

    return (
        <div className="reports-premium">
            {/* Header com Design de Vidro */}
            <header className="premium-header glass-header">
                <div className="header-info">
                    <div className="header-tag">ESTATÍSTICAS AVANÇADAS</div>
                    <div className="title-row">
                        <LayoutDashboard className="title-icon-pro" />
                        <h1>Produtividade & BI</h1>
                    </div>
                    <p>Análise estratégica de demandas e fluxo de trabalho da SECOM.</p>
                </div>

                <div className="header-controls">
                    <div className="period-pill">
                        <button className={period === 'today' ? 'active' : ''} onClick={() => setPeriod('today')}>Hoje</button>
                        <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>Semana</button>
                        <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>Mês</button>
                        <button className={period === 'lastMonth' ? 'active' : ''} onClick={() => setPeriod('lastMonth')}>Anterior</button>
                        <button className={period === 'custom' ? 'active' : ''} onClick={() => setPeriod('custom')}>
                            <CalendarRange size={14} /> Custom
                        </button>
                    </div>
                </div>
            </header>

            {period === 'custom' && (
                <div className="custom-range-selector glass-panel">
                    <div className="input-group">
                        <label>Início</label>
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Fim</label>
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                    </div>
                </div>
            )}

            {/* KPI Cards: Estilo Premium */}
            <div className="stats-grid-elite">
                <div className="elite-card">
                    <div className="elite-card-top">
                        <div className="elite-icon-box blue"><Target /></div>
                        {stats.growth !== 0 && (
                            <div className={`elite-trend ${stats.growth > 0 ? 'up' : 'down'}`}>
                                {stats.growth > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {Math.abs(Math.round(stats.growth))}%
                            </div>
                        )}
                    </div>
                    <div className="elite-value">{stats.total}</div>
                    <div className="elite-label">Demandas Totais</div>
                    <div className="elite-desc">Solicitações abertas no período</div>
                    <div className="elite-progress-bg"><div className="elite-progress-bar blue" style={{ width: '100%' }}></div></div>
                </div>

                <div className="elite-card">
                    <div className="elite-card-top">
                        <div className="elite-icon-box green"><CheckCircle2 /></div>
                        {stats.completedGrowth !== 0 && (
                            <div className={`elite-trend ${stats.completedGrowth > 0 ? 'up' : 'down'}`}>
                                {stats.completedGrowth > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {Math.abs(Math.round(stats.completedGrowth))}%
                            </div>
                        )}
                    </div>
                    <div className="elite-value">{stats.completed}</div>
                    <div className="elite-label">Entregas Realizadas</div>
                    <div className="elite-desc">Pautas marcadas como publicadas</div>
                    <div className="elite-progress-bg"><div className="elite-progress-bar green" style={{ width: `${(stats.completed/stats.total)*100}%` }}></div></div>
                </div>

                <div className="elite-card">
                    <div className="elite-card-top">
                        <div className="elite-icon-box orange"><Clock /></div>
                    </div>
                    <div className="elite-value">{stats.avgLeadTime} dias</div>
                    <div className="elite-label">Lead Time Médio</div>
                    <div className="elite-desc">Tempo médio de produção</div>
                    <div className="elite-progress-bg"><div className="elite-progress-bar orange" style={{ width: stats.avgLeadTime > 5 ? '100%' : '40%' }}></div></div>
                </div>

                <div className="elite-card">
                    <div className="elite-card-top">
                        <div className="elite-icon-box purple"><Zap /></div>
                    </div>
                    <div className="elite-value">{Math.round((stats.completed / stats.total) * 100) || 0}%</div>
                    <div className="elite-label">Taxa de Conversão</div>
                    <div className="elite-desc">Eficiência de finalização</div>
                    <div className="elite-progress-bg"><div className="elite-progress-bar purple" style={{ width: `${(stats.completed/stats.total)*100}%` }}></div></div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="dashboard-layout-pro">
                {/* Tendência de Produção */}
                <div className="pro-chart-box glass-panel large">
                    <div className="chart-header-pro">
                        <div className="title-area">
                            <h3><TrendingUp size={18} /> Fluxo de Produção Diário</h3>
                            <p>Comparativo entre pautas criadas vs concluídas nos últimos 15 dias</p>
                        </div>
                    </div>
                    <div className="chart-container-pro">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorConc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="produzidas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
                                <Area type="monotone" dataKey="concluidas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorConc)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Funil de Gargalos */}
                <div className="pro-chart-box glass-panel half">
                    <div className="chart-header-pro">
                        <h3><Gauge size={18} /> Funil de Status (Gargalos)</h3>
                    </div>
                    <div className="chart-container-pro">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} fontSize={12} width={80} />
                                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ranking Humano */}
                <div className="pro-chart-box glass-panel half">
                    <div className="chart-header-pro">
                        <h3><Users size={18} /> Ranking de Responsáveis</h3>
                    </div>
                    <div className="chart-container-pro">
                        {responsibleRanking.length > 0 ? (
                            <div className="ranking-pro-list">
                                {responsibleRanking.map((item, idx) => (
                                    <div key={item.name} className="ranking-pro-item">
                                        <div className="ranking-pro-info">
                                            <span className="rank-pos">{idx + 1}</span>
                                            <span className="rank-name">{item.name}</span>
                                        </div>
                                        <div className="rank-bar-container">
                                            <div className="rank-bar" style={{ width: `${(item.count / responsibleRanking[0].count) * 100}%` }}></div>
                                            <span className="rank-value">{item.count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">Sem dados de responsáveis.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Listagem Avançada */}
            <section className="advanced-list glass-panel">
                <div className="list-header-pro">
                    <div className="list-title">
                        <h2>Explorador de Pautas</h2>
                        <span className="count-tag">{displayedTasks.length} resultados</span>
                    </div>
                    <div className="list-actions">
                        <div className="search-box-pro">
                            <Search size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar nos resultados..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="pro-action-btn"><Filter size={14} /> Filtros</button>
                        <button className="pro-action-btn primary"><Download size={14} /> Exportar</button>
                    </div>
                </div>

                <div className="pro-table-wrapper">
                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>PAUTA</th>
                                <th>STATUS</th>
                                <th>DATA CRIAÇÃO</th>
                                <th>PRIORIDADE</th>
                                <th>EQUIPE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedTasks.map(task => (
                                <tr key={task.id} onClick={() => setSelectedTask(task)}>
                                    <td className="task-title-cell">
                                        <span className="task-id">#{task.id.slice(0, 4)}</span>
                                        {task.title}
                                    </td>
                                    <td>
                                        <span className={`pro-badge status-${task.status}`}>
                                            {task.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>{task.createdAt ? format(new Date(task.createdAt), 'dd/MM/yyyy') : '-'}</td>
                                    <td>
                                        <span className={`pro-badge priority-${task.priority}`}>
                                            {task.priority.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="responsible-avatars">
                                            {task.assignees?.map(id => (
                                                <div key={id} className="avatar-mini" title={id}>
                                                    {id.charAt(0)}
                                                </div>
                                            ))}
                                            {(!task.assignees || task.assignees.length === 0) && '-'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {selectedTask && (
                <TaskModal 
                    task={selectedTask} 
                    onClose={() => setSelectedTask(null)} 
                    onUpdateTask={() => {}} 
                />
            )}
        </div>
    );
}
