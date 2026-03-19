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
    Gauge,
    X,
    ChevronDown
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
import { useRef } from 'react';
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
    const [selectedSecretarias, setSelectedSecretarias] = useState<string[]>([]);
    const [secSearchQuery, setSecSearchQuery] = useState('');
    const [isSecDropdownOpen, setIsSecDropdownOpen] = useState(false);
    const [showDateSelector, setShowDateSelector] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    const scrollToTable = () => {
        tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

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
            
            const isInPeriod = isWithinInterval(date, { start, end });
            if (!isInPeriod) return false;

            // Filtro Multi-Secretarias
            if (selectedSecretarias.length > 0) {
                const taskSecs = task.inauguracao_secretarias || [];
                // Se tarefa não tem secretaria e filtramos por algo, ou se não bate com as selecionadas
                if (taskSecs.length === 0) return selectedSecretarias.includes('Geral / Diversos');
                return taskSecs.some(sec => selectedSecretarias.includes(sec));
            }

            return true;
        });
    }, [period, customStart, customEnd, allTasks, selectedSecretarias]);

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
        
        // Pautas Concluídas = Publicadas + Canceladas (Esforço de trabalho realizado)
        const completed = filteredTasks.filter(t => t.status === 'publicado' || t.status === 'cancelado').length;
        const completedPrev = prevPeriodTasks.filter(t => t.status === 'publicado' || t.status === 'cancelado').length;

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
            inProgress: filteredTasks.filter(t => ['producao', 'correcao'].includes(t.status)).length,
            inaugurations: filteredTasks.filter(t => t.type.includes('inauguracao') || t.status === 'inauguracao').length,
            approved: filteredTasks.filter(t => t.status === 'aprovado').length,
            correcting: filteredTasks.filter(t => t.status === 'correcao').length
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

    // Chart Data: Ranking de Secretarias (Solicitantes)
    const rankingSecretarias = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredTasks.forEach(t => {
            const secs = t.inauguracao_secretarias && t.inauguracao_secretarias.length > 0 
                ? t.inauguracao_secretarias 
                : ['Geral / Diversos'];
            
            secs.forEach(sec => {
                counts[sec] = (counts[sec] || 0) + 1;
            });
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [filteredTasks]);

    // Chart Data: Tipos de Material (Assuntos)
    const materialTypeData = useMemo(() => {
        const counts = { release: 0, post: 0, video: 0, foto: 0, inauguracao: 0, arte: 0 };
        filteredTasks.forEach(t => {
            if (t.type.includes('release')) counts.release++;
            if (t.type.includes('post')) counts.post++;
            if (t.type.includes('video')) counts.video++;
            if (t.type.includes('foto')) counts.foto++;
            if (t.type.includes('inauguracao')) counts.inauguracao++;
            if (t.type.includes('arte')) counts.arte++;
        });

        return [
            { name: 'Releases', value: counts.release, color: '#3b82f6', filter: 'release' },
            { name: 'Social Media', value: counts.post, color: '#f59e0b', filter: 'post' },
            { name: 'Vídeo/Reels', value: counts.video, color: '#f43f5e', filter: 'video' },
            { name: 'Fotografia', value: counts.foto, color: '#10b981', filter: 'foto' },
            { name: 'Inaugurações', value: counts.inauguracao, color: '#8b5cf6', filter: 'inauguracao' },
            { name: 'Arte/Design', value: counts.arte, color: '#6366f1', filter: 'arte' },
        ].filter(d => d.value > 0);
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
                if (activeFilter.type === 'status') {
                    if (activeFilter.value === 'concluida') {
                        return t.status === 'publicado' || t.status === 'cancelado';
                    }
                    return t.status === activeFilter.value;
                }
                if (activeFilter.type === 'type') return t.type.includes(activeFilter.value as any);
                if (activeFilter.type === 'secretaria') return t.inauguracao_secretarias?.includes(activeFilter.value) || (activeFilter.value === 'Geral / Diversos' && (!t.inauguracao_secretarias || t.inauguracao_secretarias.length === 0));
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

            {/* Header de Filtros Premium */}
            <div className="filters-row-pro glass-panel">
                <div className="filter-group">
                    <label>DEPARTAMENTO / SECRETARIA SOLICITANTE</label>
                    <div className="multi-select-pro">
                        <div 
                            className={`select-trigger ${isSecDropdownOpen ? 'open' : ''}`}
                            onClick={() => setIsSecDropdownOpen(!isSecDropdownOpen)}
                        >
                            <div className="selected-tags">
                                {selectedSecretarias.length === 0 && <span className="placeholder">Selecione uma ou mais secretarias...</span>}
                                {selectedSecretarias.map(sec => (
                                    <span key={sec} className="sec-tag-premium">
                                        {sec}
                                        <X size={12} onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedSecretarias(prev => prev.filter(s => s !== sec));
                                        }} />
                                    </span>
                                ))}
                            </div>
                            <ChevronDown size={18} className="chevron" />
                        </div>
                        
                        {isSecDropdownOpen && (
                            <>
                                <div className="dropdown-overlay" onClick={() => { setIsSecDropdownOpen(false); setSecSearchQuery(''); }} />
                                <div className="select-dropdown glass-panel">
                                    <div className="search-input-field">
                                        <Search size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar secretaria..." 
                                            value={secSearchQuery}
                                            onChange={(e) => setSecSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="dropdown-options">
                                        {['Geral / Diversos', 'Gabinete', 'SDS', 'SMS', 'SME', 'SMSO', 'SMADS', 'SMP', 'SMT', 'SVCS - Secretaria do Verde', 'SVCS - Gestão de Resíduos', 'SVCS - Bem-estar Animal', 'SRC - Receita', 'SIURB - Infraestrutura'].filter(sec => 
                                            sec.toLowerCase().includes(secSearchQuery.toLowerCase())
                                        ).map(sec => (
                                            <div 
                                                key={sec}
                                                className={`dropdown-item ${selectedSecretarias.includes(sec) ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedSecretarias(prev => 
                                                        prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
                                                    );
                                                    setSecSearchQuery(''); // Volta ao nada após selecionar
                                                }}
                                            >
                                                <div className="check-box">
                                                    {selectedSecretarias.includes(sec) && <div className="inner-check" />}
                                                </div>
                                                {sec}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {period === 'custom' && (
                    <div className="date-inputs-pro">
                        <div className="input-field">
                            <label>Início</label>
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                        </div>
                        <div className="input-field">
                            <label>Término</label>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            {/* KPI Cards: Grid de 8 Cards (2x4) */}
            <div className="stats-grid-elite-8">
                {/* Linha 1 */}
                <div className={`elite-card clickable ${!activeFilter ? 'active' : ''}`} onClick={() => { setActiveFilter(null); scrollToTable(); }}>
                    <div className="elite-card-top">
                        <div className="elite-icon-box blue"><Target /></div>
                    </div>
                    <div className="elite-value">{stats.total}</div>
                    <div className="elite-label">TOTAL DE DEMANDAS</div>
                    <div className="elite-desc">Pautas geradas no período</div>
                </div>

                <div className={`elite-card clickable ${activeFilter?.value === 'concluida' ? 'active' : ''}`} onClick={() => { setActiveFilter({ type: 'status', value: 'concluida' }); scrollToTable(); }}>
                    <div className="elite-card-top">
                        <div className="elite-icon-box green"><CheckCircle2 /></div>
                    </div>
                    <div className="elite-value">{stats.completed}</div>
                    <div className="elite-label">CONCLUÍDAS</div>
                    <div className="elite-desc">Pautas publicadas e/ou canceladas</div>
                </div>

                <div className={`elite-card clickable ${activeFilter?.value === 'producao' ? 'active' : ''}`} onClick={() => { setActiveFilter({ type: 'status', value: 'producao' }); scrollToTable(); }}>
                    <div className="elite-card-top">
                        <div className="elite-icon-box lightblue"><Clock /></div>
                    </div>
                    <div className="elite-value">{stats.inProgress}</div>
                    <div className="elite-label">EM ANDAMENTO</div>
                    <div className="elite-desc">No funil de produção</div>
                </div>

                <div className={`elite-card clickable ${activeFilter?.value === 'publicado' ? 'active' : ''}`} onClick={() => { setActiveFilter({ type: 'status', value: 'publicado' }); scrollToTable(); }}>
                    <div className="elite-card-top">
                        <div className="elite-icon-box yellow"><TrendingUp /></div>
                    </div>
                    <div className="elite-value">{stats.avgLeadTime} dias</div>
                    <div className="elite-label">LEAD TIME MÉDIO</div>
                    <div className="elite-desc">Tempo médio de produção</div>
                </div>

                {/* Linha 2 */}
                <div className={`elite-card clickable ${activeFilter?.type === 'type' && activeFilter.value === 'inauguracao' ? 'active' : ''}`} onClick={() => { setActiveFilter({ type: 'type', value: 'inauguracao' }); scrollToTable(); }}>
                    <div className="elite-card-top">
                        <div className="elite-icon-box orange"><LayoutDashboard /></div>
                    </div>
                    <div className="elite-value">{stats.inaugurations}</div>
                    <div className="elite-label">INAUGURAÇÕES</div>
                    <div className="elite-desc">Eventos mapeados no período</div>
                </div>

                <div className={`elite-card clickable ${activeFilter?.value === 'aprovado' ? 'active' : ''}`} onClick={() => { setActiveFilter({ type: 'status', value: 'aprovado' }); scrollToTable(); }}>
                    <div className="elite-card-top">
                        <div className="elite-icon-box purple"><CheckCircle2 /></div>
                    </div>
                    <div className="elite-value">{stats.approved}</div>
                    <div className="elite-label">APROVADAS</div>
                    <div className="elite-desc">Aguardando publicação</div>
                </div>

                <div className={`elite-card clickable ${activeFilter?.value === 'correcao' ? 'active' : ''}`} onClick={() => { setActiveFilter({ type: 'status', value: 'correcao' }); scrollToTable(); }}>
                    <div className="elite-card-top">
                        <div className="elite-icon-box red"><Gauge /></div>
                    </div>
                    <div className="elite-value">{stats.correcting}</div>
                    <div className="elite-label">EM CORREÇÃO</div>
                    <div className="elite-desc">Ajustes pendentes na equipe</div>
                </div>

                <div className="elite-card no-click">
                    <div className="elite-card-top">
                        <div className="elite-icon-box indigo"><Zap /></div>
                    </div>
                    <div className="elite-value">{Math.round((stats.completed / (stats.total || 1)) * 100)}%</div>
                    <div className="elite-label">TAXA DE CONVERSÃO</div>
                    <div className="elite-desc">Eficiência de entrega final</div>
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
                        <h3><PieChartIcon size={18} /> Assuntos & Materiais</h3>
                        <p>Distribuição por tipo de conteúdo</p>
                    </div>
                    <div className="chart-container-pro">
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={materialTypeData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    onClick={(data) => setActiveFilter({ type: 'type', value: data.filter || '' })}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {materialTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ranking de Secretarias */}
                <div className="pro-chart-box glass-panel half">
                    <div className="chart-header-pro">
                        <h3><Users size={18} /> Ranking de Secretarias</h3>
                        <p>Demandas por órgão municipal</p>
                    </div>
                    <div className="chart-container-pro">
                        {rankingSecretarias.length > 0 ? (
                            <div className="ranking-pro-list">
                                {rankingSecretarias.map((item, idx) => (
                                    <div 
                                        key={item.name} 
                                        className="ranking-pro-item" 
                                        onClick={() => setActiveFilter({ type: 'secretaria', value: item.name })}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="ranking-pro-info">
                                            <span className="rank-pos">{idx + 1}</span>
                                            <span className="rank-name">{item.name}</span>
                                        </div>
                                        <div className="rank-bar-container">
                                            <div className="rank-bar" style={{ width: `${(item.count / rankingSecretarias[0].count) * 100}%` }}></div>
                                            <span className="rank-value">{item.count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">Sem dados de secretarias.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Listagem Avançada */}
            <section className="advanced-list glass-panel" ref={tableRef}>
                <div className="list-header-pro">
                    <div className="list-title">
                        <h2>Explorador de Pautas</h2>
                        <span className="count-tag">{displayedTasks.length} resultados</span>
                    </div>
                </div>

                <div className="pro-table-wrapper">
                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>PAUTA</th>
                                <th>STATUS</th>
                                <th>DATA CRIAÇÃO</th>
                                <th>DATA FINALIZADA</th>
                                <th>SECRETARIAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedTasks.map(task => (
                                <tr key={task.id} onClick={() => setSelectedTask(task)}>
                                    <td className="task-title-cell">
                                        {task.title}
                                    </td>
                                    <td>
                                        <span className={`pro-badge status-${task.status}`}>
                                            {task.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>{task.createdAt ? format(new Date(task.createdAt), 'dd/MM/yyyy') : '-'}</td>
                                    <td>
                                        {task.status === 'publicado' || task.status === 'cancelado' 
                                            ? (task.dueDate ? format(new Date(task.dueDate), 'dd/MM/yyyy') : 'Concluído')
                                            : '-'
                                        }
                                    </td>
                                    <td>
                                        <div className="task-secretarias">
                                            {task.inauguracao_secretarias?.map(sec => (
                                                <span key={sec} className="sec-tag-mini">{sec}</span>
                                            ))}
                                            {(!task.inauguracao_secretarias || task.inauguracao_secretarias.length === 0) && '-'}
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
