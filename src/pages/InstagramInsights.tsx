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
type Period = '7' | '30' | '180' | 'all';

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

// ─── DADOS MOCKADOS (Baseado no perfil real @prefeituraguarulhosoficial) ──────

const MOCKED_COMMENTS: Comment[] = [
    // --- ÚLTIMOS 7 DIAS ---
    {
        id: '1', post_id: 'p1',
        post_preview: 'Obras do Novo Viaduto Cecap/Dutra',
        post_image: 'https://images.unsplash.com/photo-1590483734159-4670221375a0?w=400&h=400&fit=crop',
        author: 'Guilherme R.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guilherme',
        text: 'Esse viaduto no Cecap vai ajudar demais quem mora aqui. Parabéns pela obra! 👏',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 
        likes: 156, sentiment: 'positive', topic: 'Obras Cecap', replied: true,
        reply_text: 'Obrigado, Guilherme! Essa é uma obra estratégica para destravar o trânsito na região. 🏛️'
    },
    {
        id: '2', post_id: 'p1',
        post_preview: 'Obras do Novo Viaduto Cecap/Dutra',
        post_image: 'https://images.unsplash.com/photo-1590483734159-4670221375a0?w=400&h=400&fit=crop',
        author: 'Juliana P.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juliana',
        text: 'E a poeira aqui no Cecap? Ninguém aguenta mais. Quando termina essa obra? 😤',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 89, sentiment: 'negative', topic: 'Obras Cecap', replied: false,
    },
    {
        id: '3', post_id: 'p2',
        post_preview: 'Chegada da Linha 2-Verde do Metrô',
        post_image: 'https://images.unsplash.com/photo-1510252199042-88846c430e84?w=400&h=400&fit=crop',
        author: 'Ricardo S.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ricardo',
        text: 'Metrô em Guarulhos é um sonho de gerações. Finalmente saindo do papel! 🚇✨',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 342, sentiment: 'positive', topic: 'Expansão Metrô', replied: true,
        reply_text: 'É um marco histórico para nossa cidade! Seguimos acompanhando cada passo dessa conquista. 💙'
    },
    // --- ÚLTIMOS 30 DIAS ---
    {
        id: '5', post_id: 'p3',
        post_preview: 'Nova Iluminação LED no Bonsucesso',
        post_image: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&h=400&fit=crop',
        author: 'Camila F.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Camila',
        text: 'O Bonsucesso estava precisando! Ficou muito mais seguro caminhar à noite. 💡',
        timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 120, sentiment: 'positive', topic: 'Zeladoria e LED', replied: true,
        reply_text: 'Segurança e modernidade! O programa Ilumina Guarulhos vai chegar a todos os bairros. 🎭'
    },
    {
        id: '6', post_id: 'p4',
        post_preview: 'Mutirão de Saúde: Exames de Imagem',
        post_image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400&h=400&fit=crop',
        author: 'Alessandra M.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alessandra',
        text: 'Preciso de um exame de vista. Onde faço a inscrição pro mutirão?',
        timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 210, sentiment: 'neutral', topic: 'Saúde Guarulhos', replied: false,
    },
    // --- ÚLTIMOS 180 DIAS ---
    {
        id: '7', post_id: 'p5',
        post_preview: 'Recuperação de área verde no Pimentas',
        post_image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=400&fit=crop',
        author: 'Fábio H.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fabio',
        text: 'E o lixo acumulado aqui na rua de trás? Adianta nada plantar árvore se não limpam. 😡',
        timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 56, sentiment: 'negative', topic: 'Zeladoria e LED', replied: true,
        reply_text: 'Fábio, nossa equipe de zeladoria já foi acionada para o local. Em breve estará tudo limpo! 🏛️'
    },
    {
        id: '9', post_id: 'p6',
        post_preview: 'Entrega de Novos Ônibus na Vila Galvão',
        post_image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=400&fit=crop',
        author: 'Tânia J.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tania',
        text: 'Os ônibus novos são ótimos, mas a linha 262 continua atrasando muito. 🚌',
        timestamp: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 88, sentiment: 'neutral', topic: 'Transporte Público', replied: false,
    },
    {
        id: '10', post_id: 'p7',
        post_preview: 'Aniversário de Guarulhos: Shows no Bosque',
        post_image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop',
        author: 'Lucas B.', author_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas',
        text: 'Melhor aniversário de todos! Organização nota 10. Parabéns prefeitura! 🎉',
        timestamp: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        likes: 567, sentiment: 'positive', topic: 'Eventos Cidade', replied: true,
        reply_text: 'Ficamos muito felizes que você gostou! Guarulhos merece celebrar em grande estilo. 🍿'
    },
];

const TOPIC_GROUPS: TopicGroup[] = [
    { label: 'Obras Cecap', count: 2, sentiment_avg: 'neutral', keywords: ['viaduto', 'poeira', 'transito', 'obra'] },
    { label: 'Expansão Metrô', count: 2, sentiment_avg: 'positive', keywords: ['metrô', 'sonho', 'transporte', 'conquista'] },
    { label: 'Saúde Guarulhos', count: 1, sentiment_avg: 'neutral', keywords: ['exame', 'mutirão', 'atendimento', 'UBS'] },
    { label: 'Zeladoria e LED', count: 2, sentiment_avg: 'neutral', keywords: ['iluminação', 'lixo', 'segurança', 'limpeza'] },
    { label: 'Transporte Público', count: 1, sentiment_avg: 'neutral', keywords: ['ônibus', 'atraso', 'frota', 'linha'] },
    { label: 'Eventos Cidade', count: 1, sentiment_avg: 'positive', keywords: ['aniversário', 'shows', 'bosque', 'festa'] },
];

const REPORT_PERIODS = [
    { id: '7', label: '7 Dias', icon: '🗓️' },
    { id: '30', label: '30 Dias', icon: '📅' },
    { id: '180', label: '180 Dias', icon: '📊' },
    { id: 'all', label: 'Histórico', icon: '🏛️' },
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
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('7');
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
            // Filtro de Período
            if (selectedPeriod !== 'all') {
                const days = parseInt(selectedPeriod);
                const limitDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
                if (new Date(c.timestamp) < limitDate) return false;
            }
            
            if (sentimentFilter !== 'all' && c.sentiment !== sentimentFilter) return false;
            if (replyFilter === 'replied' && !c.replied) return false;
            if (replyFilter === 'pending' && c.replied) return false;
            if (searchTerm && !c.text.toLowerCase().includes(searchTerm.toLowerCase()) && !c.author.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });
    }, [selectedPeriod, sentimentFilter, replyFilter, searchTerm]);

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
