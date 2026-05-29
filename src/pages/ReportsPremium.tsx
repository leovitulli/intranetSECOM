import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Activity, 
    Zap, 
    TrendingUp, 
    Target, 
    Clock, 
    BarChart3, 
    AlertCircle, 
    Sparkles, 
    CheckCircle2, 
    Award, 
    Calendar, 
    Search, 
    Users, 
    ExternalLink, 
    AlertTriangle,
    ArrowUpRight,
    UsersRound,
    HelpCircle,
    Check,
    ChevronRight,
    Lightbulb,
    LineChart,
    Sparkle,
    Printer,
    Building2,
    Briefcase
} from 'lucide-react';
import { 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    BarChart, 
    Bar, 
    Cell, 
    PieChart, 
    Pie, 
    Legend 
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { useData } from '../contexts/DataContext';
import TaskModal from '../components/TaskModal';
import type { Task } from '../types/kanban';
import { format, parseISO, differenceInDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, subDays, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeText } from '../utils/searchUtils';
import './ReportsPremium.css';
import './ProductivityPremium.css';
import './DashboardV3.css';

type FilterPeriod = 'today' | 'week' | 'month' | 'lastMonth' | 'custom';

interface RadarNoticia {
    id: string;
    title: string;
    url: string;
    category: string;
    published_at: string;
}

export default function ReportsPremium() {
    const { tasks, archivedTasks, team, loading } = useData();
    const [news, setNews] = useState<RadarNoticia[]>([]);
    const [loadingNews, setLoadingNews] = useState(true);
    const [period, setPeriod] = useState<FilterPeriod>('month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [isCustomSearchActive, setIsCustomSearchActive] = useState(false);
    const [selectedSecretaria, setSelectedSecretaria] = useState('');
    const [activeTab, setActiveTab] = useState<'resumo' | 'correlacao' | 'equipe' | 'relatorio'>('resumo');
    const [correlationTab, setCorrelationTab] = useState<'matched' | 'pending'>('matched');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // PhD Level Data drill-down filter state
    const [activeFilter, setActiveFilter] = useState<{ type: 'status' | 'type' | 'secretaria' | 'overdue' | 'active' | 'responsavel' | null; value: string; label: string } | null>(null);
    const explorerRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    // Fetch site news from public site (radar_noticias)
    useEffect(() => {
        async function fetchNews() {
            setLoadingNews(true);
            try {
                const { data, error } = await supabase
                    .from('radar_noticias')
                    .select('id, title, url, category, published_at')
                    .order('published_at', { ascending: false });

                if (!error && data) {
                    setNews(data);
                }
            } catch (err) {
                console.error("Error fetching radar news:", err);
            } finally {
                setLoadingNews(false);
            }
        }
        fetchNews();
    }, []);

    // Scroll helper when drilldown is triggered
    const scrollToExplorer = () => {
        setTimeout(() => {
            explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const scrollToTable = () => {
        tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Helper: Normalize & Tokenize strings for correlation overlap
    const cleanAndTokenize = (text: string): string[] => {
        const stopwords = new Set([
            'de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'na', 'se', 'por', 'mais', 'as', 'dos', 'das', 'como', 'mas', 'ao', 'ele', 'das', 'seu', 'sua', 'ou', 'quando', 'muito', 'nos', 'já', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'depois', 'sem', 'mesmo', 'aos', 'seus', 'quem', 'nas', 'me', 'esse', 'eles', 'você', 'essa', 'num', 'nem', 'suas', 'meu', 'à', 'sendo', 'suas', 'prefeitura', 'guarulhos', 'secom', 'secretaria'
        ]);
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // remove accents
            .replace(/[^a-z0-9\s]/g, '') // remove special characters
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopwords.has(word));
    };

    // Calculate match score between planned pauta (task) and published news
    const calculateCorrelationScore = (taskTitle: string, newsTitle: string): number => {
        const taskTokens = cleanAndTokenize(taskTitle);
        const newsTokens = cleanAndTokenize(newsTitle);
        if (taskTokens.length === 0 || newsTokens.length === 0) return 0;
        
        const intersection = taskTokens.filter(t => newsTokens.includes(t));
        const uniqueMatches = new Set(intersection);
        
        const score = (uniqueMatches.size / Math.min(taskTokens.length, newsTokens.length)) * 100;
        return Math.round(score);
    };

    // Pre-processing tasks for analytics: Including archived tasks to have real productivity history
    const allTasks = useMemo(() => {
        return [...tasks, ...archivedTasks].filter(t => !(t as any).deleted);
    }, [tasks, archivedTasks]);

    // Dynamic Filtered Tasks based on Period Selector & Secretarias
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
                start = startOfDay(subDays(now, 6));
                end = endOfDay(now);
                break;
            case 'month':
                start = startOfDay(subDays(now, 29));
                end = endOfDay(now);
                break;
            case 'lastMonth':
                start = startOfMonth(subMonths(now, 1));
                end = endOfMonth(subMonths(now, 1));
                break;
            case 'custom': {
                if (!isCustomSearchActive) {
                    start = startOfMonth(now);
                    end = endOfMonth(now);
                    break;
                }
                const s = customStart ? startOfDay(new Date(customStart + 'T00:00:00')) : new Date(0);
                const e = customEnd ? endOfDay(new Date(customEnd + 'T00:00:00')) : new Date('2100-01-01T00:00:00');
                start = s > e ? e : s;
                end = s > e ? s : e;
                break;
            }
            default:
                start = startOfMonth(now);
                end = endOfMonth(now);
        }

        return allTasks.filter(t => {
            if (!t.createdAt) return false;
            const date = typeof t.createdAt === 'string' ? new Date(t.createdAt) : t.createdAt;
            
            const isInPeriod = isWithinInterval(date, { start, end });
            if (!isInPeriod) return false;

            if (selectedSecretaria) {
                const taskSecs = [...(t.secretarias || []), ...(t.inauguracao_secretarias || [])];
                if (taskSecs.length === 0) return selectedSecretaria === 'Geral / Diversos';
                return taskSecs.includes(selectedSecretaria);
            }

            return true;
        });
    }, [period, customStart, customEnd, isCustomSearchActive, allTasks, selectedSecretaria]);

    // Unique secretarias for filters dropdown
    const secretariasOptions = useMemo(() => {
        const set = new Set<string>();
        allTasks.forEach(t => {
            [...(t.secretarias || []), ...(t.inauguracao_secretarias || [])].forEach(s => set.add(s));
        });
        return Array.from(set).sort();
    }, [allTasks]);

    // DRILLED DOWN TASKS: The current filtered sample shown in the explorer table
    const drilledDownTasks = useMemo(() => {
        let list = [...filteredTasks];

        if (searchTerm) {
            const term = normalizeText(searchTerm);
            list = list.filter(t => normalizeText(t.title).includes(term));
        }

        if (!activeFilter) return list;

        const { type, value } = activeFilter;
        return list.filter(t => {
            if (type === 'status') {
                if (value === 'concluida') return t.status === 'publicado' || t.status === 'cancelado';
                return t.status === value;
            }
            if (type === 'type') return t.type.includes(value as any);
            if (type === 'secretaria') {
                const secs = [...(t.secretarias || []), ...(t.inauguracao_secretarias || [])];
                if (secs.length === 0) return value === 'Geral / Diversos';
                return secs.includes(value);
            }
            if (type === 'overdue') {
                if (t.status === 'publicado' || t.status === 'aprovado' || t.status === 'cancelado') return false;
                if (!t.dueDate) return false;
                return new Date(t.dueDate) < new Date();
            }
            if (type === 'active') {
                return t.status !== 'publicado' && t.status !== 'cancelado';
            }
            if (type === 'responsavel') {
                return t.assignees?.includes(value);
            }
            return true;
        });
    }, [filteredTasks, activeFilter, searchTerm]);

    // Predictive / Advanced analytics variables
    const advancedStats = useMemo(() => {
        const total = filteredTasks.length;
        if (total === 0) {
            return {
                channelDiversificationIndex: 0,
                operationalFrictionScore: 0,
                workloadBalanceCoeff: 0,
                forecastRunrate: 0
            };
        }

        // 1. Channel Diversification: ratio of rich-media tasks (video, photo, post, arte) to plain text (release)
        const richMediaCount = filteredTasks.filter(t => t.type.some(type => ['video', 'foto', 'post', 'arte'].includes(type))).length;
        const channelDiversificationIndex = Math.round((richMediaCount / total) * 100);

        // 2. Operational Friction Score: avg days tasks spend in revision ('correcao')
        const correcaoTasks = filteredTasks.filter(t => t.status === 'correcao');
        const operationalFrictionScore = correcaoTasks.length > 0
            ? Math.round(correcaoTasks.reduce((sum, t) => {
                const age = differenceInDays(new Date(), new Date(t.createdAt));
                return sum + age;
            }, 0) / correcaoTasks.length)
            : 0;

        // 3. Workload Balance Coeff: variation across assignees
        const assigneeCounts = team.map(m => filteredTasks.filter(t => t.assignees?.includes(m.id)).length);
        const maxTasks = Math.max(...assigneeCounts, 1);
        const avgTasks = assigneeCounts.reduce((a, b) => a + b, 0) / team.length;
        const workloadBalanceCoeff = Math.max(10, Math.round((avgTasks / maxTasks) * 100));

        // 4. Forecast Runrate: Estimated tasks output in 30 days
        const limitDays = period === 'all' ? 365 : parseInt(period) || 30;
        const publishedCount = filteredTasks.filter(t => t.status === 'publicado').length;
        const forecastRunrate = Math.round((publishedCount / Math.max(1, limitDays)) * 30);

        return {
            channelDiversificationIndex,
            operationalFrictionScore,
            workloadBalanceCoeff,
            forecastRunrate
        };
    }, [filteredTasks, team, period]);

    // Basic Metrics Calculation
    const metrics = useMemo(() => {
        const total = filteredTasks.length;
        if (total === 0) {
            return {
                completionRate: 0,
                leadTime: 0,
                overdueCount: 0,
                activeVolume: 0
            };
        }

        const completed = filteredTasks.filter(t => t.status === 'publicado' || t.status === 'cancelado').length;
        const completionRate = Math.round((completed / total) * 100);

        const completedTasks = filteredTasks.filter(t => t.status === 'publicado' && t.createdAt);
        const leadTime = completedTasks.length > 0 
            ? Math.round(completedTasks.reduce((sum, t) => {
                const start = typeof t.createdAt === 'string' ? new Date(t.createdAt) : t.createdAt;
                const end = t.dueDate ? (typeof t.dueDate === 'string' ? new Date(t.dueDate) : t.dueDate) : new Date();
                return sum + Math.abs(differenceInDays(end, start));
            }, 0) / completedTasks.length)
            : 0;

        const overdueCount = filteredTasks.filter(t => {
            if (t.status === 'publicado' || t.status === 'aprovado' || t.status === 'cancelado') return false;
            if (!t.dueDate) return false;
            return new Date(t.dueDate) < new Date();
        }).length;

        const activeVolume = filteredTasks.filter(t => t.status !== 'publicado' && t.status !== 'cancelado').length;

        return {
            completionRate,
            leadTime: Math.max(0, leadTime),
            overdueCount,
            activeVolume
        };
    }, [filteredTasks]);

    // Status breakdown for charts
    const statusData = useMemo(() => {
        const counts: Record<string, number> = {
            'Solicitado': 0,
            'Produção': 0,
            'Correção': 0,
            'Aprovado': 0,
            'Publicado': 0,
            'Inauguração': 0
        };

        filteredTasks.forEach(t => {
            if (t.status === 'solicitado') counts['Solicitado']++;
            else if (t.status === 'producao') counts['Produção']++;
            else if (t.status === 'correcao') counts['Correção']++;
            else if (t.status === 'aprovado') counts['Aprovado']++;
            else if (t.status === 'publicado') counts['Publicado']++;
            else if (t.status === 'inauguracao') counts['Inauguração']++;
        });

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredTasks]);

    // Timeline data: tasks created vs completed
    const timelineData = useMemo(() => {
        const daysMap: Record<string, { criadas: number; publicadas: number }> = {};
        
        filteredTasks.forEach(t => {
            const createdStr = format(new Date(t.createdAt), 'dd MMM', { locale: ptBR });
            if (!daysMap[createdStr]) daysMap[createdStr] = { criadas: 0, publicadas: 0 };
            daysMap[createdStr].criadas++;

            if (t.status === 'publicado') {
                const pubDate = t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt);
                const pubStr = format(pubDate, 'dd MMM', { locale: ptBR });
                if (!daysMap[pubStr]) daysMap[pubStr] = { criadas: 0, publicadas: 0 };
                daysMap[pubStr].publicadas++;
            }
        });

        return Object.entries(daysMap)
            .map(([date, data]) => ({ date, ...data }))
            .slice(-15);
    }, [filteredTasks]);

    // Team Workload calculation
    const teamWorkload = useMemo(() => {
        return team.map(member => {
            const memberTasks = filteredTasks.filter(t => t.assignees?.includes(member.id));
            const totalAssigned = memberTasks.length;
            const completed = memberTasks.filter(t => t.status === 'publicado').length;
            const pending = totalAssigned - completed;
            const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

            let loadStatus: 'Livre' | 'Ideal' | 'Alta' = 'Livre';
            if (pending > 8) loadStatus = 'Alta';
            else if (pending >= 3) loadStatus = 'Ideal';

            return {
                ...member,
                totalAssigned,
                completed,
                pending,
                completionRate,
                loadStatus
            };
        }).sort((a, b) => b.pending - a.pending);
    }, [team, filteredTasks]);

    // Planned Releases (Releases type only)
    const plannedReleases = useMemo(() => {
        return filteredTasks.filter(t => t.type.includes('release'));
    }, [filteredTasks]);

    // Semantic correlation results (crossingplanned pautas with public site articles)
    const correlationResults = useMemo(() => {
        const matched: Array<{ score: number; task: Task; article: RadarNoticia }> = [];
        const pending: Task[] = [];

        plannedReleases.forEach(task => {
            let bestScore = 0;
            let bestArticle: RadarNoticia | null = null;

            news.forEach(article => {
                const score = calculateCorrelationScore(task.title, article.title);
                if (score > bestScore) {
                    bestScore = score;
                    bestArticle = article;
                }
            });

            // Threshold: score > 35% is considered a semantic link match
            if (bestScore > 35 && bestArticle) {
                matched.push({
                    score: bestScore,
                    task,
                    article: bestArticle
                });
            } else {
                pending.push(task);
            }
        });

        return {
            matched: matched.sort((a, b) => b.score - a.score),
            pending
        };
    }, [plannedReleases, news]);

    // Chart Data: Ranking de Secretarias (Solicitantes)
    const rankingSecretarias = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredTasks.forEach(t => {
            const secs = t.secretarias && t.secretarias.length > 0 
                ? t.secretarias 
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

    if (loading) {
        return (
            <div className="reports-premium loading">
                <div className="pulse-loader"></div>
                <p>Analisando indicadores de produtividade...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container dashboard-v3-root reports-premium prod-premium-container">
            {/* Header Superior Premium */}
            <header className="page-header dashboard-header-premium glass prod-premium-header no-print">
                <div className="header-meta">
                    <div className="prod-badge-glow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} />
                        <span>Gestão Analítica</span>
                    </div>
                    <h1 className="title text-gradient" style={{ margin: '6px 0 0' }}>Produtividade & Relatórios</h1>
                    <p className="subtitle" style={{ margin: '4px 0 0' }}>Métricas consolidadas, matriz de produtividade da equipe e batimento de pautas planejadas com o site.</p>
                </div>

                <div className="header-filters">
                    <div className="filter-tab-group">
                        <button className={period === 'today' ? 'active' : ''} onClick={() => setPeriod('today')}>Hoje</button>
                        <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>Semana</button>
                        <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>Mês</button>
                        <button className={period === 'lastMonth' ? 'active' : ''} onClick={() => setPeriod('lastMonth')}>Ant.</button>
                    </div>

                    <select 
                        value={selectedSecretaria} 
                        onChange={(e) => setSelectedSecretaria(e.target.value)}
                        className="select-premium"
                        style={{ height: '38px', padding: '0 1rem' }}
                    >
                        <option value="">Todas as Secretarias</option>
                        {secretariasOptions.map(sec => (
                            <option key={sec} value={sec}>{sec}</option>
                        ))}
                    </select>
                </div>
            </header>

            {/* Navigation Tabs (Estilo AURA v3.0) no-print */}
            <div className="prod-navigation-tabs no-print" style={{ alignSelf: 'flex-start', marginTop: '-8px' }}>
                <button 
                    className={`nav-tab-btn ${activeTab === 'resumo' ? 'active' : ''}`}
                    onClick={() => setActiveTab('resumo')}
                >
                    <Activity size={16} />
                    <span>Resumo & Análises</span>
                </button>
                <button 
                    className={`nav-tab-btn ${activeTab === 'correlacao' ? 'active' : ''}`}
                    onClick={() => setActiveTab('correlacao')}
                >
                    <Zap size={16} />
                    <span>Conversão (Pautas vs. Site)</span>
                    <span className="tab-pill" style={{ marginLeft: '6px' }}>{correlationResults.pending.length} pendentes</span>
                </button>
                {/* Commented out per user request: Matriz de Carga de Equipe and Relatório de Exportação
                <button 
                    className={`nav-tab-btn ${activeTab === 'equipe' ? 'active' : ''}`}
                    onClick={() => setActiveTab('equipe')}
                >
                    <UsersRound size={16} />
                    <span>Matriz de Carga de Equipe</span>
                </button>
                <button 
                    className={`nav-tab-btn ${activeTab === 'relatorio' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('relatorio'); setActiveFilter(null); }}
                >
                    <Printer size={16} />
                    <span>Relatório de Exportação</span>
                </button>
                */}
            </div>

            {/* ─── TAB CONTENT: RESUMO & ANÁLISES ─── */}
            {activeTab === 'resumo' && (
                <div className="tab-layout-fade no-print">
                    <div className="kpi-premium-grid">
                        <div 
                            className={`kpi-card glass-premium cyan-glow clickable-pro ${activeFilter?.type === 'active' ? 'active-filter' : ''}`}
                            onClick={() => {
                                setActiveFilter(activeFilter?.type === 'active' ? null : { type: 'active', value: 'ativo', label: 'Volume Ativo (Pautas Pendentes)' });
                                scrollToExplorer();
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="kpi-card-header">
                                <span>Volume Ativo</span>
                                <div className="kpi-icon-box"><Activity size={20} /></div>
                            </div>
                            <h2>{metrics.activeVolume}</h2>
                            <p>Pautas em andamento ou aprovação</p>
                            <div className="kpi-footer-metric text-cyan">
                                <TrendingUp size={14} /> <span>Filtrar Amostra</span>
                            </div>
                        </div>

                        <div 
                            className={`kpi-card glass-premium purple-glow clickable-pro ${activeFilter?.type === 'status' && activeFilter?.value === 'publicado' ? 'active-filter' : ''}`}
                            onClick={() => {
                                setActiveFilter(activeFilter?.value === 'publicado' ? null : { type: 'status', value: 'publicado', label: 'Pautas Publicadas' });
                                scrollToExplorer();
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="kpi-card-header">
                                <span>Taxa de Entrega</span>
                                <div className="kpi-icon-box"><Target size={20} /></div>
                            </div>
                            <h2>{metrics.completionRate}%</h2>
                            <p>Percentual de conclusão geral</p>
                            <div className="kpi-footer-metric text-purple">
                                <TrendingUp size={14} /> <span>Filtrar Concluídas</span>
                            </div>
                        </div>

                        <div 
                            className={`kpi-card glass-premium orange-glow clickable-pro ${activeFilter?.type === 'overdue' ? 'active-filter' : ''}`}
                            onClick={() => {
                                setActiveFilter(activeFilter?.type === 'overdue' ? null : { type: 'overdue', value: 'atrasado', label: 'Pautas Atrasadas (Urgentes)' });
                                scrollToExplorer();
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="kpi-card-header">
                                <span>Atrasos Críticos</span>
                                <div className="kpi-icon-box"><AlertCircle size={20} /></div>
                            </div>
                            <h2 className={metrics.overdueCount > 0 ? "pulse-warn text-orange" : ""}>{metrics.overdueCount}</h2>
                            <p>Pautas pendentes vencidas</p>
                            <div className="kpi-footer-metric text-orange">
                                <AlertTriangle size={14} /> <span>Filtrar Vencidas</span>
                            </div>
                        </div>

                        <div className="kpi-card glass-premium green-glow">
                            <div className="kpi-card-header">
                                <span>Lead Time Médio</span>
                                <div className="kpi-icon-box"><Clock size={20} /></div>
                            </div>
                            <h2>{metrics.leadTime} <span className="kpi-small-text" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>dias</span></h2>
                            <p>Prazo médio para entrega final</p>
                            <div className="kpi-footer-metric text-green">
                                <CheckCircle2 size={14} /> <span>Ritmo operacional ideal</span>
                            </div>
                        </div>
                    </div>

                    {/* Central de Estatísticas & Análise Preditiva */}
                    <div className="phd-analytics-panel glass-premium purple-glow" style={{ marginTop: '1.25rem', padding: '1.5rem' }}>
                        <div className="panel-header-pro" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div className="icon-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Lightbulb size={22} className="text-purple" />
                                <div>
                                    <h3 style={{ margin: 0, fontWeight: 800 }}>Central de Estatísticas & Análise Preditiva</h3>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Modelagem de tráfego de demandas para inteligência de assessoria</span>
                                </div>
                            </div>
                            <div className="phd-badge" style={{ background: '#f5f3ff', color: '#7c3aed', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>MODELAGEM QUANTITATIVA</div>
                        </div>

                        <div className="phd-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                            <div className="phd-stat-card glass-premium" style={{ padding: '1rem', background: '#f8fafc' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Mix de Conteúdo Rico</span>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0' }}>{advancedStats.channelDiversificationIndex}%</h3>
                                <div className="phd-progress" style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                                    <div className="phd-fill bg-cyan" style={{ width: `${advancedStats.channelDiversificationIndex}%`, height: '100%', background: '#0ea5e9' }}></div>
                                </div>
                                <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>Proporção de canais ricos frente a releases</p>
                            </div>

                            <div className="phd-stat-card glass-premium" style={{ padding: '1rem', background: '#f8fafc' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Equilíbrio de Carga</span>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0' }}>{advancedStats.workloadBalanceCoeff}%</h3>
                                <div className="phd-progress" style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                                    <div className="phd-fill bg-purple" style={{ width: `${advancedStats.workloadBalanceCoeff}%`, height: '100%', background: '#8b5cf6' }}></div>
                                </div>
                                <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>Balanceamento de pautas entre equipe</p>
                            </div>

                            <div className="phd-stat-card glass-premium clickable-pro" style={{ padding: '1rem', background: '#f8fafc', cursor: 'pointer' }} onClick={() => { setActiveFilter({ type: 'status', value: 'correcao', label: 'Pautas em Correção' }); scrollToExplorer(); }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Atrito Operacional</span>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0' }}>{advancedStats.operationalFrictionScore} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>dias</span></h3>
                                <div className="phd-progress" style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                                    <div className="phd-fill bg-orange" style={{ width: `${Math.min(advancedStats.operationalFrictionScore * 10, 100)}%`, height: '100%', background: '#f97316' }}></div>
                                </div>
                                <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>Permanência média em revisão/correção</p>
                            </div>

                            <div className="phd-stat-card glass-premium" style={{ padding: '1rem', background: '#f8fafc' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Ritmo Mensal Estimado</span>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '6px 0' }}>+{advancedStats.forecastRunrate} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>pautas</span></h3>
                                <div className="phd-progress" style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                                    <div className="phd-fill bg-green" style={{ width: '80%', height: '100%', background: '#10b981' }}></div>
                                </div>
                                <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>Volume estimado a ser concluído nos próximos 30 dias</p>
                            </div>
                        </div>

                        <div className="phd-insights-box" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.82rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.03em' }}>💡 Insights Estratégicos Baseados em Dados:</h4>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {advancedStats.channelDiversificationIndex < 40 && (
                                    <li><strong>🎯 Otimização de Mix:</strong> O índice de multicanalidade está baixo ({advancedStats.channelDiversificationIndex}%). Considere associar mais canais de fotos e posts aos releases normais para dinamizar a comunicação oficial.</li>
                                )}
                                {advancedStats.workloadBalanceCoeff < 70 && (
                                    <li><strong>⚡ Carga Desequilibrada:</strong> Há uma variação acentuada de tarefas entre colaboradores. Acesse a <em>Matriz de Carga de Equipe</em> para redistribuir melhor as demandas ativas.</li>
                                )}
                                {metrics.overdueCount > 0 && (
                                    <li><strong>⚠️ Protocolo de Velocidade:</strong> Há {metrics.overdueCount} pautas atrasadas. O gargalo pode estar no tempo médio em revisão ({advancedStats.operationalFrictionScore} dias). Agilizar a aprovação dos textos resolverá a maior parte dos atrasos.</li>
                                )}
                                {advancedStats.forecastRunrate > 0 && (
                                    <li><strong>📈 Projeção Operacional:</strong> Com o ritmo atual, estima-se a entrega e publicação de {advancedStats.forecastRunrate} matérias/pautas nos próximos 30 dias.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Gráficos Recharts */}
                    <div className="charts-premium-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
                        <div className="chart-card glass-premium" style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>Fluxo de Trabalho</h3>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 1rem 0' }}>Histórico de pautas criadas vs. publicadas no período</p>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={timelineData}>
                                        <defs>
                                            <linearGradient id="criadasGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="publicadasGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                                        <Tooltip contentStyle={{ border: 'none', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                                        <Legend verticalAlign="top" height={36} iconType="circle" />
                                        <Area name="Pautas Criadas" type="monotone" dataKey="criadas" stroke="#0ea5e9" fill="url(#criadasGrad)" strokeWidth={2} />
                                        <Area name="Publicadas / Concluídas" type="monotone" dataKey="publicadas" stroke="#a855f7" fill="url(#publicadasGrad)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="chart-card glass-premium" style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>Distribuição de Gargalos</h3>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 1rem 0' }}>Clique em qualquer coluna para detalhar ou isolar as pautas listadas abaixo</p>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart 
                                        data={statusData}
                                        onClick={(data) => {
                                            if (data && data.activeLabel) {
                                                const statusMap: Record<string, string> = {
                                                    'Solicitado': 'solicitado',
                                                    'Produção': 'producao',
                                                    'Correção': 'correcao',
                                                    'Aprovado': 'aprovado',
                                                    'Publicado': 'publicado',
                                                    'Inauguração': 'inauguracao'
                                                };
                                                const statusVal = statusMap[data.activeLabel] || data.activeLabel.toLowerCase();
                                                setActiveFilter(activeFilter?.value === statusVal ? null : { 
                                                    type: 'status', 
                                                    value: statusVal, 
                                                    label: `Status: ${data.activeLabel}` 
                                                });
                                                scrollToExplorer();
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                                        <Tooltip contentStyle={{ border: 'none', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                                        <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={24}>
                                            {statusData.map((entry, index) => {
                                                const colors = ['#38bdf8', '#3b82f6', '#fbbf24', '#c084fc', '#10b981', '#f43f5e'];
                                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Explorador de Pautas */}
                    <div className="explorer-premium-card glass-premium" ref={explorerRef} style={{ marginTop: '24px' }}>
                        <div className="explorer-header">
                            <div>
                                <h3>Explorador de Pautas</h3>
                                <p>Listagem filtrada e detalhada de acordo com as seleções de gráfico ou cards.</p>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <div className="explorer-search-container">
                                    <Search size={14} style={{ color: '#94a3b8' }} />
                                    <input 
                                        type="text"
                                        placeholder="Buscar por título..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="explorer-search-input"
                                    />
                                </div>

                                {activeFilter && (
                                    <div className="active-filter-glow-badge">
                                        <span>Filtro Ativo: <strong>{activeFilter.label}</strong></span>
                                        <button 
                                            onClick={() => setActiveFilter(null)}
                                            className="btn-clear-filter-pro"
                                        >
                                            Limpar Filtro ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="explorer-table-wrapper">
                            {drilledDownTasks.length === 0 ? (
                                <div className="no-matches-box">
                                    <HelpCircle size={32} />
                                    <p>Nenhuma pauta correspondente encontrada para este filtro no período.</p>
                                </div>
                            ) : (
                                <table className="explorer-table">
                                    <thead>
                                        <tr>
                                            <th>Título da Pauta</th>
                                            <th>Secretarias</th>
                                            <th>Criada em</th>
                                            <th>Status</th>
                                            <th>Prioridade</th>
                                            <th>Prazo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {drilledDownTasks.map(task => {
                                            const uniqueSecs = Array.from(new Set([
                                                ...(task.secretarias || []),
                                                ...(task.inauguracao_secretarias || [])
                                            ]));
                                            return (
                                                <tr 
                                                    key={task.id} 
                                                    className="explorer-row"
                                                    onClick={() => setSelectedTask(task)}
                                                    style={{ cursor: 'pointer' }}
                                                    title="Clique para ver os detalhes completos desta pauta"
                                                >
                                                    <td>
                                                        <span className="explorer-title-link">{task.title}</span>
                                                    </td>
                                                    <td>
                                                        <div className="tag-secretarias-container">
                                                            {uniqueSecs.length > 0 ? (
                                                                uniqueSecs.map(s => <span key={s} className="tag-sec">{s}</span>)
                                                            ) : (
                                                                <span className="tag-sec">Geral</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>{format(new Date(task.createdAt), 'dd/MM/yyyy')}</td>
                                                    <td>
                                                        <span className={`status-badge-premium ${task.status}`}>
                                                            {task.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`priority-badge-premium ${task.priority}`}>
                                                            {task.priority}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {task.dueDate ? (
                                                            <span className="dueDate-text">{format(new Date(task.dueDate), 'dd/MM/yyyy')}</span>
                                                        ) : (
                                                            <span className="dueDate-text text-muted">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB CONTENT: CORRELAÇÃO & CONVERSÃO ─── */}
            {activeTab === 'correlacao' && (
                <div className="tab-layout-fade no-print">
                    <div className="correlation-overview-card glass-premium cyan-glow" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', marginBottom: '1.5rem', background: '#fff' }}>
                        <div className="overview-kpis" style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                            <div className="overview-stat" style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Pautas de Releases</span>
                                <h3 style={{ fontSize: '2rem', fontWeight: 900, margin: '4px 0 0 0', color: '#1e293b' }}>{plannedReleases.length}</h3>
                            </div>
                            <div className="overview-divider" style={{ width: '1px', height: '40px', background: '#e2e8f0' }}></div>
                            <div className="overview-stat" style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Artigos no Site</span>
                                <h3 style={{ fontSize: '2rem', fontWeight: 900, margin: '4px 0 0 0', color: '#1e293b' }}>{news.length}</h3>
                            </div>
                            <div className="overview-divider" style={{ width: '1px', height: '40px', background: '#e2e8f0' }}></div>
                            <div className="overview-stat" style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Taxa de Conversão</span>
                                <h3 style={{ fontSize: '2rem', fontWeight: 900, margin: '4px 0 0 0', color: '#0ea5e9' }}>
                                    {plannedReleases.length > 0 ? Math.round((correlationResults.matched.length / plannedReleases.length) * 100) : 0}%
                                </h3>
                            </div>
                        </div>
                        <div className="overview-text" style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 6px 0', fontWeight: 800, fontSize: '1.05rem' }}>Mecanismo de Inteligência de Conversão</h3>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                                Este painel realiza um cruzamento semântico automático de todas as pautas planejadas de assessoria de imprensa frente aos artigos reais publicados no portal oficial da cidade. Assim, auditamos instantaneamente a eficiência da divulgação.
                            </p>
                        </div>
                    </div>

                    <div className="correlation-toggle-bar" style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem' }}>
                        <button 
                            className={`toggle-btn-v3 ${correlationTab === 'matched' ? 'active' : ''}`}
                            onClick={() => setCorrelationTab('matched')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                                background: correlationTab === 'matched' ? '#0ea5e9' : '#f1f5f9',
                                color: correlationTab === 'matched' ? '#fff' : '#64748b',
                                transition: 'all 0.2s'
                            }}
                        >
                            <CheckCircle2 size={16} />
                            <span>Pautas Publicadas no Portal ({correlationResults.matched.length})</span>
                        </button>
                        <button 
                            className={`toggle-btn-v3 ${correlationTab === 'pending' ? 'active' : ''}`}
                            onClick={() => setCorrelationTab('pending')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                                background: correlationTab === 'pending' ? '#ef4444' : '#f1f5f9',
                                color: correlationTab === 'pending' ? '#fff' : '#64748b',
                                transition: 'all 0.2s'
                            }}
                        >
                            <AlertCircle size={16} />
                            <span>Pautas Pendentes de Divulgação ({correlationResults.pending.length})</span>
                        </button>
                    </div>

                    {correlationTab === 'matched' ? (
                        <div className="correlation-list-wrapper">
                            {correlationResults.matched.length === 0 ? (
                                <div className="no-matches-box glass-premium" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                    <HelpCircle size={40} style={{ margin: '0 auto 8px' }} />
                                    <p style={{ margin: 0 }}>Nenhuma pauta pôde ser correlacionada semânticamente neste período com o site.</p>
                                </div>
                            ) : (
                                <div className="matched-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
                                    {correlationResults.matched.map((item, idx) => (
                                        <div key={idx} className="strat-audit-card glass-premium" style={{ borderLeft: '4px solid #0ea5e9' }}>
                                            <div className="press-header-row">
                                                <span className="source-name" style={{ color: '#0ea5e9' }}>🎯 Publicação Confirmada (Portal)</span>
                                                <span className="affinity-badge" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontSize: '0.7rem' }}>
                                                    {item.score}% afinidade
                                                </span>
                                            </div>

                                            <div className="audit-pair">
                                                <div className="pair-item">
                                                    <span>📋 1. PAUTA PLANEJADA (HUB):</span>
                                                    <p 
                                                        onClick={() => setSelectedTask(item.task)} 
                                                        className="pauta-interactive-link"
                                                    >
                                                        {item.task.title}
                                                    </p>
                                                </div>
                                                <div className="pair-divider"></div>
                                                <div className="pair-item">
                                                    <span>🌐 2. MATÉRIA PUBLICADA (SITE):</span>
                                                    <p className="article-title">{item.article.title}</p>
                                                </div>
                                            </div>

                                            <div className="audit-footer">
                                                <span className="dueDate-text text-muted" style={{ fontSize: '0.72rem' }}>Criada: {format(new Date(item.task.createdAt), 'dd/MM/yyyy')}</span>
                                                <a href={item.article.url} target="_blank" rel="noopener noreferrer" className="btn-external" style={{ color: '#0ea5e9' }}>
                                                    Ver no Site <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="correlation-list-wrapper">
                            {correlationResults.pending.length === 0 ? (
                                <div className="no-matches-box glass-premium" style={{ padding: '3rem', textAlign: 'center', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '16px' }}>
                                    <CheckCircle2 size={40} style={{ margin: '0 auto 8px' }} />
                                    <p style={{ margin: 0, fontWeight: 700 }}>Excelente! Todas as pautas de assessoria de imprensa planejadas foram publicadas com sucesso.</p>
                                </div>
                            ) : (
                                <div className="pending-table-card glass-premium" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                                    <table className="pending-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                                <th style={{ padding: '1rem' }}>Título da Pauta Pendente</th>
                                                <th style={{ padding: '1rem' }}>Secretarias</th>
                                                <th style={{ padding: '1rem' }}>Data de Criação</th>
                                                <th style={{ padding: '1rem' }}>Status</th>
                                                <th style={{ padding: '1rem' }}>Prioridade</th>
                                                <th style={{ padding: '1rem', textAlign: 'center' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {correlationResults.pending.map((task) => (
                                                <tr key={task.id} className="pending-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 700, color: '#ef4444', cursor: 'pointer' }} onClick={() => setSelectedTask(task)}>{task.title}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div className="tag-secretarias-container" style={{ display: 'flex', gap: '4px' }}>
                                                            {task.secretarias?.slice(0, 2).map(s => (
                                                                <span key={s} className="tag-sec" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.68rem', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>{s}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: '#64748b' }}>{format(new Date(task.createdAt), 'dd/MM/yyyy')}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span className={`status-badge-premium ${task.status}`}>{task.status}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span className={`priority-badge-premium ${task.priority}`}>{task.priority}</span>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <button 
                                                            onClick={() => setSelectedTask(task)}
                                                            style={{ border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                                                        >
                                                            Editar Pauta
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ─── TAB CONTENT: MATRIZ DE CARGA DE EQUIPE ─── */}
            {activeTab === 'equipe' && (
                <div className="tab-layout-fade no-print">
                    <div className="team-matrix-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        {teamWorkload.map(member => (
                            <div 
                                key={member.id} 
                                className={`member-load-card glass-premium clickable-pro ${activeFilter?.type === 'responsavel' && activeFilter?.value === member.id ? 'active-filter' : ''}`}
                                onClick={() => {
                                    setActiveFilter({ type: 'responsavel', value: member.id, label: `Assessor: ${member.name}` });
                                    setActiveTab('resumo');
                                    scrollToExplorer();
                                }}
                                style={{ padding: '1.25rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
                                title="Clique para filtrar as tarefas deste assessor na aba Resumo"
                            >
                                <div className="member-load-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                                    <div className="member-avatar-box" style={{ position: 'relative' }}>
                                        <img src={member.avatar_url || '/default-avatar.png'} alt={member.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                                        <span className={`load-status-dot ${member.loadStatus.toLowerCase()}`} style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #fff', background: member.loadStatus === 'Alta' ? '#ef4444' : member.loadStatus === 'Ideal' ? '#10b981' : '#3b82f6' }}></span>
                                    </div>
                                    <div className="member-info">
                                        <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem' }}>{member.name}</h4>
                                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{member.role}</span>
                                    </div>
                                </div>

                                <div className="member-load-metrics">
                                    <div className="load-metric-bar" style={{ marginBottom: '1rem' }}>
                                        <div className="bar-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>
                                            <span>Taxa de Resolução</span>
                                            <span>{member.completionRate}%</span>
                                        </div>
                                        <div className="progress-bg" style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                                            <div className="progress-fill" style={{ width: `${member.completionRate}%`, height: '100%', background: member.completionRate > 70 ? '#10b981' : '#3b82f6' }}></div>
                                        </div>
                                    </div>

                                    <div className="load-counts-row" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginBottom: '10px' }}>
                                        <div className="load-count-item" style={{ textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>Total</span>
                                            <strong style={{ display: 'block', fontSize: '1.05rem', color: '#1e293b' }}>{member.totalAssigned}</strong>
                                        </div>
                                        <div className="load-count-item" style={{ textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>Ativas</span>
                                            <strong style={{ display: 'block', fontSize: '1.05rem', color: '#f97316' }}>{member.pending}</strong>
                                        </div>
                                        <div className="load-count-item" style={{ textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>Entregues</span>
                                            <strong style={{ display: 'block', fontSize: '1.05rem', color: '#10b981' }}>{member.completed}</strong>
                                        </div>
                                    </div>

                                    <div className={`load-badge-footer ${member.loadStatus.toLowerCase()}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800, background: member.loadStatus === 'Alta' ? '#fef2f2' : member.loadStatus === 'Ideal' ? '#f0fdf4' : '#eff6ff', color: member.loadStatus === 'Alta' ? '#ef4444' : member.loadStatus === 'Ideal' ? '#10b981' : '#3b82f6' }}>
                                        <Zap size={12} />
                                        <span>Ocupação {member.loadStatus} · Detalhar 🔍</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── TAB CONTENT: EXPORTAÇÃO E PDF (Relatório de Impressão) ─── */}
            {activeTab === 'relatorio' && (
                <div className="tab-layout-fade">
                    {/* Botão de Impressão e aviso no-print */}
                    <div className="reports-print-toolbar no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Printer size={18} style={{ color: '#64748b' }} />
                            <div>
                                <h4 style={{ margin: 0, fontWeight: 800 }}>Pronto para Impressão Executiva</h4>
                                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Clique ao lado para gerar o PDF oficial ou imprimir fisicamente.</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => window.print()}
                            className="btn-primary-v3 ripple"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 1.25rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                            <Printer size={14} />
                            <span>Imprimir Relatório</span>
                        </button>
                    </div>

                    {/* Versão para Impressão Física / PDF (visível em Print) */}
                    <div className="print-only-header" style={{ display: 'none', marginBottom: '2rem' }}>
                        <div style={{ borderBottom: '2.5px solid #000', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                                <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>AURA · RELATÓRIO DE PRODUTIVIDADE</h1>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Secretaria de Comunicação Social (SECOM) · Guarulhos</p>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>
                                <strong>Gerado em:</strong> {new Date().toLocaleDateString('pt-BR')}<br />
                                <strong>Período:</strong> {period.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {/* Resumo de Indicadores Executivos em Grid */}
                    <div className="print-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="print-stat-card" style={{ border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '10px', background: '#fff' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Volume Analisado</span>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '6px 0 0 0' }}>{metrics.activeVolume + filteredTasks.filter(t => t.status === 'publicado').length}</h3>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>Total de demandas no período</p>
                        </div>
                        <div className="print-stat-card" style={{ border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '10px', background: '#fff' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Entregas Totais</span>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '6px 0 0 0' }}>{filteredTasks.filter(t => t.status === 'publicado').length}</h3>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>Matérias e produções concluídas</p>
                        </div>
                        <div className="print-stat-card" style={{ border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '10px', background: '#fff' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Lead Time Médio</span>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '6px 0 0 0' }}>{metrics.leadTime} dias</h3>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>Tempo médio para entrega final</p>
                        </div>
                        <div className="print-stat-card" style={{ border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '10px', background: '#fff' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Taxa de Entrega</span>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '6px 0 0 0' }}>{metrics.completionRate}%</h3>
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>Percentual de pautas resolvidas</p>
                        </div>
                    </div>

                    {/* Listagem de Impressão */}
                    <div className="print-table-wrapper" style={{ border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155', fontWeight: 800, textTransform: 'uppercase' }}>
                                    <th style={{ padding: '0.75rem 1rem' }}>Título da Pauta</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Canais</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Criação</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Prazo / Conclusão</th>
                                    <th style={{ padding: '0.75rem 1rem' }}>Secretaria Demandante</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.map(task => (
                                    <tr key={task.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>{task.title}</td>
                                        <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize' }}>{task.type.join(', ')}</td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '100px', background: task.status === 'publicado' ? '#ecfdf5' : '#f8fafc', color: task.status === 'publicado' ? '#047857' : '#64748b', border: '1px solid #cbd5e1' }}>
                                                {task.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{format(new Date(task.createdAt), 'dd/MM/yyyy')}</td>
                                        <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                                            {task.dueDate ? format(new Date(task.dueDate), 'dd/MM/yyyy') : '—'}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            {(() => {
                                                const secs = [...(task.secretarias || []), ...(task.inauguracao_secretarias || [])];
                                                return secs.length > 0 ? secs.join(', ') : 'Geral / Diversos';
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TaskModal for viewing/editing tasks directly */}
            {selectedTask && (
                <TaskModal 
                    task={selectedTask}
                    isOpen={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={() => {}}
                />
            )}
        </div>
    );
}
