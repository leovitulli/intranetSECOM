import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Cell
} from 'recharts';
import {
    Zap,
    Construction,
    Target,
    AlertCircle,
    Activity,
    ArrowUpRight,
    RefreshCw,
    CheckCircle2,
    Calendar,
    Filter,
    ExternalLink,
    Users,
    FileText
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRadarNoticias, type FilterParams } from '../hooks/useRadarNoticias';
import './RadarNoticias.css';

const deliveryTypeColors: Record<string, string> = {
    reforma: '#f97316',
    revitalizacao: '#22c55e',
    recapeamento: '#0ea5e9',
    inauguracao: '#a855f7',
    insumos: '#facc15',
    outros: '#64748b'
};

const statusColors: Record<string, string> = {
    reforma: '#f97316',
    revitalizacao: '#22c55e',
    recapeamento: '#0ea5e9',
    inauguracao: '#a855f7',
    insumos: '#facc15'
};

type Period = '7d' | '30d' | '90d' | '2025' | 'all';

export default function RadarNoticias() {
    const [period, setPeriod] = useState<Period>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedEntregaType, setSelectedEntregaType] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<{ type: string; value: string } | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    const [fullSyncing, setFullSyncing] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeFilter && tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [activeFilter]);

    const filters = useMemo((): FilterParams => {
        const now = new Date();
        const baseFilters: FilterParams = {};

        switch (period) {
            case '7d':
                baseFilters.startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
                break;
            case '30d':
                baseFilters.startDate = new Date(now.setDate(now.getDate() - 30)).toISOString();
                break;
            case '90d':
                baseFilters.startDate = new Date(now.setDate(now.getDate() - 90)).toISOString();
                break;
            case '2025':
                baseFilters.startDate = '2025-01-01T00:00:00Z';
                break;
        }

        if (selectedCategory) baseFilters.category = selectedCategory;
        if (selectedEntregaType) baseFilters.entregaType = selectedEntregaType;

        return baseFilters;
    }, [period, selectedCategory, selectedEntregaType]);

    const { data, loading, error, refetch } = useRadarNoticias(filters);

    const displayedNews = useMemo(() => {
        if (!data?.allNews) return [];
        if (!activeFilter) return data.allNews;

        return data.allNews.filter(n => {
            if (activeFilter.type === 'category') return n.category === activeFilter.value;
            if (activeFilter.type === 'entrega') return n.entrega_type === activeFilter.value;
            return true;
        });
    }, [data?.allNews, activeFilter]);

    async function handleSync() {
        try {
            setSyncing(true);
            setSyncSuccess(false);
            const { error: syncErr } = await supabase.functions.invoke('radar-scraper', {
                body: { pages: 3 }
            });
            if (syncErr) throw syncErr;
            setSyncSuccess(true);
            await refetch();
            setTimeout(() => setSyncSuccess(false), 3000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            alert('Erro ao sincronizar radar: ' + message);
        } finally {
            setSyncing(false);
        }
    }

    async function handleFullSync() {
        if (!confirm('Isso vai varrer TODAS as páginas do site. Pode levar vários minutos. Continuar?')) return;
        try {
            setFullSyncing(true);
            const { error: syncErr } = await supabase.functions.invoke('radar-scraper', {
                body: { pages: 999 }
            });
            if (syncErr) throw syncErr;
            await refetch();
            alert('Sincronização completa concluída!');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            alert('Erro no sync completo: ' + message);
        } finally {
            setFullSyncing(false);
        }
    }

    if (loading && !data) {
        return (
            <div className="radar-loading-container">
                <Activity className="animate-pulse" size={48} color="#1e3a8a" />
                <p>Mapeando notícias da cidade...</p>
            </div>
        );
    }

    return (
        <div className="hub-radar-container">
            <header className="hub-radar-header">
                <div className="header-brand">
                    <div className="brand-logo-radar">
                        <Zap size={24} color="#fff" fill="#fff" />
                    </div>
                    <div className="brand-texts">
                        <h1>Radar de Dados SECOM</h1>
                        <p>Monitoramento estratégico dos canais oficiais da prefeitura</p>
                    </div>
                </div>
                <div className="header-actions">
                    {data && data.totalCount > 0 && (
                        <button
                            className="hub-sync-btn full-sync-btn"
                            onClick={handleFullSync}
                            disabled={fullSyncing}
                            title="Sincronizar todas as páginas do site"
                        >
                            <RefreshCw size={16} className={fullSyncing ? 'animate-spin' : ''} />
                            {fullSyncing ? 'Sincronizando Tudo...' : 'Sync Completo'}
                        </button>
                    )}
                    <button
                        className={`hub-sync-btn ${syncing ? 'syncing' : ''} ${syncSuccess ? 'success' : ''}`}
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? <RefreshCw className="animate-spin" size={16} /> :
                         syncSuccess ? <CheckCircle2 size={16} /> : <RefreshCw size={16} />}
                        {syncing ? 'Sincronizando...' : syncSuccess ? 'Sucesso!' : 'Atualizar Recentes'}
                    </button>
                </div>
            </header>

            <div className="radar-tactical-bar">
                <div className="period-selector">
                    <span className="selector-label"><Filter size={14} /> FILTRAR PERÍODO:</span>
                    <div className="period-pills">
                        <button className={period === '7d' ? 'active' : ''} onClick={() => setPeriod('7d')}>7 DIAS</button>
                        <button className={period === '30d' ? 'active' : ''} onClick={() => setPeriod('30d')}>30 DIAS</button>
                        <button className={period === '90d' ? 'active' : ''} onClick={() => setPeriod('90d')}>90 DIAS</button>
                        <button className={period === '2025' ? 'active' : ''} onClick={() => setPeriod('2025')}>2025</button>
                        <button className={period === 'all' ? 'active' : ''} onClick={() => setPeriod('all')}>TUDO</button>
                    </div>
                </div>
                <div className="filter-selectors">
                    <select value={activeFilter?.type === 'category' ? activeFilter.value : selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setActiveFilter(null); }} className="radar-select">
                        <option value="">Todas as Secretarias</option>
                        {data?.categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select value={activeFilter?.type === 'entrega' ? activeFilter.value : selectedEntregaType} onChange={e => { setSelectedEntregaType(e.target.value); setActiveFilter(null); }} className="radar-select">
                        <option value="">Todos os Tipos</option>
                        <option value="reforma">Reforma</option>
                        <option value="revitalizacao">Revitalização</option>
                        <option value="recapeamento">Recapeamento</option>
                        <option value="inauguracao">Inauguração</option>
                        <option value="insumos">Insumos</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="radar-error-banner">
                    <AlertCircle size={20} />
                    <span>Erro: {error}</span>
                </div>
            )}

            {activeFilter && (
                <div className="active-filter-bar">
                    <span>Filtro ativo: <strong>{activeFilter.type === 'category' ? 'Secretaria' : 'Tipo'}: {activeFilter.value}</strong></span>
                    <button onClick={() => setActiveFilter(null)} className="clear-filter-btn">✕ Limpar</button>
                </div>
            )}

            <div className="kpi-grid">
                <div className="kpi-card kpi-total">
                    <div className="kpi-icon-wrapper"><FileText size={24} /></div>
                    <div className="kpi-content">
                        <h3>Total de Notícias</h3>
                        <div className="kpi-value">{data?.totalCount?.toLocaleString() || 0}</div>
                        <p className="kpi-label">Capturadas do site</p>
                    </div>
                </div>
                <div className="kpi-card kpi-entregas">
                    <div className="kpi-icon-wrapper"><Construction size={24} /></div>
                    <div className="kpi-content">
                        <h3>Entregas Mapeadas</h3>
                        <div className="kpi-value">{data?.entregasTotal?.toLocaleString() || 0}</div>
                        <p className="kpi-label">Obras e serviços</p>
                    </div>
                </div>
                <div className="kpi-card kpi-secretarias">
                    <div className="kpi-icon-wrapper"><Users size={24} /></div>
                    <div className="kpi-content">
                        <h3>Secretarias Ativas</h3>
                        <div className="kpi-value">{data?.categories?.length || 0}</div>
                        <p className="kpi-label">Com publicações</p>
                    </div>
                </div>
                <div className="kpi-card kpi-semana">
                    <div className="kpi-icon-wrapper"><Calendar size={24} /></div>
                    <div className="kpi-content">
                        <h3>Notícias no Período</h3>
                        <div className="kpi-value">{data?.total?.toLocaleString() || 0}</div>
                        <p className="kpi-label">{period === '7d' ? 'Últimos 7 dias' : period === '30d' ? 'Últimos 30 dias' : period === '90d' ? 'Últimos 90 dias' : period === '2025' ? 'Desde jan/2025' : 'Todas as notícias'}</p>
                    </div>
                </div>
            </div>

            <main className="hub-radar-content">
                <div className="radar-main-column">
                    <div className="hub-card ranking-card">
                        <div className="card-header">
                            <h2><Target size={18} /> RANKING DE SECRETARIAS</h2>
                            <p>Demandas por órgão municipal</p>
                        </div>
                        <div className="card-body chart-box">
                            {(data?.byCategory.length || 0) > 0 ? (
                                <div className="ranking-pro-list">
                                    {(data?.byCategory || []).slice(0, 8).map((item, idx) => (
                                        <div
                                            key={item.name}
                                            className="ranking-pro-item"
                                            onClick={() => { setActiveFilter({ type: 'category', value: item.name }); }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="ranking-pro-info">
                                                <span className="rank-pos">{idx + 1}</span>
                                                <span className="rank-name">{item.name}</span>
                                            </div>
                                            <div className="rank-bar-container">
                                                <div className="rank-bar" style={{ width: `${(item.value / (data?.byCategory[0]?.value || 1)) * 100}%` }}></div>
                                                <span className="rank-value">{item.value}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">Sem dados de secretarias.</div>
                            )}
                        </div>
                    </div>

                    <div className="hub-card delivery-analysis-card">
                        <div className="card-header">
                            <h2><Construction size={18} /> ENTREGAS POR TIPO</h2>
                            <p>Divisão por tipo de obra ou serviço</p>
                        </div>
                        <div className="card-body chart-box">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data?.deliveries}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="type" stroke="#64748b" tick={{ fontSize: 11 }} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                    <Bar
                                        dataKey="count" radius={[4, 4, 0, 0]} barSize={40}
                                        onClick={(d) => setActiveFilter({ type: 'entrega', value: d.type || '' })}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {data?.deliveries.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={deliveryTypeColors[entry.type] || '#64748b'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="hub-card trends-card">
                        <div className="card-header">
                            <h2><Activity size={18} /> EVOLUÇÃO VOLUMÉTRICA</h2>
                            <p>Publicações ao longo do tempo</p>
                        </div>
                        <div className="card-body chart-box">
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={data?.byYear}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12 }} />
                                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <aside className="radar-feed-column">
                    <div className="hub-card feed-card">
                        <div className="card-header">
                            <h2><Zap size={18} color="#f97316" fill="#f97316" /> ENTREGAS DO PERÍODO</h2>
                            <p>Obras e serviços finalizados</p>
                        </div>
                        <div className="card-body feed-list">
                            {data?.recentNews.filter(n => n.is_entrega).slice(0, 15).map(news => (
                                <a key={news.id} href={news.url} target="_blank" rel="noopener noreferrer" className="feed-item-premium">
                                    <div className="feed-item-icon">
                                        <div className="dot-radar active" style={{ background: deliveryTypeColors[news.entrega_type || 'outros'] }}></div>
                                    </div>
                                    <div className="feed-item-content">
                                        <span className="feed-cat">{news.category} — {news.entrega_type?.toUpperCase()}</span>
                                        <span className="feed-title">{news.title}</span>
                                        <div className="feed-meta">
                                            <Calendar size={12} /> {new Date(news.published_at).toLocaleDateString('pt-BR')}
                                            <ArrowUpRight size={14} className="ml-auto" />
                                        </div>
                                    </div>
                                </a>
                            ))}
                            {data?.recentNews.filter(n => n.is_entrega).length === 0 && (
                                <p className="feed-empty">Nenhuma entrega no período selecionado.</p>
                            )}
                        </div>
                    </div>
                </aside>
            </main>

            <div className="hub-card table-card" ref={tableRef}>
                <div className="card-header">
                    <h2><FileText size={18} /> DETALHAMENTO DAS NOTÍCIAS</h2>
                    <p>{displayedNews.length} notícias no período {activeFilter ? `(Filtro: ${activeFilter.type === 'category' ? 'Secretaria' : 'Tipo'})` : ''}</p>
                </div>
                <div className="table-responsive">
                    <table className="radar-table">
                        <thead>
                            <tr>
                                <th>Título</th>
                                <th>Secretaria</th>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Link</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedNews.slice(0, 100).map(news => (
                                <tr key={news.id}>
                                    <td className="t-title">{news.title}</td>
                                    <td>{news.category || '—'}</td>
                                    <td>{news.published_at ? new Date(news.published_at).toLocaleDateString('pt-BR') : '—'}</td>
                                    <td>
                                        {news.is_entrega ? (
                                            <span className="entrega-badge" style={{ background: statusColors[news.entrega_type] || '#64748b' }}>
                                                {news.entrega_type?.toUpperCase()}
                                            </span>
                                        ) : (
                                            <span className="noticia-badge">NOTÍCIA</span>
                                        )}
                                    </td>
                                    <td>
                                        <a href={news.url} target="_blank" rel="noopener noreferrer" className="news-link" title="Abrir notícia">
                                            <ExternalLink size={16} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {displayedNews.length === 0 && (
                                <tr><td colSpan={5} className="empty-table">Nenhuma notícia encontrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {displayedNews.length > 100 && (
                    <div className="table-footer-note">
                        Mostrando 100 de {displayedNews.length} notícias. Use os filtros para refinar.
                    </div>
                )}
            </div>
        </div>
    );
}
