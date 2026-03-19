import { 
    BarChart3,
    CheckCircle2, 
    Clock, 
    PieChart as PieChartIcon, 
    Target, 
    Users, 
    TrendingUp, 
    Zap, 
    Search,
    LayoutDashboard,
    ChevronDown,
    AlertCircle,
    Building2,
    CalendarDays,
    Filter
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
import { useState, useMemo, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import type { Task } from '../types/kanban';
import { 
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
    Area
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
    const [searchTerm] = useState('');
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

    // Chart Data: Outros KPIs se necessário

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
            {/* Header Executivo Padronizado (Linkado ao Print 2) */}
            <header className="premium-header">
                <div className="header-info">
                    <div className="title-group">
                        <h1><BarChart3 size={24} /> Visão Executiva</h1>
                        <p>Monitoramento de diretoria: Produtividade e demandas ativas.</p>
                    </div>
                </div>

                <div className="header-filters-row">
                    {/* Filtro de Secretarias Padrão Site (Linkado ao Print 1) - AGORA NA MESMA LINHA */}
                    <div className="multi-select-standard">
                        <label className="filter-standard-label">SECRETARIA</label>
                        <div 
                            className={`standard-select-trigger ${isSecDropdownOpen ? 'open' : ''}`}
                            onClick={() => setIsSecDropdownOpen(!isSecDropdownOpen)}
                        >
                            <span className={`trigger-text ${selectedSecretarias.length > 0 ? 'selected' : ''}`}>
                                {selectedSecretarias.length === 0 
                                    ? 'Selecione...' 
                                    : `${selectedSecretarias.length} sel.`}
                            </span>
                            <ChevronDown size={16} color="#2563eb" />
                        </div>

                        {isSecDropdownOpen && (
                            <>
                                <div className="dropdown-overlay" onClick={() => { setIsSecDropdownOpen(false); setSecSearchQuery(''); }} />
                                <div className="standard-dropdown shadow-2xl">
                                    <div className="search-field-wrapper">
                                        <Search size={16} color="#94a3b8" />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar secretaria..." 
                                            value={secSearchQuery}
                                            onChange={(e) => setSecSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="standard-options">
                                        {['Geral / Diversos', 'Gabinete', 'SDS', 'SMS', 'SME', 'SMSO', 'SMADS', 'SMP', 'SMT', 'SVCS - Secretaria do Verde', 'SVCS - Gestão de Resíduos', 'SVCS - Bem-estar Animal', 'SRC - Receita', 'SIURB - Infraestrutura'].filter(sec => 
                                            sec.toLowerCase().includes(secSearchQuery.toLowerCase())
                                        ).map(sec => (
                                            <div 
                                                key={sec}
                                                className={`standard-option ${selectedSecretarias.includes(sec) ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedSecretarias(prev => 
                                                        prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
                                                    );
                                                }}
                                            >
                                                <div className="check-indicator" />
                                                {sec}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="period-pill">
                        <button 
                            className={period === 'today' ? 'active' : ''} 
                            onClick={() => setPeriod('today')}
                        >Hoje</button>
                        <button 
                            className={period === 'week' ? 'active' : ''} 
                            onClick={() => setPeriod('week')}
                        >Semana</button>
                        <button 
                            className={period === 'month' ? 'active' : ''} 
                            onClick={() => setPeriod('month')}
                        >Mês</button>
                        <button 
                            className={period === 'custom' ? 'active' : ''} 
                            onClick={() => {
                                setPeriod('custom');
                                setShowDateSelector(!showDateSelector);
                            }}
                        >
                            <CalendarDays size={18} /> Custom
                        </button>
                    </div>
                </div>
            </header>

            {/* Seletor Custom Data Flutuante ou Integrado */}
            {period === 'custom' && showDateSelector && (
                <div className="filters-row-pro glass-panel custom-date-row">
                    <div className="date-inputs-pro">
                        <div className="input-field">
                            <label>Início</label>
                            <input 
                                type="date" 
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                            />
                        </div>
                        <div className="input-field">
                            <label>Fim</label>
                            <input 
                                type="date" 
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards: Grid de 8 Cards (2x4) */}
            <div className="stats-grid-elite-8">
                {/* Total de Demandas */}
                <div 
                    className={`elite-card clickable blue ${!activeFilter ? 'active' : ''}`}
                    onClick={() => { setActiveFilter(null); scrollToTable(); }}
                >
                    <div className="elite-icon-box blue">
                        <Target size={32} />
                    </div>
                    <div className="elite-card-content">
                        <div className="elite-label">TOTAL DE DEMANDAS</div>
                        <div className="elite-value">{stats.total}</div>
                        <div className="elite-desc">Pautas geradas no período</div>
                    </div>
                </div>

                {/* Concluídas */}
                <div 
                    className={`elite-card clickable green ${activeFilter?.value === 'concluida' ? 'active' : ''}`}
                    onClick={() => { setActiveFilter({ type: 'status', value: 'concluida' }); scrollToTable(); }}
                >
                    <div className="elite-icon-box green">
                        <CheckCircle2 size={32} />
                    </div>
                    <div className="elite-card-content">
                        <div className="elite-label">CONCLUÍDAS</div>
                        <div className="elite-value">{stats.completed}</div>
                        <div className="elite-desc">Pautas publicadas e/ou canceladas</div>
                    </div>
                </div>

                {/* Em Andamento */}
                <div 
                    className={`elite-card clickable lightblue ${activeFilter?.value === 'producao' ? 'active' : ''}`}
                    onClick={() => { setActiveFilter({ type: 'status', value: 'producao' }); scrollToTable(); }}
                >
                    <div className="elite-icon-box lightblue">
                        <Clock size={32} />
                    </div>
                    <div className="elite-card-content">
                        <div className="elite-label">EM ANDAMENTO</div>
                        <div className="elite-value">{stats.inProgress}</div>
                        <div className="elite-desc">No funil de produção</div>
                    </div>
                </div>

                {/* Inaugurações */}
                <div 
                    className={`elite-card clickable orange ${activeFilter?.type === 'type' && activeFilter.value === 'inauguracao' ? 'active' : ''}`}
                    onClick={() => { setActiveFilter({ type: 'type', value: 'inauguracao' }); scrollToTable(); }}
                >
                    <div className="elite-icon-box orange">
                        <Building2 size={32} />
                    </div>
                    <div className="elite-card-content">
                        <div className="elite-label">INAUGURAÇÕES</div>
                        <div className="elite-value">{stats.inaugurations}</div>
                        <div className="elite-desc">Eventos mapeados no período</div>
                    </div>
                </div>

                {/* Aprovadas */}
                <div 
                    className={`elite-card clickable purple ${activeFilter?.value === 'aprovada' ? 'active' : ''}`}
                    onClick={() => { setActiveFilter({ type: 'status', value: 'aprovada' }); scrollToTable(); }}
                >
                    <div className="elite-icon-box purple">
                        <Zap size={32} />
                    </div>
                    <div className="elite-card-content">
                        <div className="elite-label">APROVADAS</div>
                        <div className="elite-value">{stats.approved}</div>
                        <div className="elite-desc">Aguardando publicação</div>
                    </div>
                </div>

                {/* Reprovadas */}
                <div 
                    className={`elite-card clickable red ${activeFilter?.value === 'reprovada' ? 'active' : ''}`}
                    onClick={() => { setActiveFilter({ type: 'status', value: 'reprovada' }); scrollToTable(); }}
                >
                    <div className="elite-icon-box red">
                        <AlertCircle size={32} />
                    </div>
                    <div className="elite-card-content">
                        <div className="elite-label">REPROVADAS</div>
                        <div className="elite-value">{stats.correcting}</div>
                        <div className="elite-desc">Canceladas ou reprovadas</div>
                    </div>
                </div>

                {/* Eficiência (Métrica BI de Entrega) */}
                <div className="elite-card blue shadow-sm">
                    <div className="elite-icon-box blue">
                        <TrendingUp size={32} />
                    </div>
                    <div className="elite-card-content">
                        <div className="elite-label">EFICIÊNCIA</div>
                        <div className="elite-value">+{Math.round((stats.completed / (stats.total || 1)) * 100)}%</div>
                        <div className="elite-desc">Taxa de entrega no período</div>
                    </div>
                </div>

                {/* Equipe (Métrica BI de Pessoas) */}
                <div className="elite-card purple shadow-sm">
                    <div className="elite-icon-box purple">
                        <Users size={32} />
                    </div>
                    <div className="elite-card-content">
                        <div className="elite-label">ENVOLVIDOS</div>
                        <div className="elite-value">12</div>
                        <div className="elite-desc">Pessoas na produção ativa</div>
                    </div>
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
