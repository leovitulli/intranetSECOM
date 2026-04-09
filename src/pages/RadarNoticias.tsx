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
    FileText,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
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
    const [searchQuery, setSearchQuery] = useState('');
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

    const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({
        ranking: false,
        deliveryTypes: false,
        evolution: false,
        feed: false,
        details: false
    });

    const toggleCard = (cardId: string) => {
        setCollapsedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
    };

    const { data, loading, fetchedCount, error, refetch } = useRadarNoticias(filters);

    const filteredAnalytics = useMemo(() => {
        if (!data?.allNews) return null;
        
        let filtered = data.allNews;

        if (activeFilter) {
            filtered = filtered.filter(n => {
                if (activeFilter.type === 'category') return n.category === activeFilter.value;
                if (activeFilter.type === 'entrega') return n.entrega_type === activeFilter.value;
                return true;
            });
        }

        if (searchQuery) {
            const normalizeStr = (str: string) => 
                str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            
            const q = normalizeStr(searchQuery);
            const qSin = q.endsWith('s') && q.length > 4 ? q.slice(0, -1) : q; // Simple singularization
            
            filtered = filtered.filter(n => {
                const titleNorm = normalizeStr(n.title || "");
                return titleNorm.includes(q) || titleNorm.includes(qSin) || q.includes(titleNorm);
            });
        }

        const catMap = new Map<string, number>();
        filtered.forEach(n => {
            const cat = n.category || 'Outros';
            catMap.set(cat, (catMap.get(cat) || 0) + 1);
        });
        const byCategory = Array.from(catMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const entregas = filtered.filter(n => n.is_entrega);
        const deliveryMap = new Map<string, number>();
        entregas.forEach(n => {
            const type = n.entrega_type || 'outros';
            deliveryMap.set(type, (deliveryMap.get(type) || 0) + 1);
        });
        const deliveries = Array.from(deliveryMap.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);

        const yearMap = new Map<number, number>();
        filtered.forEach(n => {
            if (n.published_at) {
                const year = new Date(n.published_at).getFullYear();
                yearMap.set(year, (yearMap.get(year) || 0) + 1);
            }
        });
        const byYear = Array.from(yearMap.entries())
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => a.year - b.year);

        return {
            news: filtered,
            byCategory,
            deliveries,
            byYear,
            totalFiltered: filtered.length,
            entregasTotal: entregas.length,
            recentNews: entregas.slice(0, 15)
        };
    }, [data?.allNews, activeFilter, searchQuery]);

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
        // Cálculo do percentual de progresso (estimado baseado em volume histórico de ~15-20k)
        const progress = Math.min(Math.round((fetchedCount / 15000) * 100), 98);

        return (
            <div className="radar-loading-dashboard">
                <div className="loading-progress-overlay">
                    <div className="loading-progress-bar" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="loading-status-pill">
                    <div className="status-dot"></div>
                    <span className="status-text">
                        {fetchedCount > 0 ? `Mapeando pautas: ${fetchedCount.toLocaleString()}` : 'Iniciando radar...'}
                    </span>
                </div>

                <div className="skeleton-kpi-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton-box skeleton-circle" style={{ marginBottom: '1rem' }}></div>
                            <div className="skeleton-box skeleton-title"></div>
                            <div className="skeleton-box skeleton-text"></div>
                        </div>
                    ))}
                </div>

                <div className="skeleton-main-layout">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="skeleton-card skeleton-chart-card">
                            <div className="skeleton-box skeleton-title" style={{ width: '30%', marginBottom: '2rem' }}></div>
                            <div className="skeleton-box" style={{ height: '200px', width: '100%' }}></div>
                        </div>
                        <div className="skeleton-card skeleton-chart-card" style={{ height: '300px' }}>
                            <div className="skeleton-box skeleton-title" style={{ width: '40%', marginBottom: '2rem' }}></div>
                            <div className="skeleton-box" style={{ height: '180px', width: '100%' }}></div>
                        </div>
                    </div>
                    <div className="skeleton-card skeleton-feed-card">
                        <div className="skeleton-box skeleton-title" style={{ width: '80%', marginBottom: '2rem' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="skeleton-box skeleton-circle" style={{ width: '12px', height: '12px' }}></div>
                                    <div style={{ flex: 1 }}>
                                        <div className="skeleton-box skeleton-title" style={{ width: '90%' }}></div>
                                        <div className="skeleton-box skeleton-text" style={{ width: '40%' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h1>Radar de Dados SECOM</h1>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)' }}>
                                {data?.totalCount?.toLocaleString() || 0} TOTAL
                            </div>
                        </div>
                        <p>Monitoramento estratégico dos canais oficiais da prefeitura</p>
                    </div>
                </div>
                <div className="header-actions">
                    <div className="radar-search-wrapper-header" style={{ position: 'relative', width: 280 }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.6)' }} />
                        <input
                            type="text"
                            placeholder="Pesquisar nos registros..."
                            className="radar-search-input-header"
                            style={{ 
                                width: '100%', 
                                padding: '10px 12px 10px 38px', 
                                background: 'rgba(0,0,0,0.2)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '10px', 
                                color: 'white',
                                fontSize: '0.875rem'
                            }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
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
                <div className="filter-selectors" style={{ flex: 1, display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <select value={activeFilter?.type === 'category' ? activeFilter.value : selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setActiveFilter(null); }} className="radar-select" style={{ maxWidth: 200 }}>
                        <option value="">Todas as Secretarias</option>
                        {data?.categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select value={activeFilter?.type === 'entrega' ? activeFilter.value : selectedEntregaType} onChange={e => { setSelectedEntregaType(e.target.value); setActiveFilter(null); }} className="radar-select" style={{ maxWidth: 180 }}>
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
                    <div className="kpi-icon-wrapper" style={{ background: '#f8fafc', color: '#1e3a8a' }}><Activity size={24} /></div>
                    <div className="kpi-content">
                        <h3>Notícias Filtradas</h3>
                        <div className="kpi-value">{filteredAnalytics?.totalFiltered?.toLocaleString() || 0}</div>
                        <p className="kpi-label">Baseada na busca atual</p>
                    </div>
                </div>
                <div className="kpi-card kpi-entregas">
                    <div className="kpi-icon-wrapper"><Construction size={24} /></div>
                    <div className="kpi-content">
                        <h3>Inaugurações Mapeadas</h3>
                        <div className="kpi-value">{filteredAnalytics?.entregasTotal?.toLocaleString() || 0}</div>
                        <p className="kpi-label">Baseado na busca atual</p>
                    </div>
                </div>
                <div className="kpi-card kpi-secretarias">
                    <div className="kpi-icon-wrapper"><Users size={24} /></div>
                    <div className="kpi-content">
                        <h3>Secretarias Ativas</h3>
                        <div className="kpi-value">{filteredAnalytics?.byCategory?.length || 0}</div>
                        <p className="kpi-label">No filtro atual</p>
                    </div>
                </div>
                <div className="kpi-card kpi-semana" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: 'white' }}>
                    <div className="kpi-icon-wrapper" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}><Search size={24} /></div>
                    <div className="kpi-content">
                        <h3>Volume de Amostra</h3>
                        <div className="kpi-value">{Math.round(((filteredAnalytics?.totalFiltered || 0) / (data?.total || 1)) * 100)}%</div>
                        <p className="kpi-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Da base carregada</p>
                    </div>
                </div>
            </div>

            <main className="hub-radar-content" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
                <div className="radar-main-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className={`hub-card ranking-card ${collapsedCards.ranking ? 'collapsed' : ''}`}>
                        <div className="card-header" onClick={() => toggleCard('ranking')} style={{ cursor: 'pointer' }}>
                            <div className="title-group">
                                <Target size={18} /> 
                                <div>
                                    <h2>RANKING DE SECRETARIAS</h2>
                                    {!collapsedCards.ranking && <p>Demandas por órgão municipal</p>}
                                </div>
                            </div>
                            {collapsedCards.ranking ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </div>
                        {!collapsedCards.ranking && (
                            <div className="card-body chart-box">
                                {(filteredAnalytics?.byCategory.length || 0) > 0 ? (
                                    <div className="ranking-pro-list">
                                        {(filteredAnalytics?.byCategory || []).slice(0, 8).map((item, idx) => (
                                            <div
                                                key={item.name}
                                                className="ranking-pro-item"
                                                onClick={(e) => { e.stopPropagation(); setActiveFilter({ type: 'category', value: item.name }); }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="ranking-pro-info">
                                                    <span className="rank-pos">{idx + 1}</span>
                                                    <span className="rank-name">{item.name}</span>
                                                </div>
                                                <div className="rank-bar-container">
                                                    <div className="rank-bar" style={{ width: `${(item.value / (filteredAnalytics?.byCategory[0]?.value || 1)) * 100}%` }}></div>
                                                    <span className="rank-value">{item.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">Sem dados de secretarias.</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={`hub-card delivery-analysis-card ${collapsedCards.deliveryTypes ? 'collapsed' : ''}`}>
                        <div className="card-header" onClick={() => toggleCard('deliveryTypes')} style={{ cursor: 'pointer' }}>
                            <div className="title-group">
                                <Construction size={18} />
                                <div>
                                    <h2>INAUGURAÇÕES POR TIPO</h2>
                                    {!collapsedCards.deliveryTypes && <p>Divisão por tipo de obra ou serviço</p>}
                                </div>
                            </div>
                            {collapsedCards.deliveryTypes ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </div>
                        {!collapsedCards.deliveryTypes && (
                            <div className="card-body chart-box">
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={filteredAnalytics?.deliveries}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="type" stroke="#64748b" tick={{ fontSize: 11 }} />
                                        <YAxis hide />
                                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                        <Bar
                                            dataKey="count" radius={[4, 4, 0, 0]} barSize={40}
                                            onClick={(d) => setActiveFilter({ type: 'entrega', value: d.type || '' })}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {filteredAnalytics?.deliveries.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={deliveryTypeColors[entry.type] || '#64748b'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="radar-feed-column" style={{ height: '100%' }}>
                    <div className={`hub-card feed-card ${collapsedCards.feed ? 'collapsed' : ''}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="card-header" onClick={() => toggleCard('feed')} style={{ cursor: 'pointer' }}>
                            <div className="title-group">
                                <Zap size={18} color="#f97316" fill="#f97316" />
                                <div>
                                    <h2>INAUGURAÇÕES DO PERÍODO</h2>
                                    {!collapsedCards.feed && <p>Obras e serviços finalizados</p>}
                                </div>
                            </div>
                            {collapsedCards.feed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </div>
                        {!collapsedCards.feed && (
                            <div className="card-body feed-list" style={{ flex: 1, overflowY: 'auto' }}>
                                {filteredAnalytics?.recentNews.map(news => (
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
                                {filteredAnalytics?.recentNews.length === 0 && (
                                    <p className="feed-empty">Nenhuma inauguração no período.</p>
                                )}
                            </div>
                        )}
                    </div>
                </aside>

                <div className="radar-full-column" style={{ gridColumn: 'span 2' }}>
                    <div className={`hub-card trends-card ${collapsedCards.evolution ? 'collapsed' : ''}`}>
                        <div className="card-header" onClick={() => toggleCard('evolution')} style={{ cursor: 'pointer' }}>
                            <div className="title-group">
                                <Activity size={18} />
                                <div>
                                    <h2>EVOLUÇÃO VOLUMÉTRICA</h2>
                                    {!collapsedCards.evolution && <p>Publicações ao longo do tempo</p>}
                                </div>
                            </div>
                            {collapsedCards.evolution ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </div>
                        {!collapsedCards.evolution && (
                            <div className="card-body chart-box">
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={filteredAnalytics?.byYear}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12 }} />
                                        <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                        <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <div className={`hub-card table-card ${collapsedCards.details ? 'collapsed' : ''}`} ref={tableRef}>
                <div className="card-header" onClick={() => toggleCard('details')} style={{ cursor: 'pointer' }}>
                    <div className="title-group">
                        <FileText size={18} />
                        <div>
                            <h2>DETALHAMENTO DAS NOTÍCIAS</h2>
                            {!collapsedCards.details && <p>{filteredAnalytics?.news.length} notícias no período {activeFilter ? `(Filtro: ${activeFilter.type === 'category' ? 'Secretaria' : 'Tipo'})` : ''}</p>}
                        </div>
                    </div>
                    {collapsedCards.details ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
                {!collapsedCards.details && (
                    <>
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
                                    {filteredAnalytics?.news.slice(0, 100).map(news => (
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
                                    {filteredAnalytics?.news.length === 0 && (
                                        <tr><td colSpan={5} className="empty-table">Nenhuma notícia encontrada.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {(filteredAnalytics?.news.length || 0) > 100 && (
                            <div className="table-footer-note">
                                Mostrando 100 de {filteredAnalytics?.news.length} notícias. Use os filtros para refinar.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
