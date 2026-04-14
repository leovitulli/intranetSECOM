import { useState, useMemo } from 'react';
import { 
    Search, 
    Globe, 
    TrendingUp, 
    AlertTriangle, 
    ArrowUpRight, 
    Share2, 
    MessageSquare,
    Zap,
    ShieldAlert,
    Clock,
    LayoutDashboard
} from 'lucide-react';
import { format } from 'date-fns';
import { normalizeText } from '../utils/searchUtils';
import './Radar.css';

interface ClippingItem {
    id: string;
    title: string;
    source: string;
    source_logo: string;
    excerpt: string;
    category: string;
    sentiment: 'positive' | 'neutral' | 'critical';
    url: string;
    created_at: string;
    image_url: string;
    priority: number;
}

// CLIPPING REAL DE GUARULHOS - VERIFICAÇÃO DE ALTA DISPONIBILIDADE (21/03/2026)
const MOCKED_CLIPPING: ClippingItem[] = [
    {
        id: '1',
        title: 'Prefeitura de Guarulhos inicia construção de viaduto ligando Cecap à Via Dutra',
        source: 'JORNAL VOZ DE GUARULHOS',
        source_logo: 'https://img.vendaapre.com.br/logos/voz.png',
        excerpt: 'Obra tática de mobilidade urbana em Guarulhos começa oficialmente no Parque Cecap ligando Zarif à Dutra.',
        category: 'Obras Públicas',
        sentiment: 'positive',
        url: 'https://jornalvozdeguarulhos.com.br/prefeitura-de-guarulhos-inicia-construcao-de-viaduto-ligando-cecap-a-via-dutra/',
        created_at: new Date('2026-03-20T10:00:00').toISOString(),
        image_url: 'https://images.unsplash.com/photo-1590483734159-4670221375a0?auto=format&fit=crop&q=80&w=800', // FALLBACK SÓLIDO
        priority: 1
    },
    {
        id: '2',
        title: 'Cetesb concede licença para início das obras da Linha 2-Verde do Metrô em Guarulhos',
        source: 'R7 NOTÍCIAS',
        source_logo: 'https://img.vendaapre.com.br/logos/r7.png',
        excerpt: 'Expansão da rede sobre trilhos chega finalmente ao território guarulhense com estação Dutra.',
        category: 'Mobilidade',
        sentiment: 'positive',
        url: 'https://noticias.r7.com/sao-paulo/cetesb-concede-licenca-para-obras-da-linha-2-verde-em-guarulhos-20032026',
        created_at: new Date('2026-03-20T09:15:00').toISOString(),
        image_url: 'https://images.unsplash.com/photo-1510252199042-88846c430e84?auto=format&fit=crop&q=80&w=800',
        priority: 1
    },
    {
        id: '3',
        title: 'Acesso da Av. Natália Zarif à Dutra não precisaria de viaduto, avalia portal',
        source: 'CLICK GUARULHOS',
        source_logo: 'https://img.vendaapre.com.br/logos/click.png',
        excerpt: 'Análise técnica de mobilidade urbana levanta dúvidas sobre prioridade de viaduto na região.',
        category: 'Política',
        sentiment: 'critical',
        url: 'https://www.clickguarulhos.com.br/2026/03/18/acesso-da-av-natalia-zarif-a-dutra-nao-precisaria-de-viaduto/',
        created_at: new Date('2026-03-18T16:45:00').toISOString(),
        image_url: 'https://images.unsplash.com/photo-1545143333-6382f1d5b893?auto=format&fit=crop&q=80&w=800',
        priority: 2
    },
    {
        id: '4',
        title: 'Guarulhos anuncia R$ 75 milhões em investimentos de pavimentação em 17 bairros',
        source: 'FOLHA METROPOLITANA',
        source_logo: 'https://img.vendaapre.com.br/logos/folha.png',
        excerpt: 'Convênios com Governo do Estado garantem obras de drenagem e recapeamento asfáltico.',
        category: 'Zeladoria',
        sentiment: 'positive',
        url: 'https://www.fmetropolitana.com.br/guarulhos-e-estado-assinam-convenios-de-r-75-milhoes-para-obras/',
        created_at: new Date('2026-03-19T11:20:00').toISOString(),
        image_url: 'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?auto=format&fit=crop&q=80&w=800',
        priority: 1
    }
];

export default function Radar() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'neutral' | 'critical'>('all');

    const stats = useMemo(() => {
        return {
            total: MOCKED_CLIPPING.length,
            critical: MOCKED_CLIPPING.filter(i => i.sentiment === 'critical').length,
            positive: MOCKED_CLIPPING.filter(i => i.sentiment === 'positive').length,
        };
    }, []);

    const filteredItems = useMemo(() => {
        const term = normalizeText(searchTerm);
        return MOCKED_CLIPPING.filter(item => {
            const matchesSearch = !term || normalizeText(item.title).includes(term) || 
                                normalizeText(item.source).includes(term);
            const matchesSentiment = filterSentiment === 'all' || item.sentiment === filterSentiment;
            return matchesSearch && matchesSentiment;
        });
    }, [searchTerm, filterSentiment]);

    return (
        <div className="radar-page-container">
            {/* CABEÇALHO NEWSROOM PREMIUM */}
            <header className="radar-header">
                <div className="radar-header-content">
                    <div className="radar-brand">
                        <div className="radar-icon-box">
                            <Zap size={28} color="#fff" fill="#fff" />
                        </div>
                        <div className="radar-title-box">
                            <h1>Radar SECOM 360</h1>
                            <p>Monitoramento tático de mídia — Guarulhos 🏛️</p>
                        </div>
                    </div>
                    
                    <div className="radar-stats-quick">
                        <div className="stat-pill-radar critical">
                            <ShieldAlert size={16} /> <span>{stats.critical} CRÍTICOS</span>
                        </div>
                        <div className="stat-pill-radar positive">
                            <TrendingUp size={16} /> <span>{stats.positive} POSITIVOS</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* BARRA DE COMANDO COMPACTA */}
            <section className="radar-controls">
                <div className="search-radar-wrapper">
                    <Search size={18} color="#64748b" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar manchetes, portais ou secretarias..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-pills-radar">
                    <button 
                        className={`filter-pill ${filterSentiment === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterSentiment('all')}
                    >
                        <LayoutDashboard size={16} /> Todos
                    </button>
                    <button 
                        className={`filter-pill positive ${filterSentiment === 'positive' ? 'active' : ''}`}
                        onClick={() => setFilterSentiment('positive')}
                    >
                        <TrendingUp size={16} /> Positivas
                    </button>
                    <button 
                        className={`filter-pill critical ${filterSentiment === 'critical' ? 'active' : ''}`}
                        onClick={() => setFilterSentiment('critical')}
                    >
                        <AlertTriangle size={16} /> Críticas
                    </button>
                </div>
            </section>

            {/* GRID NEWSROOM DENSITY */}
            <main className="radar-feed-grid">
                {filteredItems.map(item => (
                    <article key={item.id} className={`radar-card-premium ${item.sentiment}`}>
                        <div className="radar-card-image-box">
                            <img 
                                src={item.image_url} 
                                alt={item.title} 
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent && !parent.querySelector('.img-fallback')) {
                                        const placeholder = document.createElement('div');
                                        placeholder.className = 'img-fallback';
                                        placeholder.innerText = item.source.split(' ')[0];
                                        parent.appendChild(placeholder);
                                    }
                                }}
                            />
                            <div className="sentiment-badge-float">
                                {item.sentiment === 'positive' && <Zap size={14} />}
                                {item.sentiment === 'critical' && <ShieldAlert size={14} />}
                                {item.sentiment.toUpperCase()}
                            </div>
                        </div>

                        <div className="radar-card-body">
                            <div className="source-row-radar">
                                <div className="source-info">
                                    <span className="source-name-radar">{item.source}</span>
                                    <span className="category-tag-radar">{item.category}</span>
                                </div>
                                <div className="time-ago-radar">
                                    <Clock size={16} /> {format(new Date(item.created_at), "HH:mm")}
                                </div>
                            </div>

                            <h2 className="radar-card-title">{item.title}</h2>
                            <p className="radar-card-excerpt">{item.excerpt}</p>

                            <div className="radar-card-footer">
                                <div className="radar-social-data">
                                    <span title="Engajamento Est."><MessageSquare size={18} /> 24</span>
                                    <span title="Shares Est."><Share2 size={18} /> 12</span>
                                </div>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-view-clipping">
                                    Acessar Notícia <ArrowUpRight size={18} />
                                </a>
                            </div>
                        </div>

                        {/* AÇÃO COMANDO */}
                        <div className="radar-quick-actions">
                            <button className="btn-radar-action" title="Gerar Informe">
                                <Zap size={20} />
                            </button>
                            <button className="btn-radar-action critical" title="Alertar Secretaria">
                                <ShieldAlert size={20} />
                            </button>
                        </div>
                    </article>
                ))}
            </main>

            {filteredItems.length === 0 && (
                <div className="empty-radar">
                    <Globe size={48} className="animate-pulse" />
                    <h3>Nenhum clipping detectado</h3>
                    <p>Filtros táticos estão limpando o feed.</p>
                </div>
            )}
        </div>
    );
}
