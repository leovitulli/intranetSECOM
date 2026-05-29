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
    Sparkle
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
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './ProductivityPremium.css';

interface RadarNoticia {
    id: string;
    title: string;
    url: string;
    category: string;
    published_at: string;
}

export default function ProductivityPremium() {
    const { tasks, team, loading: dataLoading, updateTask } = useData();
    const handleUpdateTask = (updatedTask: Task) => {
        updateTask(updatedTask);
        setSelectedTask(null);
    };
    const [news, setNews] = useState<RadarNoticia[]>([]);
    const [loadingNews, setLoadingNews] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<'30' | '90' | '365' | 'all'>('365');
    const [selectedSecretaria, setSelectedSecretaria] = useState('');
    const [activeTab, setActiveTab] = useState<'resumo' | 'correlacao' | 'equipe'>('resumo');
    const [correlationTab, setCorrelationTab] = useState<'matched' | 'pending'>('matched');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    
    // PhD Level Data drill-down filter state
    const [activeFilter, setActiveFilter] = useState<{ type: 'status' | 'type' | 'secretaria' | 'overdue' | 'active' | 'responsavel' | null; value: string; label: string } | null>(null);
    const explorerRef = useRef<HTMLDivElement>(null);

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

    // Filtered Tasks by Period & Secretariat
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            // Secretarias filter
            if (selectedSecretaria && !t.secretarias?.includes(selectedSecretaria)) return false;
            
            // Period filter
            if (selectedPeriod !== 'all') {
                const limitDays = parseInt(selectedPeriod);
                const diff = differenceInDays(new Date(), new Date(t.createdAt));
                if (diff > limitDays) return false;
            }
            return true;
        });
    }, [tasks, selectedPeriod, selectedSecretaria]);

    // DRILLED DOWN TASKS: The current filtered sample shown in the explorer table at the bottom
    const drilledDownTasks = useMemo(() => {
        if (!activeFilter) return filteredTasks;

        const { type, value } = activeFilter;
        return filteredTasks.filter(t => {
            if (type === 'status') return t.status === value;
            if (type === 'type') return t.type?.includes(value as any);
            if (type === 'secretaria') return t.secretarias?.includes(value);
            if (type === 'responsavel') return t.assignees?.includes(value);
            if (type === 'overdue') {
                if (t.status === 'publicado' || t.status === 'aprovado' || t.status === 'cancelado') return false;
                if (!t.dueDate) return false;
                return new Date(t.dueDate) < new Date();
            }
            if (type === 'active') {
                return t.status !== 'publicado' && t.status !== 'cancelado';
            }
            return true;
        });
    }, [filteredTasks, activeFilter]);

    // Unique Secretarias list
    const secretariasOptions = useMemo(() => {
        const allSecs = tasks.flatMap(t => t.secretarias || []);
        return Array.from(new Set(allSecs)).sort();
    }, [tasks]);

    // Planned Pautas de Release
    const plannedReleases = useMemo(() => {
        return filteredTasks.filter(t => t.type?.includes('release'));
    }, [filteredTasks]);

    // CORRELATION ENGINE: Match planned pautas (releases) with actual published web releases (news)
    const correlationResults = useMemo(() => {
        if (plannedReleases.length === 0 || news.length === 0) return { matched: [], pending: [] };

        const matchedList: Array<{ task: Task; article: RadarNoticia; score: number }> = [];
        const pendingList: Task[] = [];

        plannedReleases.forEach(task => {
            let bestMatch: RadarNoticia | null = null;
            let highestScore = 0;

            news.forEach(art => {
                const score = calculateCorrelationScore(task.title, art.title);
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = art;
                }
            });

            if (bestMatch && highestScore >= 33) {
                matchedList.push({
                    task,
                    article: bestMatch,
                    score: highestScore
                });
            } else {
                pendingList.push(task);
            }
        });

        matchedList.sort((a, b) => b.score - a.score);

        return {
            matched: matchedList,
            pending: pendingList
        };
    }, [plannedReleases, news]);

    // Advanced Metrics for Ph.D. Marketing and Data Specialists
    const advancedStats = useMemo(() => {
        if (filteredTasks.length === 0) {
            return {
                channelDiversificationIndex: 0,
                operationalFrictionScore: 0,
                workloadGiniIndex: 0,
                forecastRunrate: 0
            };
        }

        // 1. Channel Diversification Index: ratio of multi-format content (videos + post + photos) to simple text releases
        const textOnly = filteredTasks.filter(t => t.type.includes('release') && !t.type.includes('video') && !t.type.includes('arte')).length;
        const richMedia = filteredTasks.filter(t => t.type.includes('video') || t.type.includes('arte') || t.type.includes('foto')).length;
        const channelDiversificationIndex = Math.round((richMedia / Math.max(textOnly + richMedia, 1)) * 100);

        // 2. Operational Friction Score: average days a task lingers in 'correcao' / revision phase
        const correctTasks = filteredTasks.filter(t => t.status === 'correcao');
        const operationalFrictionScore = correctTasks.length > 0
            ? Math.round(correctTasks.reduce((sum, t) => sum + differenceInDays(new Date(), new Date(t.createdAt)), 0) / correctTasks.length)
            : 2;

        // 3. Workload Balance Coefficient (standard deviation of pending tasks per employee)
        const pendingCounts = team.map(member => filteredTasks.filter(t => t.assignees?.includes(member.id) && t.status !== 'publicado').length);
        const avgPending = pendingCounts.reduce((s, c) => s + c, 0) / team.length || 1;
        const variance = pendingCounts.reduce((s, c) => s + Math.pow(c - avgPending, 2), 0) / team.length;
        const stdDeviation = Math.sqrt(variance);
        // Map stdDev to a beautiful balanced scale % (lower deviation = higher balance score)
        const workloadBalanceCoeff = Math.max(10, Math.min(100, Math.round(100 - (stdDeviation * 12))));

        // 4. Monthly Velocity Forecast Runrate: completed tasks per day projected for next 30 days
        const daysInRange = selectedPeriod === 'all' ? 365 : parseInt(selectedPeriod);
        const completedTasks = filteredTasks.filter(t => t.status === 'publicado' || t.status === 'aprovado').length;
        const velocityPerDay = completedTasks / Math.max(daysInRange, 1);
        const forecastRunrate = Math.round(velocityPerDay * 30);

        return {
            channelDiversificationIndex,
            operationalFrictionScore,
            workloadBalanceCoeff,
            forecastRunrate
        };
    }, [filteredTasks, team, selectedPeriod]);

    // Productivity metrics calculations
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

        const completed = filteredTasks.filter(t => t.status === 'publicado' || t.status === 'aprovado').length;
        const completionRate = Math.round((completed / total) * 100);

        const completedTasks = filteredTasks.filter(t => (t.status === 'publicado' || t.status === 'aprovado'));
        const leadTime = completedTasks.length > 0 
            ? Math.round(completedTasks.reduce((sum, t) => sum + differenceInDays(new Date(t.dueDate || new Date()), new Date(t.createdAt)), 0) / completedTasks.length)
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
            'Publicado': 0
        };

        filteredTasks.forEach(t => {
            if (t.status === 'solicitado') counts['Solicitado']++;
            else if (t.status === 'producao') counts['Produção']++;
            else if (t.status === 'correcao') counts['Correção']++;
            else if (t.status === 'aprovado') counts['Aprovado']++;
            else if (t.status === 'publicado') counts['Publicado']++;
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
            const completed = memberTasks.filter(t => t.status === 'publicado' || t.status === 'aprovado').length;
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

    return (
        <div className="prod-premium-container">
            {/* Header controls */}
            <div className="prod-premium-header glass-premium">
                <div className="header-meta">
                    <div className="prod-badge-glow">
                        <Sparkles size={16} />
                        <span>PREMIUM INTELLIGENCE</span>
                    </div>
                    <h1>Dashboard de Produtividade</h1>
                    <p>Métricas consolidadas, matriz de produtividade da equipe e cruzamento inteligente de pautas com o site.</p>
                </div>

                <div className="header-filters">
                    <div className="filter-tab-group">
                        <button 
                            className={selectedPeriod === '30' ? 'active' : ''} 
                            onClick={() => { setSelectedPeriod('30'); setActiveFilter(null); }}
                        >
                            30 Dias
                        </button>
                        <button 
                            className={selectedPeriod === '90' ? 'active' : ''} 
                            onClick={() => { setSelectedPeriod('90'); setActiveFilter(null); }}
                        >
                            Trimes.
                        </button>
                        <button 
                            className={selectedPeriod === '365' ? 'active' : ''} 
                            onClick={() => { setSelectedPeriod('365'); setActiveFilter(null); }}
                        >
                            Este Ano
                        </button>
                        <button 
                            className={selectedPeriod === 'all' ? 'active' : ''} 
                            onClick={() => { setSelectedPeriod('all'); setActiveFilter(null); }}
                        >
                            Tudo
                        </button>
                    </div>

                    <select 
                        value={selectedSecretaria} 
                        onChange={(e) => { setSelectedSecretaria(e.target.value); setActiveFilter(null); }}
                        className="select-premium"
                    >
                        <option value="">Todas as Secretarias</option>
                        {secretariasOptions.map(sec => (
                            <option key={sec} value={sec}>{sec}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="prod-navigation-tabs">
                <button 
                    className={`nav-tab-btn ${activeTab === 'resumo' ? 'active' : ''}`}
                    onClick={() => setActiveTab('resumo')}
                >
                    <Activity size={18} />
                    <span>Resumo & Análises</span>
                </button>
                <button 
                    className={`nav-tab-btn ${activeTab === 'correlacao' ? 'active' : ''}`}
                    onClick={() => setActiveTab('correlacao')}
                >
                    <Zap size={18} />
                    <span>Conversão (Pautas vs. Site)</span>
                    <span className="tab-pill">{correlationResults.pending.length} Pendentes</span>
                </button>
                <button 
                    className={`nav-tab-btn ${activeTab === 'equipe' ? 'active' : ''}`}
                    onClick={() => setActiveTab('equipe')}
                >
                    <UsersRound size={18} />
                    <span>Matriz de Carga de Equipe</span>
                </button>
            </div>

            {/* TAB CONTENT: RESUMO & ANÁLISES */}
            {activeTab === 'resumo' && (
                <div className="tab-layout-fade">
                    {/* Top KPI Cards (Clickable Drilldown) */}
                    <div className="kpi-premium-grid">
                        <div 
                            className={`kpi-card glass-premium cyan-glow clickable-pro ${activeFilter?.type === 'active' ? 'active-filter' : ''}`}
                            onClick={() => {
                                setActiveFilter({ type: 'active', value: 'ativo', label: 'Volume Ativo (Pautas Pendentes)' });
                                scrollToExplorer();
                            }}
                            title="Clique para filtrar a lista abaixo por volume ativo"
                        >
                            <div className="kpi-card-header">
                                <span>Volume Ativo</span>
                                <div className="kpi-icon-box"><Activity size={20} /></div>
                            </div>
                            <h2>{metrics.activeVolume}</h2>
                            <p>Tarefas em andamento ou aprovação</p>
                            <div className="kpi-footer-metric text-cyan">
                                <TrendingUp size={14} /> <span>Filtrar Amostra</span>
                            </div>
                        </div>

                        <div 
                            className={`kpi-card glass-premium purple-glow clickable-pro ${activeFilter?.type === 'status' && activeFilter?.value === 'publicado' ? 'active-filter' : ''}`}
                            onClick={() => {
                                setActiveFilter({ type: 'status', value: 'publicado', label: 'Pautas Publicadas/Concluídas' });
                                scrollToExplorer();
                            }}
                            title="Clique para filtrar a lista abaixo por pautas publicadas"
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
                                setActiveFilter({ type: 'overdue', value: 'atrasado', label: 'Pautas Atrasadas (Urgentes)' });
                                scrollToExplorer();
                            }}
                            title="Clique para filtrar a lista abaixo por pautas atrasadas"
                        >
                            <div className="kpi-card-header">
                                <span>Atrasos Críticos</span>
                                <div className="kpi-icon-box"><AlertCircle size={20} /></div>
                            </div>
                            <h2 className={metrics.overdueCount > 0 ? "pulse-warn" : ""}>{metrics.overdueCount}</h2>
                            <p>Tarefas pendentes vencidas</p>
                            <div className="kpi-footer-metric text-orange">
                                <AlertTriangle size={14} /> <span>Filtrar Vencidas</span>
                            </div>
                        </div>

                        <div className="kpi-card glass-premium green-glow">
                            <div className="kpi-card-header">
                                <span>Lead Time Médio</span>
                                <div className="kpi-icon-box"><Clock size={20} /></div>
                            </div>
                            <h2>{metrics.leadTime} <span className="kpi-small-text">dias</span></h2>
                            <p>Prazo médio para entrega final</p>
                            <div className="kpi-footer-metric text-green">
                                <CheckCircle2 size={14} /> <span>Agilidade ideal</span>
                            </div>
                        </div>
                    </div>

                    {/* Ph.D. level Predictive Analytics Panel */}
                    <div className="phd-analytics-panel glass-premium purple-glow">
                        <div className="panel-header-pro">
                            <div className="icon-title">
                                <Lightbulb size={22} className="text-purple animate-pulse" />
                                <div>
                                    <h3>Central de Estatísticas & Análise Preditiva</h3>
                                    <span>Modelagem semântica de tráfego de demandas para inteligência de assessoria</span>
                                </div>
                            </div>
                            <div className="phd-badge">MODELAGEM QUANTITATIVA</div>
                        </div>

                        <div className="phd-stats-grid">
                            <div className="phd-stat-card">
                                <span>Diversificação Multicanal</span>
                                <h3>{advancedStats.channelDiversificationIndex}%</h3>
                                <div className="phd-progress"><div className="phd-fill bg-cyan" style={{ width: `${advancedStats.channelDiversificationIndex}%` }}></div></div>
                                <p>Proporção de materiais ricos frente a textos</p>
                            </div>

                            <div className="phd-stat-card">
                                <span>Equilíbrio de Workload</span>
                                <h3>{advancedStats.workloadBalanceCoeff}%</h3>
                                <div className="phd-progress"><div className="phd-fill bg-purple" style={{ width: `${advancedStats.workloadBalanceCoeff}%` }}></div></div>
                                <p>Distribuição de tarefas entre colaboradores</p>
                            </div>

                            <div 
                                className={`phd-stat-card clickable-pro ${activeFilter?.type === 'status' && activeFilter?.value === 'correcao' ? 'active-filter' : ''}`}
                                onClick={() => {
                                    setActiveFilter({ type: 'status', value: 'correcao', label: 'Atrito Operacional (Pautas em Correção/Revisão)' });
                                    scrollToExplorer();
                                }}
                                title="Clique para filtrar pautas em Correção/Revisão"
                            >
                                <span>Atrito Operacional</span>
                                <h3>{advancedStats.operationalFrictionScore} <span className="small">dias</span></h3>
                                <div className="phd-progress"><div className="phd-fill bg-orange" style={{ width: `${Math.min(advancedStats.operationalFrictionScore * 10, 100)}%` }}></div></div>
                                <p>Tempo médio de permanência em revisão</p>
                                <div className="phd-card-footer-hint text-orange" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <Search size={12} /> <span>Filtrar pautas correlacionadas</span>
                                </div>
                            </div>

                            <div 
                                className={`phd-stat-card clickable-pro ${activeFilter?.type === 'status' && activeFilter?.value === 'aprovado' ? 'active-filter' : ''}`}
                                onClick={() => {
                                    setActiveFilter({ type: 'status', value: 'aprovado', label: 'Previsão de Entrega (Pautas Aprovadas para Publicação)' });
                                    scrollToExplorer();
                                }}
                                title="Clique para filtrar pautas Aprovadas para Publicação"
                            >
                                <span>Previsão de Entrega (30d)</span>
                                <h3>+{advancedStats.forecastRunrate} <span className="small">pautas</span></h3>
                                <div className="phd-progress"><div className="phd-fill bg-green" style={{ width: '80%' }}></div></div>
                                <p>Volume estimado baseado em ritmo histórico</p>
                                <div className="phd-card-footer-hint text-green" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <Search size={12} /> <span>Filtrar pautas correlacionadas</span>
                                </div>
                            </div>
                        </div>

                        <div className="phd-insights-box">
                            <h4 className="text-purple">💡 Recomendações Estratégicas Baseadas em Dados:</h4>
                            <ul>
                                {advancedStats.channelDiversificationIndex < 40 && (
                                    <li><strong>🎯 Otimização de Mix de Canal:</strong> Seu índice de multicanalidade está baixo ({advancedStats.channelDiversificationIndex}%). Sugere-se associar mais coberturas de fotos ou pequenos reels nas pautas de releases para elevar o engajamento no site.</li>
                                )}
                                {(advancedStats.workloadBalanceCoeff ?? 0) < 70 && (
                                    <li><strong>⚡ Correção de Sobrecarga:</strong> O índice de equilíbrio de workload está crítico ({(advancedStats.workloadBalanceCoeff ?? 0)}%). Algumas fotos e textos estão acumulados com poucos assessores. Utilize a Matriz de Carga de Equipe para redistribuir.</li>
                                )}
                                {metrics.overdueCount > 0 && (
                                    <li><strong>⚠️ Protocolo de Aceleração:</strong> Há {metrics.overdueCount} pautas em atraso crítico. O gargalo principal de tempo de atrito encontra-se na fase de revisão e aprovação. Reduzir as rodadas de correção de texto aumentará a velocidade de publicação.</li>
                                )}
                                {advancedStats.forecastRunrate > 0 && (
                                    <li><strong>📈 Estimativa de Metas:</strong> O ritmo operacional projeta a conclusão de aproximadamente {advancedStats.forecastRunrate} pautas para os próximos 30 dias. Excelente fluxo de tráfego de assessoria.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Chart sections (Interactive Drilldown) */}
                    <div className="charts-premium-grid">
                        {/* Timeline Area Chart */}
                        <div className="chart-card glass-premium">
                            <h3>Fluxo de Trabalho Recente</h3>
                            <p>Análise comparativa de pautas criadas vs. concluídas no período</p>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={timelineData}>
                                        <defs>
                                            <linearGradient id="criadasGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="publicadasGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                                        <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }} />
                                        <Legend verticalAlign="top" height={36} />
                                        <Area name="Pautas Criadas" type="monotone" dataKey="criadas" stroke="#0ea5e9" fillOpacity={1} fill="url(#criadasGrad)" strokeWidth={2} />
                                        <Area name="Pautas Publicadas" type="monotone" dataKey="publicadas" stroke="#a855f7" fillOpacity={1} fill="url(#publicadasGrad)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Status Breakdown Bar Chart */}
                        <div className="chart-card glass-premium">
                            <h3>Distribuição de Gargalos</h3>
                            <p>Clique em qualquer coluna de status para detalhar/filtrar as pautas abaixo</p>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart 
                                        data={statusData}
                                        onClick={(data) => {
                                            if (data && data.activeLabel) {
                                                const statusMap: Record<string, string> = {
                                                    'Solicitado': 'solicitado',
                                                    'Produção': 'producao',
                                                    'Correção': 'correcao',
                                                    'Aprovado': 'aprovado',
                                                    'Publicado': 'publicado'
                                                };
                                                const statusVal = statusMap[String(data.activeLabel)] || String(data.activeLabel).toLowerCase();
                                                setActiveFilter({ 
                                                    type: 'status', 
                                                    value: statusVal, 
                                                    label: `Status: ${data.activeLabel}` 
                                                });
                                                scrollToExplorer();
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                                        <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }} />
                                        <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]}>
                                            {statusData.map((entry, index) => {
                                                const colors = ['#38bdf8', '#fb7185', '#fbbf24', '#c084fc', '#34d399'];
                                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Drill-down Sample Table / Pautas Explorer */}
                    <div className="explorer-premium-card glass-premium" ref={explorerRef} style={{ marginTop: '24px' }}>
                        <div className="explorer-header">
                            <div>
                                <h3>Explorador de Pautas Filtradas</h3>
                                <p>Amostra analítica e detalhada das pautas selecionadas</p>
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

                        <div className="explorer-table-wrapper">
                            {drilledDownTasks.length === 0 ? (
                                <div className="no-matches-box">
                                    <HelpCircle size={32} />
                                    <p>Nenhuma pauta encontrada no período selecionado para este filtro.</p>
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
                                        {drilledDownTasks.map(task => (
                                            <tr 
                                                key={task.id} 
                                                className="explorer-row"
                                                onClick={() => setSelectedTask(task)}
                                                style={{ cursor: 'pointer' }}
                                                title="Clique para editar/ver detalhes desta pauta"
                                            >
                                                <td>
                                                    <span className="explorer-title-link">{task.title}</span>
                                                </td>
                                                <td>
                                                    <div className="tag-secretarias-container">
                                                        {task.secretarias && task.secretarias.length > 0 ? (
                                                            task.secretarias.map(s => <span key={s} className="tag-sec">{s}</span>)
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
                                                        <span className="dueDate-text text-muted">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: CORRELAÇÃO & CONVERSÃO */}
            {activeTab === 'correlacao' && (
                <div className="tab-layout-fade">
                    <div className="correlation-overview-card glass-premium cyan-glow">
                        <div className="overview-kpis">
                            <div className="overview-stat">
                                <span>Pautas de Releases</span>
                                <h3>{plannedReleases.length}</h3>
                            </div>
                            <div className="overview-divider"></div>
                            <div className="overview-stat">
                                <span>Notícias no Site</span>
                                <h3>{news.length}</h3>
                            </div>
                            <div className="overview-divider"></div>
                            <div className="overview-stat">
                                <span>Taxa de Conversão Real</span>
                                <h3 className="text-cyan">
                                    {plannedReleases.length > 0 
                                        ? Math.round((correlationResults.matched.length / plannedReleases.length) * 100) 
                                        : 0}%
                                </h3>
                            </div>
                        </div>
                        <div className="overview-text">
                            <h3>Mecanismo de Inteligência</h3>
                            <p>Esse painel faz um batimento semântico em tempo real de todas as pautas planejadas com as matérias do site da Prefeitura. Assim, conseguimos ver instantaneamente o que foi entregue ou o que ficou esquecido em rascunho.</p>
                        </div>
                    </div>

                    <div className="correlation-toggle-bar">
                        <button 
                            className={`toggle-btn-v3 ${correlationTab === 'matched' ? 'active' : ''}`}
                            onClick={() => setCorrelationTab('matched')}
                        >
                            <CheckCircle2 size={16} />
                            <span>Pautas Publicadas no Site ({correlationResults.matched.length})</span>
                        </button>
                        <button 
                            className={`toggle-btn-v3 ${correlationTab === 'pending' ? 'active' : ''}`}
                            onClick={() => setCorrelationTab('pending')}
                        >
                            <AlertCircle size={16} />
                            <span>Pautas Pendentes ({correlationResults.pending.length})</span>
                        </button>
                    </div>

                    {correlationTab === 'matched' ? (
                        <div className="correlation-list-wrapper">
                            {correlationResults.matched.length === 0 ? (
                                <div className="no-matches-box glass-premium">
                                    <HelpCircle size={40} className="text-slate-400" />
                                    <p>Nenhuma correlação encontrada no período com os filtros atuais.</p>
                                </div>
                            ) : (
                                <div className="matched-grid">
                                    {correlationResults.matched.map((item, idx) => (
                                        <div key={idx} className="match-card-premium glass-premium">
                                            <div className="match-score-badge" style={{ '--score-color': item.score > 70 ? '#10b981' : '#f59e0b' } as React.CSSProperties}>
                                                <span>{item.score}% match</span>
                                            </div>

                                            <div className="match-section-planned">
                                                <span className="section-label">📋 PAUTA PLANEJADA (INTRANET)</span>
                                                <h4 onClick={() => setSelectedTask(item.task)} className="task-link-trigger">{item.task.title}</h4>
                                                <div className="task-sub-meta">
                                                    <span>Criada em: {format(new Date(item.task.createdAt), 'dd/MM/yyyy')}</span>
                                                    <span>• Status: <strong style={{ textTransform: 'capitalize' }}>{item.task.status}</strong></span>
                                                </div>
                                            </div>

                                            <div className="match-divider-horizontal"></div>

                                            <div className="match-section-published">
                                                <span className="section-label">🌐 MATÉRIA PUBLICADA (SITE)</span>
                                                <h4>{item.article.title}</h4>
                                                <div className="pub-meta">
                                                    <span>Publicada em: {format(parseISO(item.article.published_at), 'dd/MM/yyyy')}</span>
                                                    <a href={item.article.url} target="_blank" rel="noopener noreferrer" className="btn-external-link">
                                                        <span>Ver site</span>
                                                        <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="correlation-list-wrapper">
                            {correlationResults.pending.length === 0 ? (
                                <div className="no-matches-box glass-premium">
                                    <CheckCircle2 size={40} color="#10b981" />
                                    <p>Parabéns! Todas as pautas de releases planejadas estão publicadas no site.</p>
                                </div>
                            ) : (
                                <div className="pending-table-card glass-premium">
                                    <table className="pending-table">
                                        <thead>
                                            <tr>
                                                <th>Título da Pauta</th>
                                                <th>Secretaria</th>
                                                <th>Criada em</th>
                                                <th>Status</th>
                                                <th>Prioridade</th>
                                                <th>Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {correlationResults.pending.map((task) => (
                                                <tr key={task.id} className="pending-row">
                                                    <td>
                                                        <span className="pending-title" onClick={() => setSelectedTask(task)}>{task.title}</span>
                                                    </td>
                                                    <td>
                                                        <div className="tag-secretarias-container">
                                                            {task.secretarias?.slice(0, 2).map(s => (
                                                                <span key={s} className="tag-sec">{s}</span>
                                                            ))}
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
                                                        <button 
                                                            className="btn-action-view" 
                                                            onClick={() => setSelectedTask(task)}
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

            {/* TAB CONTENT: MATRIZ DE CARGA DE EQUIPE */}
            {activeTab === 'equipe' && (
                <div className="tab-layout-fade">
                    {/* Grid of load cards */}
                    <div className="team-matrix-grid">
                        {teamWorkload.map(member => (
                            <div 
                                key={member.id} 
                                className={`member-load-card glass-premium clickable-pro ${activeFilter?.type === 'responsavel' && activeFilter?.value === member.id ? 'active-filter' : ''}`}
                                onClick={() => {
                                    setActiveFilter({ type: 'responsavel', value: member.id, label: `Atribuídas para: ${member.name}` });
                                    setActiveTab('resumo');
                                    scrollToExplorer();
                                }}
                                title="Clique para filtrar as tarefas deste assessor na aba Resumo"
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="member-load-header">
                                    <div className="member-avatar-box">
                                        <img src={member.avatar_url || '/default-avatar.png'} alt={member.name} />
                                        <span className={`load-status-dot ${member.loadStatus.toLowerCase()}`} title={`Carga ${member.loadStatus}`}></span>
                                    </div>
                                    <div className="member-info">
                                        <h4>{member.name}</h4>
                                        <span>{member.role}</span>
                                    </div>
                                </div>

                                <div className="member-load-metrics">
                                    <div className="load-metric-bar">
                                        <div className="bar-labels">
                                            <span>Produtividade</span>
                                            <span>{member.completionRate}%</span>
                                        </div>
                                        <div className="progress-bg">
                                            <div className="progress-fill" style={{ width: `${member.completionRate}%`, background: member.completionRate > 70 ? '#34d399' : '#2563eb' }}></div>
                                        </div>
                                    </div>

                                    <div className="load-counts-row">
                                        <div className="load-count-item">
                                            <span>Atribuídas</span>
                                            <strong>{member.totalAssigned}</strong>
                                        </div>
                                        <div className="load-count-item">
                                            <span>Pendentes</span>
                                            <strong>{member.pending}</strong>
                                        </div>
                                        <div className="load-count-item">
                                            <span>Concluídas</span>
                                            <strong className="text-green">{member.completed}</strong>
                                        </div>
                                    </div>

                                    <div className={`load-badge-footer ${member.loadStatus.toLowerCase()}`}>
                                        <Zap size={14} />
                                        <span>Ocupação {member.loadStatus} (Filtrar 🔍)</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TaskModal for viewing/editing tasks directly */}
            {selectedTask && (
                <TaskModal 
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={handleUpdateTask}
                />
            )}
        </div>
    );
}
