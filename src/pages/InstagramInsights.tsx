import { useState, useMemo } from 'react';
import {
    Instagram,
    MessageCircle,
    Heart,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronDown,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    BarChart3,
    Users,
    Star,
    AlertCircle,
    Calendar,
    FileText,
    Filter
} from 'lucide-react';
import './InstagramInsights.css';

type Sentiment = 'positive' | 'negative' | 'neutral';
type Period = 'semanal' | 'mensal' | 'semestral' | 'anual';

interface Comment {
    id: string;
    post_id: string;
    post_preview: string;
    post_image: string;
    author: string;
    author_avatar: string;
    text: string;
    timestamp: string;
    likes: number;
    sentiment: Sentiment;
    topic: string;
    replied: boolean;
    reply_text?: string;
}

interface TopicGroup {
    label: string;
    count: number;
    sentiment_avg: Sentiment;
    keywords: string[];
}

// ─── DADOS MOCKADOS (substituir pela API do Instagram) ────────────────────────

const MOCKED_COMMENTS: Comment[] = [
    {
        id: '1', post_id: 'p1',
        post_preview: 'Nova pavimentação no Bairro São João',
        post_image: 'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?w=400&h=400&fit=crop',
        author: 'Maria S.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
        text: 'Finalmente! Essa rua estava um absurdo há anos. Parabéns à prefeitura 👏',
        timestamp: '2026-03-25T14:22:00', likes: 48, sentiment: 'positive', topic: 'Obras e Pavimentação', replied: true,
        reply_text: 'Obrigado pelo carinho! Continuamos trabalhando por uma Guarulhos cada vez melhor. 🏛️'
    },
    {
        id: '2', post_id: 'p1',
        post_preview: 'Nova pavimentação no Bairro São João',
        post_image: 'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?w=400&h=400&fit=crop',
        author: 'Carlos M.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
        text: 'E os buracos da Av. São Paulo? Tá cheio de cratera lá e ninguém faz nada... 😤',
        timestamp: '2026-03-25T15:01:00', likes: 112, sentiment: 'negative', topic: 'Obras e Pavimentação', replied: false,
    },
    {
        id: '3', post_id: 'p2',
        post_preview: 'Inauguração do novo UBS Centro',
        post_image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400&h=400&fit=crop',
        author: 'Ana V.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
        text: 'Minha mãe precisou de atendimento ontem e foi super bem recebida. Que diferença!',
        timestamp: '2026-03-24T09:45:00', likes: 77, sentiment: 'positive', topic: 'Saúde e UBS', replied: true,
        reply_text: 'Fico muito feliz em saber disso! Nosso compromisso é garantir saúde de qualidade para todos. 💙'
    },
    {
        id: '4', post_id: 'p2',
        post_preview: 'Inauguração do novo UBS Centro',
        post_image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400&h=400&fit=crop',
        author: 'Pedro R.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro',
        text: 'Fui ontem e esperei 3 horas numa fila enorme. Não faz sentido inaugurar e não ter médicos suficientes.',
        timestamp: '2026-03-24T11:10:00', likes: 203, sentiment: 'negative', topic: 'Saúde e UBS', replied: false,
    },
    {
        id: '5', post_id: 'p3',
        post_preview: 'Festival Cultural de Guarulhos',
        post_image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop',
        author: 'Juliana L.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juliana',
        text: 'Evento incrível! Toda a família foi e adorou. Mais eventos assim por favor! 🎉',
        timestamp: '2026-03-23T20:30:00', likes: 89, sentiment: 'positive', topic: 'Cultura e Eventos', replied: true,
        reply_text: 'Que alegria ter toda a família no festival! Haverá muito mais eventos em breve. 🎭'
    },
    {
        id: '6', post_id: 'p4',
        post_preview: 'Ampliação da rede de ciclovias',
        post_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
        author: 'Roberto A.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto',
        text: 'Ainda precisamos de ciclovia integrando com o metrô. Vai ter previsão?',
        timestamp: '2026-03-22T08:15:00', likes: 156, sentiment: 'neutral', topic: 'Mobilidade Urbana', replied: false,
    },
    {
        id: '7', post_id: 'p4',
        post_preview: 'Ampliação da rede de ciclovias',
        post_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
        author: 'Fernanda K.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fernanda',
        text: 'Meu bairro, Jardim Tranquilidade, não tem ciclovia. Quando chega?',
        timestamp: '2026-03-22T09:50:00', likes: 34, sentiment: 'neutral', topic: 'Mobilidade Urbana', replied: false,
    },
    {
        id: '8', post_id: 'p5',
        post_preview: 'Recolhimento seletivo de lixo',
        post_image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=400&fit=crop',
        author: 'Paulo T.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Paulo',
        text: 'O caminhão de lixo reciclável parou de vir no meu bairro há 2 semanas.',
        timestamp: '2026-03-21T16:00:00', likes: 67, sentiment: 'negative', topic: 'Zeladoria e Limpeza', replied: true,
        reply_text: 'Lamentamos o inconveniente. Identificamos o problema na rota e a coleta está normalizada. Obrigado por avisar!'
    },
];

const TOPIC_GROUPS: TopicGroup[] = [
    { label: 'Obras e Pavimentação', count: 2, sentiment_avg: 'neutral', keywords: ['buraco', 'pavimentação', 'asfalto', 'rua'] },
    { label: 'Saúde e UBS', count: 2, sentiment_avg: 'neutral', keywords: ['UBS', 'médico', 'fila', 'atendimento'] },
    { label: 'Cultura e Eventos', count: 1, sentiment_avg: 'positive', keywords: ['festival', 'evento', 'cultura', 'família'] },
    { label: 'Mobilidade Urbana', count: 2, sentiment_avg: 'neutral', keywords: ['ciclovia', 'metrô', 'ônibus', 'transporte'] },
    { label: 'Zeladoria e Limpeza', count: 1, sentiment_avg: 'negative', keywords: ['lixo', 'coleta', 'reciclagem', 'entulho'] },
];

const REPORT_PERIODS = [
    { id: 'semanal', label: 'Semanal', icon: '📅' },
    { id: 'mensal', label: 'Mensal', icon: '🗓️' },
    { id: 'semestral', label: 'Semestral', icon: '📊' },
    { id: 'anual', label: 'Anual', icon: '🏛️' },
] as const;

// ─── COMPONENTES MENORES ──────────────────────────────────────────────────────

const SentimentIcon = ({ sentiment, size = 18 }: { sentiment: Sentiment; size?: number }) => {
    if (sentiment === 'positive') return <TrendingUp size={size} color="#10b981" />;
    if (sentiment === 'negative') return <TrendingDown size={size} color="#ef4444" />;
    return <Minus size={size} color="#f59e0b" />;
};

const SentimentLabel = ({ sentiment }: { sentiment: Sentiment }) => (
    <span className={`ig-sentiment-tag ${sentiment}`}>
        <SentimentIcon sentiment={sentiment} size={12} />
        {sentiment === 'positive' ? 'Positivo' : sentiment === 'negative' ? 'Negativo' : 'Neutro'}
    </span>
);

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export default function InstagramInsights() {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('semanal');
    const [sentimentFilter, setSentimentFilter] = useState<'all' | Sentiment>('all');
    const [replyFilter, setReplyFilter] = useState<'all' | 'replied' | 'pending'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

    const stats = useMemo(() => ({
        total: MOCKED_COMMENTS.length,
        positive: MOCKED_COMMENTS.filter(c => c.sentiment === 'positive').length,
        negative: MOCKED_COMMENTS.filter(c => c.sentiment === 'negative').length,
        neutral: MOCKED_COMMENTS.filter(c => c.sentiment === 'neutral').length,
        replied: MOCKED_COMMENTS.filter(c => c.replied).length,
        pending: MOCKED_COMMENTS.filter(c => !c.replied).length,
        totalLikes: MOCKED_COMMENTS.reduce((sum, c) => sum + c.likes, 0),
    }), []);

    const filteredComments = useMemo(() => {
        return MOCKED_COMMENTS.filter(c => {
            if (sentimentFilter !== 'all' && c.sentiment !== sentimentFilter) return false;
            if (replyFilter === 'replied' && !c.replied) return false;
            if (replyFilter === 'pending' && c.replied) return false;
            if (searchTerm && !c.text.toLowerCase().includes(searchTerm.toLowerCase()) && !c.author.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });
    }, [sentimentFilter, replyFilter, searchTerm]);

    const sentimentPercent = (sentiment: Sentiment) => Math.round((stats[sentiment] / stats.total) * 100);

    return (
        <div className="ig-page">
            {/* ── CABEÇALHO ─────────────────────────────────────────────── */}
            <header className="ig-header">
                <div className="ig-header-brand">
                    <div className="ig-icon-box">
                        <Instagram size={26} color="#fff" />
                    </div>
                    <div>
                        <h1>Instagram Analytics</h1>
                        <p>Análise de comentários · Prefeitura de Guarulhos</p>
                    </div>
                </div>

                <div className="ig-period-tabs">
                    {REPORT_PERIODS.map(p => (
                        <button
                            key={p.id}
                            className={`ig-period-tab ${selectedPeriod === p.id ? 'active' : ''}`}
                            onClick={() => setSelectedPeriod(p.id as Period)}
                        >
                            <span>{p.icon}</span> {p.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* ── KPIs ───────────────────────────────────────────────────── */}
            <section className="ig-kpis">
                <div className="ig-kpi-card">
                    <div className="ig-kpi-icon blue"><MessageCircle size={20} /></div>
                    <div className="ig-kpi-value">{stats.total}</div>
                    <div className="ig-kpi-label">Total de Comentários</div>
                </div>
                <div className="ig-kpi-card">
                    <div className="ig-kpi-icon green"><TrendingUp size={20} /></div>
                    <div className="ig-kpi-value">{sentimentPercent('positive')}%</div>
                    <div className="ig-kpi-label">Sentimento Positivo</div>
                </div>
                <div className="ig-kpi-card">
                    <div className="ig-kpi-icon red"><TrendingDown size={20} /></div>
                    <div className="ig-kpi-value">{sentimentPercent('negative')}%</div>
                    <div className="ig-kpi-label">Sentimento Negativo</div>
                </div>
                <div className="ig-kpi-card">
                    <div className="ig-kpi-icon orange"><AlertCircle size={20} /></div>
                    <div className="ig-kpi-value">{stats.pending}</div>
                    <div className="ig-kpi-label">Sem Resposta</div>
                </div>
                <div className="ig-kpi-card">
                    <div className="ig-kpi-icon purple"><CheckCircle2 size={20} /></div>
                    <div className="ig-kpi-value">{stats.replied}</div>
                    <div className="ig-kpi-label">Respondidos</div>
                </div>
                <div className="ig-kpi-card">
                    <div className="ig-kpi-icon pink"><Heart size={20} /></div>
                    <div className="ig-kpi-value">{stats.totalLikes}</div>
                    <div className="ig-kpi-label">Total de Curtidas</div>
                </div>
            </section>

            <div className="ig-main-grid">

                {/* ── MAPA MENTAL DE TEMAS ─────────────────────────────── */}
                <section className="ig-panel ig-topics">
                    <div className="ig-panel-header">
                        <BarChart3 size={20} />
                        <h2>Mapa de Temas</h2>
                    </div>

                    <div className="ig-topic-map">
                        {TOPIC_GROUPS.map(topic => (
                            <div
                                key={topic.label}
                                className={`ig-topic-node ${topic.sentiment_avg} ${expandedTopic === topic.label ? 'expanded' : ''}`}
                                onClick={() => setExpandedTopic(expandedTopic === topic.label ? null : topic.label)}
                            >
                                <div className="ig-topic-row">
                                    <div className="ig-topic-main">
                                        <SentimentIcon sentiment={topic.sentiment_avg} size={16} />
                                        <span className="ig-topic-label">{topic.label}</span>
                                    </div>
                                    <div className="ig-topic-right">
                                        <span className="ig-topic-count">{topic.count} coment.</span>
                                        <ChevronDown size={14} className={`ig-topic-chevron ${expandedTopic === topic.label ? 'rotated' : ''}`} />
                                    </div>
                                </div>

                                <div className="ig-topic-bar-wrapper">
                                    <div
                                        className={`ig-topic-bar ${topic.sentiment_avg}`}
                                        style={{ width: `${(topic.count / stats.total) * 100}%` }}
                                    />
                                </div>

                                {expandedTopic === topic.label && (
                                    <div className="ig-topic-keywords">
                                        {topic.keywords.map(kw => (
                                            <span key={kw} className="ig-keyword"># {kw}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ── TERMÔMETRO DE SENTIMENTO ─────────────────────── */}
                    <div className="ig-sentiment-meter">
                        <h3>Termômetro Semanal</h3>
                        <div className="ig-meter-bar">
                            <div
                                className="ig-meter-segment positive"
                                style={{ width: `${sentimentPercent('positive')}%` }}
                                title={`${sentimentPercent('positive')}% Positivo`}
                            />
                            <div
                                className="ig-meter-segment neutral"
                                style={{ width: `${sentimentPercent('neutral')}%` }}
                                title={`${sentimentPercent('neutral')}% Neutro`}
                            />
                            <div
                                className="ig-meter-segment negative"
                                style={{ width: `${sentimentPercent('negative')}%` }}
                                title={`${sentimentPercent('negative')}% Negativo`}
                            />
                        </div>
                        <div className="ig-meter-legend">
                            <span className="positive">✅ {sentimentPercent('positive')}% Positivo</span>
                            <span className="neutral">⚡ {sentimentPercent('neutral')}% Neutro</span>
                            <span className="negative">🔴 {sentimentPercent('negative')}% Negativo</span>
                        </div>
                    </div>

                    {/* ── RESUMO RELATÓRIO ─────────────────────────────── */}
                    <div className="ig-report-preview">
                        <div className="ig-report-header-row">
                            <FileText size={18} />
                            <span>Relatório {REPORT_PERIODS.find(p => p.id === selectedPeriod)?.label}</span>
                            <button className="ig-btn-export">Exportar PDF</button>
                        </div>
                        <ul className="ig-report-bullets">
                            <li>📈 {stats.positive} comentários positivos ({sentimentPercent('positive')}%)</li>
                            <li>🔴 {stats.negative} comentários negativos ({sentimentPercent('negative')}%)</li>
                            <li>⚠️ {stats.pending} comentários sem resposta da prefeitura</li>
                            <li>🏆 Tema mais citado: <strong>Obras e Pavimentação</strong></li>
                            <li>❤️ Total de engajamento recebido: <strong>{stats.totalLikes} curtidas</strong></li>
                        </ul>
                    </div>
                </section>

                {/* ── FEED DE COMENTÁRIOS ──────────────────────────────── */}
                <section className="ig-panel ig-comments">
                    <div className="ig-panel-header">
                        <MessageCircle size={20} />
                        <h2>Comentários da Semana</h2>
                        <span className="ig-badge">{filteredComments.length}</span>
                    </div>

                    {/* Filtros */}
                    <div className="ig-comment-filters">
                        <div className="ig-search">
                            <Search size={15} />
                            <input
                                type="text"
                                placeholder="Buscar comentário ou autor..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="ig-filter-row">
                            <Filter size={14} />
                            {(['all', 'positive', 'negative', 'neutral'] as const).map(s => (
                                <button
                                    key={s}
                                    className={`ig-filter-chip ${sentimentFilter === s ? 'active ' + s : ''}`}
                                    onClick={() => setSentimentFilter(s)}
                                >
                                    {s === 'all' ? 'Todos' : s === 'positive' ? 'Positivos' : s === 'negative' ? 'Negativos' : 'Neutros'}
                                </button>
                            ))}
                            <div className="ig-divider-v" />
                            {(['all', 'pending', 'replied'] as const).map(r => (
                                <button
                                    key={r}
                                    className={`ig-filter-chip ${replyFilter === r ? 'active' : ''}`}
                                    onClick={() => setReplyFilter(r)}
                                >
                                    {r === 'all' ? 'Todos' : r === 'pending' ? 'Sem Resposta' : 'Respondidos'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lista de comentários */}
                    <div className="ig-comment-list">
                        {filteredComments.map(comment => (
                            <div key={comment.id} className={`ig-comment-card ${comment.sentiment}`}>
                                <div className="ig-comment-post-ref">
                                    <img
                                        src={comment.post_image}
                                        alt={comment.post_preview}
                                        className="ig-comment-post-thumb"
                                    />
                                    <span className="ig-comment-post-label">{comment.post_preview}</span>
                                </div>

                                <div className="ig-comment-body">
                                    <div className="ig-comment-header">
                                        <img src={comment.author_avatar} alt={comment.author} className="ig-avatar" />
                                        <div className="ig-comment-meta">
                                            <strong>{comment.author}</strong>
                                            <span className="ig-comment-time">
                                                <Clock size={11} />
                                                {new Date(comment.timestamp).toLocaleDateString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="ig-comment-tags">
                                            <SentimentLabel sentiment={comment.sentiment} />
                                            {comment.replied
                                                ? <span className="ig-reply-tag replied"><CheckCircle2 size={11} /> Respondido</span>
                                                : <span className="ig-reply-tag pending"><XCircle size={11} /> Pendente</span>
                                            }
                                        </div>
                                    </div>

                                    <p className="ig-comment-text">"{comment.text}"</p>

                                    <div className="ig-comment-footer">
                                        <span className="ig-comment-likes"><Heart size={13} /> {comment.likes} curtidas</span>
                                        <span className="ig-comment-topic"># {comment.topic}</span>
                                    </div>

                                    {comment.replied && comment.reply_text && (
                                        <div className="ig-reply-box">
                                            <span className="ig-reply-label">
                                                <Star size={12} /> Resposta oficial
                                            </span>
                                            <p>{comment.reply_text}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {filteredComments.length === 0 && (
                            <div className="ig-empty">
                                <MessageCircle size={40} />
                                <p>Nenhum comentário encontrado com esses filtros.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* ── RODAPÉ INFORMATIVO ─────────────────────────────────── */}
            <footer className="ig-page-footer">
                <Users size={15} />
                <span>Dados mockados · Integração com Instagram Graph API pendente</span>
                <Calendar size={15} />
                <span>Semana de 17–26 Mar 2026</span>
            </footer>
        </div>
    );
}
