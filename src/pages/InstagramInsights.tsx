import { useState, useMemo, useEffect } from 'react';
import {
    Instagram,
    MessageCircle,
    Heart,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronDown,
    CheckCircle2,
    Clock,
    Search,
    Users,
    Star,
    AlertCircle,
    Calendar,
    Settings,
    BrainCircuit,
    ExternalLink,
    RefreshCcw,
    Filter,
    Database,
    Zap
} from 'lucide-react';
import { normalizeText } from '../utils/searchUtils';
import './InstagramInsights.css';
import InstagramSettingsModal from '../components/InstagramSettingsModal';
import { supabase } from '../lib/supabaseClient';

type Sentiment = 'positive' | 'negative' | 'neutral' | 'pending';
type Period = '7' | '30' | '180' | 'all';
type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral' | 'pending';

// ─── INTERFACES ──────────────────────────────────────────────────────────

interface IGPost {
    id: string;
    ig_post_id: string;
    caption: string;
    media_url: string;
    permalink: string;
    like_count: number;
    comments_count: number;
    post_date: string;
}

interface IGComment {
    id: string;
    ig_comment_id: string;
    ig_post_id: string;
    author_username: string;
    comment_text: string;
    comment_date: string;
    sentiment: Sentiment;
    topic: string;
    urgency: string;
    is_critical: boolean;
}

interface IGAnalysis {
    id: string;
    ig_post_id: string;
    ai_summary: string;
    topics: string[];
    positive_pct: number;
    negative_pct: number;
    neutral_pct: number;
    analyzed_at: string;
}

// ─── COMPONENTES MENORES ──────────────────────────────────────────────────────

const SentimentIcon = ({ sentiment, size = 18 }: { sentiment: Sentiment; size?: number }) => {
    if (sentiment === 'positive') return <TrendingUp size={size} color="#10b981" />;
    if (sentiment === 'negative') return <TrendingDown size={size} color="#ef4444" />;
    if (sentiment === 'pending') return <Clock size={size} color="#94a3b8" />;
    return <Minus size={size} color="#f59e0b" />;
};

const SentimentLabel = ({ sentiment }: { sentiment: Sentiment }) => {
    const labels: Record<Sentiment, string> = { positive: 'Positivo', negative: 'Negativo', neutral: 'Neutro', pending: 'Pendente' };
    return (
        <span className={`ig-sentiment-tag ${sentiment}`}>
            <SentimentIcon sentiment={sentiment} size={12} />
            {labels[sentiment]}
        </span>
    );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function InstagramInsights() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
    const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
    
    // Structured Topic states for Macro / Micro municipal tracking
    const [topicLevel, setTopicLevel] = useState<'macro' | 'micro'>('macro');
    const [selectedSecFilter, setSelectedSecFilter] = useState<string>('');
    const [selectedProbFilter, setSelectedProbFilter] = useState<string>('');

    // Structured topic parser: Resolves both old text topics and new "Secretaria | Assunto | Problema" strings
    const parseStructuredTopic = (topicString: string | null) => {
        if (!topicString) return { secretaria: 'Outros', assunto: 'Geral', problema: 'Geral' };
        const parts = topicString.split(' | ');
        if (parts.length >= 3) {
            return {
                secretaria: parts[0].trim(),
                assunto: parts[1].trim(),
                problema: parts[2].trim()
            };
        }
        
        // Simple heuristic for older unformatted database records
        const val = topicString.trim();
        const low = val.toLowerCase();
        let secretaria = 'Outros';
        if (low.includes('saud') || low.includes('medic') || low.includes('upa') || low.includes('vacina') || low.includes('hospital')) secretaria = 'Saúde';
        else if (low.includes('lixo') || low.includes('buraco') || low.includes('asfalt') || low.includes('varr') || low.includes('limpez') || low.includes('zelador')) secretaria = 'Zeladoria';
        else if (low.includes('transito') || low.includes('semafor') || low.includes('rua') || low.includes('avenid') || low.includes('onibus')) secretaria = 'Trânsito';
        else if (low.includes('escol') || low.includes('crech') || low.includes('aluno') || low.includes('profess')) secretaria = 'Educação';
        else if (low.includes('show') || low.includes('teatr') || low.includes('musica') || low.includes('event')) secretaria = 'Cultura';
        
        return {
            secretaria,
            assunto: val,
            problema: 'Geral'
        };
    };

    const [posts, setPosts] = useState<IGPost[]>([]);
    const [comments, setComments] = useState<IGComment[]>([]);
    const [analyses, setAnalyses] = useState<IGAnalysis[]>([]);

    const [isSyncing, setIsSyncing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [syncStartDate, setSyncStartDate] = useState('');

    // ─── FETCH DATA ────────────────────────────────────────────────────────
    const fetchData = async () => {
        const [postsRes, commentsRes, analysisRes] = await Promise.all([
            supabase.from('ig_posts').select('*').order('post_date', { ascending: false }),
            supabase.from('ig_comments').select('*').order('comment_date', { ascending: false }),
            supabase.from('ig_analysis').select('*').order('analyzed_at', { ascending: false })
        ]);
        if (postsRes.data) setPosts(postsRes.data);
        if (commentsRes.data) setComments(commentsRes.data);
        if (analysisRes.data) setAnalyses(analysisRes.data);
    };

    useEffect(() => { fetchData(); }, []);

    // ─── SINCRONIZAR (COLETA PURA) ─────────────────────────────────────────
    const handleSync = async () => {
        setIsSyncing(true);
        setSyncStatus('Conectando ao Instagram...');
        try {
            const igToken = localStorage.getItem('ig_accessToken');
            if (!igToken) { alert('Configure o Access Token nas configurações.'); setIsSyncing(false); return; }

            // 1. Achar Página e Instagram
            let igId = null;
            const pageRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${igToken}`);
            const pageData = await pageRes.json();

            if (pageData.error) {
                const directRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=${igToken}`);
                const directData = await directRes.json();
                if (directData.instagram_business_account) {
                    igId = directData.instagram_business_account.id;
                } else {
                    throw new Error(`Erro do Facebook: ${pageData.error.message}`);
                }
            } else if (pageData.data && pageData.data.length > 0) {
                const pageId = pageData.data[0].id;
                const igRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${igToken}`);
                const igData = await igRes.json();
                if (!igData.instagram_business_account) throw new Error("Nenhuma conta Business do Instagram conectada.");
                igId = igData.instagram_business_account.id;
            } else {
                throw new Error("Nenhuma página encontrada. Verifique as permissões do token.");
            }

            if (!igId) throw new Error("ID do Instagram não encontrado.");

            // 2. Puxar Posts
            setSyncStatus('Baixando posts...');
            let sinceQuery = '';
            if (syncStartDate) {
                const unixTime = Math.floor(new Date(`${syncStartDate}T00:00:00`).getTime() / 1000);
                sinceQuery = `&since=${unixTime}`;
            }

            let allPosts: any[] = [];
            let nextUrl = `https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,media_url,permalink,like_count,comments_count,timestamp&limit=50${sinceQuery}&access_token=${igToken}`;
            
            while (nextUrl) {
                const mediaRes = await fetch(nextUrl);
                const mediaData = await mediaRes.json();
                if (mediaData.data) {
                    allPosts = allPosts.concat(mediaData.data);
                }
                nextUrl = mediaData.paging?.next || null;
                
                if (allPosts.length > 0 && syncStartDate) {
                    const lastPostDate = new Date(allPosts[allPosts.length - 1].timestamp);
                    if (lastPostDate < new Date(`${syncStartDate}T00:00:00`)) break;
                }
            }

            if (syncStartDate) {
                allPosts = allPosts.filter(p => new Date(p.timestamp) >= new Date(`${syncStartDate}T00:00:00`));
            }

            if (allPosts.length === 0) throw new Error("Nenhum post encontrado nesse período.");

            let totalNewPosts = 0;
            let totalNewComments = 0;

            for (const post of allPosts) {
                // Salvar post (ignorar se já existe)
                const postData = {
                    ig_post_id: post.id,
                    caption: post.caption || '',
                    media_url: post.media_url || '',
                    permalink: post.permalink || '',
                    like_count: post.like_count || 0,
                    comments_count: post.comments_count || 0,
                    post_date: post.timestamp || new Date().toISOString()
                };

                const { error: postErr } = await supabase.from('ig_posts').upsert(postData, { onConflict: 'ig_post_id' });
                if (!postErr) totalNewPosts++;

                // 3. Puxar Comentários do post
                setSyncStatus(`Baixando comentários do post ${totalNewPosts}/${allPosts.length}...`);
                const commentsRes = await fetch(`https://graph.facebook.com/v19.0/${post.id}/comments?fields=id,text,username,timestamp&limit=100&access_token=${igToken}`);
                const commentsData = await commentsRes.json();

                if (commentsData.data && commentsData.data.length > 0) {
                    const commentRows = commentsData.data.map((c: any) => ({
                        ig_comment_id: c.id,
                        ig_post_id: post.id,
                        author_username: c.username || 'Anônimo',
                        comment_text: c.text || '',
                        comment_date: c.timestamp || new Date().toISOString(),
                        sentiment: 'pending',
                        topic: null,
                        urgency: null,
                        is_critical: false
                    }));

                    const { data: inserted } = await supabase.from('ig_comments').upsert(commentRows, { onConflict: 'ig_comment_id', ignoreDuplicates: true });
                    totalNewComments += inserted?.length || commentRows.length;
                }
            }

            setSyncStatus(`✅ ${totalNewPosts} posts e ${totalNewComments} comentários coletados!`);
            await fetchData();
        } catch (e: any) {
            console.error("Erro na sincronização", e);
            setSyncStatus(`❌ ${e.message}`);
        }
        setIsSyncing(false);
    };

    // ─── ANALISAR COM IA ────────────────────────────────────────────────────
    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setSyncStatus('Preparando análise com IA...');
        try {
            const aiKey = localStorage.getItem('ig_aiKey');
            if (!aiKey) { alert('Configure a chave da IA nas configurações.'); setIsAnalyzing(false); return; }

            // Buscar comentários pendentes
            const { data: pendingComments } = await supabase
                .from('ig_comments')
                .select('*')
                .eq('sentiment', 'pending');

            if (!pendingComments || pendingComments.length === 0) {
                setSyncStatus('✅ Todos os comentários já foram analisados!');
                setIsAnalyzing(false);
                return;
            }

            // Agrupar por post
            const byPost: Record<string, typeof pendingComments> = {};
            pendingComments.forEach((c: any) => {
                if (!byPost[c.ig_post_id]) byPost[c.ig_post_id] = [];
                byPost[c.ig_post_id].push(c);
            });

            let analyzed = 0;
            for (const [postId, postComments] of Object.entries(byPost)) {
                setSyncStatus(`Analisando ${analyzed + postComments.length}/${pendingComments.length} comentários...`);

                const commentsForAI = postComments.map((c: any) => ({
                    id: c.ig_comment_id,
                    author: c.author_username,
                    text: c.comment_text
                }));

                const res = await fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: {
                        "x-api-key": aiKey,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                        "anthropic-dangerous-direct-browser-access": "true"
                    },
                    body: JSON.stringify({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 2000,
                        messages: [{
                            role: "user",
                            content: `Você é um classificador de sentimento social para a Prefeitura de Guarulhos. Analise cada comentário e retorne APENAS um JSON estrito neste formato:
{
  "summary": "resumo executivo curto de todos os comentários",
  "topics": ["tema1", "tema2"],
  "comments": [
    {
      "id": "id_do_comentario",
      "sentiment": "positive" | "negative" | "neutral",
      "topic": "Secretaria | Assunto Geral | Problema Específico ou Detalhe" (Exemplos obrigatórios de preenchimento estruturado: 
        - "Saúde | UPA Vila Galvão | Demora no atendimento pediátrico"
        - "Zeladoria | Limpeza Pública | Acúmulo de lixo na calçada"
        - "Trânsito | Semáforos | Semáforo quebrado na Av. Tiradentes"
        - "Educação | Vagas em Creche | Falta de vagas para berçário"
        - "Segurança | Iluminação Pública | Rua escura com lâmpada queimada"
        - "Outros | Geral | Elogio ao post ou comentário neutro"),
      "urgency": "high" | "medium" | "low",
      "is_critical": true | false
    }
  ]
}

Comentários para analisar:
${JSON.stringify(commentsForAI)}`
                        }]
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    try {
                        const cleaned = data.content[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
                        const parsed = JSON.parse(cleaned);

                        // Atualizar cada comentário
                        if (parsed.comments) {
                            for (const c of parsed.comments) {
                                await supabase.from('ig_comments').update({
                                    sentiment: c.sentiment || 'neutral',
                                    topic: c.topic || 'Geral',
                                    urgency: c.urgency || 'low',
                                    is_critical: c.is_critical || false
                                }).eq('ig_comment_id', c.id);
                            }
                        }

                        // Salvar análise geral
                        const posCount = parsed.comments?.filter((c: any) => c.sentiment === 'positive').length || 0;
                        const negCount = parsed.comments?.filter((c: any) => c.sentiment === 'negative').length || 0;
                        const neuCount = parsed.comments?.filter((c: any) => c.sentiment === 'neutral').length || 0;
                        const total = posCount + negCount + neuCount || 1;

                        await supabase.from('ig_analysis').insert({
                            ig_post_id: postId,
                            ai_summary: parsed.summary || 'Análise concluída.',
                            topics: parsed.topics || [],
                            positive_pct: Math.round((posCount / total) * 100),
                            negative_pct: Math.round((negCount / total) * 100),
                            neutral_pct: Math.round((neuCount / total) * 100)
                        });
                    } catch (e) { console.error("Erro parsing IA:", e); }
                } else {
                    const errText = await res.text();
                    console.error("Erro Claude:", res.status, errText);
                    throw new Error(`Erro da IA: ${res.status}`);
                }
                analyzed += postComments.length;
            }

            setSyncStatus(`✅ ${analyzed} comentários analisados com sucesso!`);
            await fetchData();
        } catch (e: any) {
            console.error("Erro na análise", e);
            setSyncStatus(`❌ ${e.message}`);
        }
        setIsAnalyzing(false);
    };

    // ─── ESTATÍSTICAS CALCULADAS ─────────────────────────────────────────────
    const stats = useMemo(() => {
        const totalComments = comments.length;
        const pendingCount = comments.filter(c => c.sentiment === 'pending').length;
        const analyzedComments = comments.filter(c => c.sentiment !== 'pending');
        const posCount = analyzedComments.filter(c => c.sentiment === 'positive').length;
        const negCount = analyzedComments.filter(c => c.sentiment === 'negative').length;
        const neuCount = analyzedComments.filter(c => c.sentiment === 'neutral').length;
        const totalAnalyzed = posCount + negCount + neuCount || 1;
        const totalLikes = posts.reduce((acc, p) => acc + (p.like_count || 0), 0);
        const criticalCount = comments.filter(c => c.is_critical).length;

        return {
            totalPosts: posts.length,
            totalComments,
            pendingCount,
            totalLikes,
            criticalCount,
            posPct: Math.round((posCount / totalAnalyzed) * 100),
            negPct: Math.round((negCount / totalAnalyzed) * 100),
            neuPct: Math.round((neuCount / totalAnalyzed) * 100)
        };
    }, [posts, comments]);

    // ─── MAPA DE TÓPICOS E SEGMENTAÇÃO MUNICIPAL (MACRO E MICRO) ────────────────
    const secretariaMap = useMemo(() => {
        const map: Record<string, { total: number; positive: number; negative: number; neutral: number }> = {};
        comments.filter(c => c.topic && c.sentiment !== 'pending').forEach(c => {
            const { secretaria } = parseStructuredTopic(c.topic);
            if (!map[secretaria]) map[secretaria] = { total: 0, positive: 0, negative: 0, neutral: 0 };
            map[secretaria].total++;
            if (c.sentiment === 'positive') map[secretaria].positive++;
            else if (c.sentiment === 'negative') map[secretaria].negative++;
            else map[secretaria].neutral++;
        });
        return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
    }, [comments]);

    const problemaMap = useMemo(() => {
        const map: Record<string, { total: number; positive: number; negative: number; neutral: number; secretaria: string; assunto: string }> = {};
        comments.filter(c => c.topic && c.sentiment !== 'pending').forEach(c => {
            const { secretaria, assunto, problema } = parseStructuredTopic(c.topic);
            const key = `${secretaria} > ${problema}`;
            if (!map[key]) map[key] = { total: 0, positive: 0, negative: 0, neutral: 0, secretaria, assunto };
            map[key].total++;
            if (c.sentiment === 'positive') map[key].positive++;
            else if (c.sentiment === 'negative') map[key].negative++;
            else map[key].neutral++;
        });
        return Object.entries(map).sort((a, b) => b[1].total - a[1].total).slice(0, 10);
    }, [comments]);

    const topicMap = useMemo(() => {
        return topicLevel === 'macro' ? secretariaMap : problemaMap;
    }, [topicLevel, secretariaMap, problemaMap]);

    // ─── FILTROS DINÂMICOS COM NAVEGAÇÃO MULTINÍVEL ──────────────────────────────
    const filteredComments = useMemo(() => {
        let filtered = [...comments];
        if (sentimentFilter !== 'all') filtered = filtered.filter(c => c.sentiment === sentimentFilter);
        
        if (selectedSecFilter) {
            filtered = filtered.filter(c => parseStructuredTopic(c.topic).secretaria === selectedSecFilter);
        }
        if (selectedProbFilter) {
            filtered = filtered.filter(c => {
                const { secretaria, problema } = parseStructuredTopic(c.topic);
                return `${secretaria} > ${problema}` === selectedProbFilter;
            });
        }
        
        if (searchTerm) {
            const term = normalizeText(searchTerm);
            filtered = filtered.filter(c =>
                normalizeText(c.comment_text).includes(term) ||
                normalizeText(c.author_username).includes(term) ||
                (c.topic && normalizeText(c.topic).includes(term))
            );
        }
        return filtered.slice(0, 50);
    }, [comments, sentimentFilter, selectedSecFilter, selectedProbFilter, searchTerm]);

    const latestAnalysis = analyses.length > 0 ? analyses[0] : null;

    const toggleTopic = (topic: string) => {
        setExpandedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
    };

    const handleTopicSelect = (topic: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (topicLevel === 'macro') {
            setSelectedProbFilter('');
            setSelectedSecFilter(prev => prev === topic ? '' : topic);
        } else {
            setSelectedSecFilter('');
            setSelectedProbFilter(prev => prev === topic ? '' : topic);
        }
        
        setTimeout(() => {
            const el = document.getElementById('ig-comments-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <div className="dashboard-container dashboard-v3-root ig-page">
            {/* ── CABEÇALHO ─────────────────────────────────────────────── */}
            <header className="page-header dashboard-header-premium glass ig-premium-header">
                <div className="header-meta-row">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h1 className="title text-gradient" style={{ margin: 0 }}>Instagram</h1>
                            {localStorage.getItem('ig_handle') && (
                                <span style={{ background: '#fdf2f8', color: '#db2777', padding: '4px 10px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 800, border: '1px solid #fbcfe8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Users size={12} /> {localStorage.getItem('ig_handle')}
                                </span>
                            )}
                        </div>
                        <p className="subtitle" style={{ margin: '4px 0 0' }}>Coleta e Análise de Sentimento · Prefeitura de Guarulhos</p>
                    </div>

                    <div className="header-meta-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Status da IA */}
                        {localStorage.getItem('ig_aiKey') ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', color: '#047857', padding: '0 1rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, border: '1.5px solid #a7f3d0', height: '38px', boxSizing: 'border-box' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                                IA Conectada
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fef2f2', color: '#b91c1c', padding: '0 1rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, border: '1.5px solid #fecaca', height: '38px', boxSizing: 'border-box' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                                IA Desconectada
                            </div>
                        )}

                        <button className="ig-settings-btn" onClick={() => setIsSettingsOpen(true)} style={{ height: '38px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
                            <Settings size={18} />
                            API & IA
                        </button>
                    </div>
                </div>

                <div className="header-filters-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', width: '100%' }}>
                    <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className="filter-label" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Período de Coleta (A partir de)</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '0 1rem', height: '38px', boxSizing: 'border-box', minWidth: '200px' }}>
                            <Calendar size={14} style={{ color: '#64748b' }} />
                            <input 
                                type="date" 
                                value={syncStartDate}
                                onChange={(e) => setSyncStartDate(e.target.value)}
                                style={{ border: 'none', outline: 'none', fontSize: '0.82rem', color: '#334155', background: 'transparent', fontWeight: 600, cursor: 'pointer', width: '100%' }}
                            />
                        </div>
                    </div>

                    <div className="action-buttons-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Botão Sincronizar (Coleta) */}
                        <button
                            onClick={handleSync}
                            disabled={isSyncing || isAnalyzing}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', padding: '0 1.25rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, cursor: isSyncing ? 'not-allowed' : 'pointer', opacity: isSyncing ? 0.7 : 1, transition: 'all 0.3s ease', height: '38px', boxSizing: 'border-box' }}
                        >
                            <Database size={14} className={isSyncing ? 'spin-anim' : ''} />
                            {isSyncing ? 'Coletando...' : '📥 Coletar Dados'}
                        </button>

                        {/* Botão Analisar (IA) */}
                        <button
                            onClick={handleAnalyze}
                            disabled={isSyncing || isAnalyzing || stats.pendingCount === 0}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: stats.pendingCount > 0 ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : '#cbd5e1', color: stats.pendingCount > 0 ? '#fff' : '#94a3b8', border: 'none', padding: '0 1.25rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, cursor: (isAnalyzing || stats.pendingCount === 0) ? 'not-allowed' : 'pointer', opacity: isAnalyzing ? 0.7 : 1, transition: 'all 0.3s ease', height: '38px', boxSizing: 'border-box' }}
                        >
                            <Zap size={14} className={isAnalyzing ? 'spin-anim' : ''} />
                            {isAnalyzing ? 'Analisando...' : `🧠 Analisar (${stats.pendingCount})`}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── STATUS BAR ──────────────────────────────────────────── */}
            {syncStatus && (
                <div style={{ background: syncStatus.includes('❌') ? '#fef2f2' : syncStatus.includes('✅') ? '#f0fdf4' : '#eff6ff', border: `1px solid ${syncStatus.includes('❌') ? '#fecaca' : syncStatus.includes('✅') ? '#a7f3d0' : '#bfdbfe'}`, borderRadius: '12px', padding: '0.75rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600, color: syncStatus.includes('❌') ? '#991b1b' : syncStatus.includes('✅') ? '#047857' : '#1e40af', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeInIG 0.3s ease-out' }}>
                    {syncStatus.includes('❌') ? <AlertCircle size={16} /> : syncStatus.includes('✅') ? <CheckCircle2 size={16} /> : <RefreshCcw size={16} className="spin-anim" />}
                    {syncStatus}
                </div>
            )}

            {/* ── KPIs ────────────────────────────────────────────────── */}
            <section className="ig-kpis">
                <div className="ig-kpi-card">
                    <div className="ig-kpi-icon blue"><Database size={20} /></div>
                    <div className="ig-kpi-value">{stats.totalPosts}</div>
                    <div className="ig-kpi-label">Posts Coletados</div>
                </div>
                <div className="ig-kpi-card">
                    <div className="ig-kpi-icon blue"><MessageCircle size={20} /></div>
                    <div className="ig-kpi-value">{stats.totalComments.toLocaleString()}</div>
                    <div className="ig-kpi-label">Comentários Armazenados</div>
                </div>
                <div className="ig-kpi-card" style={{ borderColor: stats.pendingCount > 0 ? '#8b5cf6' : 'transparent', borderWidth: 2, borderStyle: 'solid' }}>
                    <div className="ig-kpi-icon purple"><Clock size={20} /></div>
                    <div className="ig-kpi-value">{stats.pendingCount}</div>
                    <div className="ig-kpi-label">Pendentes de Análise</div>
                </div>
                <div className="ig-kpi-card">
                    <div className="ig-kpi-icon green"><TrendingUp size={20} /></div>
                    <div className="ig-kpi-value">{stats.posPct}%</div>
                    <div className="ig-kpi-label">Sentimento Positivo</div>
                </div>
                <div className="ig-kpi-card">
                    <div className="ig-kpi-icon red"><TrendingDown size={20} /></div>
                    <div className="ig-kpi-value">{stats.negPct}%</div>
                    <div className="ig-kpi-label">Sentimento Negativo</div>
                </div>
                <div className="ig-kpi-card">
                    <div className="ig-kpi-icon pink"><Heart size={20} /></div>
                    <div className="ig-kpi-value">{stats.totalLikes.toLocaleString()}</div>
                    <div className="ig-kpi-label">Total de Curtidas</div>
                </div>
            </section>

            {/* ── LAYOUT 2 COLUNAS ────────────────────────────────────── */}
            <div className="ig-main-grid">

                {/* ── COLUNA ESQUERDA: TÓPICOS + TERMÔMETRO + RELATÓRIO ─── */}
                <aside>
                    {/* Mapa de Tópicos */}
                    <section className="ig-panel">
                        <div className="ig-panel-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '1rem', borderBottom: 'none', paddingBottom: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <BrainCircuit size={20} style={{ color: '#db2777' }} />
                                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Distribuição de Assuntos</h2>
                                </div>
                                <span className="ig-badge" style={{ background: '#fce7f3', color: '#db2777' }}>{topicMap.length} items</span>
                            </div>

                            {/* Toggles Macro e Micro */}
                            <div className="ig-segmented-tabs" style={{ display: 'flex', background: '#f8fafc', padding: '3px', borderRadius: '12px', border: '1px solid #e2e8f0', gap: '4px' }}>
                                <button 
                                    className={`ig-tab-btn ${topicLevel === 'macro' ? 'active' : ''}`}
                                    onClick={() => { setTopicLevel('macro'); setSelectedSecFilter(''); setSelectedProbFilter(''); }}
                                    style={{
                                        flex: 1,
                                        padding: '7px 12px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        borderRadius: '9px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: topicLevel === 'macro' ? '#fff' : 'transparent',
                                        color: topicLevel === 'macro' ? '#db2777' : '#64748b',
                                        boxShadow: topicLevel === 'macro' ? '0 2px 8px rgba(219,39,119,0.08)' : 'none',
                                        transition: 'all 0.25s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    🏢 Macro (Secretarias)
                                </button>
                                <button 
                                    className={`ig-tab-btn ${topicLevel === 'micro' ? 'active' : ''}`}
                                    onClick={() => { setTopicLevel('micro'); setSelectedSecFilter(''); setSelectedProbFilter(''); }}
                                    style={{
                                        flex: 1,
                                        padding: '7px 12px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        borderRadius: '9px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: topicLevel === 'micro' ? '#fff' : 'transparent',
                                        color: topicLevel === 'micro' ? '#db2777' : '#64748b',
                                        boxShadow: topicLevel === 'micro' ? '0 2px 8px rgba(219,39,119,0.08)' : 'none',
                                        transition: 'all 0.25s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    🔍 Micro (Problemas Específicos)
                                </button>
                            </div>
                        </div>

                        <div className="ig-topic-map" style={{ marginTop: '1.25rem' }}>
                            {topicMap.length === 0 ? (
                                <div className="ig-empty" style={{ padding: '2rem' }}>
                                    <Clock size={32} />
                                    <p>Clique em "Analisar" para os tópicos aparecerem aqui.</p>
                                </div>
                            ) : topicMap.map(([topic, data]) => {
                                const maxCount = topicMap[0][1].total;
                                const isActive = topicLevel === 'macro'
                                    ? selectedSecFilter === topic
                                    : selectedProbFilter === topic;
                                return (
                                    <div 
                                        key={topic} 
                                        className={`ig-topic-node ${expandedTopics.includes(topic) ? 'expanded' : ''} ${isActive ? 'active' : ''}`} 
                                        onClick={(e) => handleTopicSelect(topic, e)}
                                        style={{
                                            borderLeft: isActive ? '4px solid #db2777' : undefined,
                                            background: isActive ? '#fff8fa' : undefined,
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div className="ig-topic-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div className="ig-topic-main">
                                                <span className="ig-topic-label" style={{ fontWeight: isActive ? 800 : 700, color: isActive ? '#db2777' : undefined }}>{topic}</span>
                                            </div>
                                            <div 
                                                className="ig-topic-right" 
                                                onClick={(e) => { e.stopPropagation(); toggleTopic(topic); }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', background: '#f8fafc' }}
                                            >
                                                <span className="ig-topic-count" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{data.total} menções</span>
                                                <ChevronDown size={12} className={`ig-topic-chevron ${expandedTopics.includes(topic) ? 'rotated' : ''}`} style={{ transition: 'transform 0.2s' }} />
                                            </div>
                                        </div>
                                        <div className="ig-topic-bar-wrapper" style={{ height: '5px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden', margin: '8px 0' }}>
                                            <div 
                                                className="ig-topic-bar" 
                                                style={{ 
                                                    width: `${(data.total / maxCount) * 100}%`, 
                                                    height: '100%', 
                                                    background: isActive ? 'linear-gradient(90deg, #db2777, #f472b6)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                                    borderRadius: '99px'
                                                }} 
                                            />
                                        </div>
                                        {expandedTopics.includes(topic) && (
                                            <div className="ig-topic-keywords" style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
                                                <span className="ig-keyword" style={{ color: '#10b981' }}>👍 {data.positive} pos</span>
                                                <span className="ig-keyword" style={{ color: '#ef4444' }}>👎 {data.negative} neg</span>
                                                <span className="ig-keyword" style={{ color: '#f59e0b' }}>😐 {data.neutral} neu</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Termômetro de Sentimento */}
                    <section className="ig-panel" style={{ marginTop: '1.5rem' }}>
                        <div className="ig-sentiment-meter">
                            <h3>Termômetro Geral de Sentimento</h3>
                            <div className="ig-meter-bar">
                                <div className="ig-meter-segment positive" style={{ width: `${stats.posPct}%` }} />
                                <div className="ig-meter-segment neutral" style={{ width: `${stats.neuPct}%` }} />
                                <div className="ig-meter-segment negative" style={{ width: `${stats.negPct}%` }} />
                            </div>
                            <div className="ig-meter-legend">
                                <span className="positive">● {stats.posPct}% Positivo</span>
                                <span className="neutral">● {stats.neuPct}% Neutro</span>
                                <span className="negative">● {stats.negPct}% Negativo</span>
                            </div>
                        </div>
                    </section>

                    {/* Relatório IA */}
                    {latestAnalysis && (
                        <section className="ig-panel" style={{ marginTop: '1.5rem' }}>
                            <div className="ig-report-preview">
                                <div className="ig-report-header-row">
                                    <Star size={16} />
                                    Último Resumo da IA
                                </div>
                                <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
                                    {latestAnalysis.ai_summary}
                                </p>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {(latestAnalysis.topics || []).map((t: string) => (
                                        <span key={t} style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                                            # {t}
                                        </span>
                                    ))}
                                </div>
                                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                                    Analisado em {new Date(latestAnalysis.analyzed_at).toLocaleString()}
                                </div>
                            </div>
                        </section>
                    )}
                </aside>

                {/* ── COLUNA DIREITA: COMENTÁRIOS ──────────────────────── */}
                <section className="ig-panel ig-comments" id="ig-comments-section">
                    <div className="ig-panel-header" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MessageCircle size={20} />
                            <h2>Comentários</h2>
                            <span className="ig-badge">{filteredComments.length}</span>
                        </div>
                        <div className="ig-search">
                            <Search size={15} />
                            <input
                                type="text"
                                placeholder="Buscar comentário, autor ou tema..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filtros de Sentimento */}
                    <div className="ig-comment-filters" style={{ paddingBottom: (selectedSecFilter || selectedProbFilter) ? '0.25rem' : undefined }}>
                        <div className="ig-filter-row">
                            <Filter size={14} />
                            {(['all', 'positive', 'negative', 'neutral', 'pending'] as const).map(f => (
                                <button
                                    key={f}
                                    className={`ig-filter-chip ${sentimentFilter === f ? `active ${f}` : ''}`}
                                    onClick={() => setSentimentFilter(f)}
                                >
                                    {f === 'all' ? 'Todos' : f === 'positive' ? '👍 Positivos' : f === 'negative' ? '👎 Negativos' : f === 'neutral' ? '😐 Neutros' : '⏳ Pendentes'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filtros Macro / Micro Ativos */}
                    {(selectedSecFilter || selectedProbFilter) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 1.25rem 0.85rem', flexWrap: 'wrap', animation: 'fadeInIG 0.2s ease-out' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtro Ativo:</span>
                            {selectedSecFilter && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: '#fdf2f8',
                                    color: '#db2777',
                                    padding: '4px 12px',
                                    borderRadius: '100px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: '1px solid #fbcfe8'
                                }}>
                                    🏢 Secretaria: <strong>{selectedSecFilter}</strong>
                                    <button 
                                        onClick={() => setSelectedSecFilter('')}
                                        style={{ border: 'none', background: 'transparent', color: '#db2777', cursor: 'pointer', fontWeight: 800, padding: '0 2px', display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                            {selectedProbFilter && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: '#eff6ff',
                                    color: '#1e40af',
                                    padding: '4px 12px',
                                    borderRadius: '100px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: '1px solid #bfdbfe'
                                }}>
                                    🔍 Problema: <strong>{selectedProbFilter.split(' > ')[1]}</strong>
                                    <button 
                                        onClick={() => setSelectedProbFilter('')}
                                        style={{ border: 'none', background: 'transparent', color: '#1e40af', cursor: 'pointer', fontWeight: 800, padding: '0 2px', display: 'flex', alignItems: 'center', fontSize: '0.9rem' }}
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                            <button 
                                onClick={() => { setSelectedSecFilter(''); setSelectedProbFilter(''); }}
                                style={{ border: 'none', background: 'transparent', color: '#64748b', textDecoration: 'underline', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700, marginLeft: '4px' }}
                            >
                                Limpar filtro
                            </button>
                        </div>
                    )}

                    {/* Lista de Comentários */}
                    <div className="ig-comment-list">
                        {filteredComments.length === 0 ? (
                            <div className="ig-empty">
                                <Database size={40} />
                                <p>Nenhum comentário encontrado.</p>
                                <p style={{ fontSize: '0.8rem' }}>Clique em "Coletar Dados" para baixar os comentários do Instagram.</p>
                            </div>
                        ) : filteredComments.map(comment => {
                            const post = posts.find(p => p.ig_post_id === comment.ig_post_id);
                            return (
                                <div key={comment.id} className={`ig-comment-card ${comment.sentiment}`}>
                                    {/* Referência ao Post */}
                                    {post && (
                                        <div className="ig-comment-post-ref">
                                            {post.media_url && <img src={post.media_url} alt="" className="ig-comment-post-thumb" />}
                                            <span className="ig-comment-post-label">{post.caption?.substring(0, 60) || 'Post'}</span>
                                            {post.permalink && (
                                                <a href={post.permalink} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: '#3b82f6' }}>
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    <div className="ig-comment-body">
                                        <div className="ig-comment-header">
                                            <div className="ig-comment-meta">
                                                <strong>@{comment.author_username}</strong>
                                                <span className="ig-comment-time">
                                                    <Clock size={11} />
                                                    {new Date(comment.comment_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="ig-comment-tags">
                                                <SentimentLabel sentiment={comment.sentiment} />
                                                {comment.is_critical && (
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: '99px', background: '#fef2f2', color: '#ef4444' }}>
                                                        <AlertCircle size={10} /> Crítico
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="ig-comment-text">"{comment.comment_text}"</p>
                                        <div className="ig-comment-footer">
                                            {comment.topic && <span className="ig-comment-topic">#{comment.topic}</span>}
                                            {comment.urgency && <span style={{ fontSize: '0.75rem' }}>Urgência: {comment.urgency}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>

            {/* ── RODAPÉ ──────────────────────────────────────────────── */}
            <footer className="ig-page-footer">
                <Database size={15} />
                <span>{stats.totalPosts} posts · {stats.totalComments} comentários armazenados</span>
                <Calendar size={15} />
                <span>Dados desde {posts.length > 0 ? new Date(posts[posts.length - 1]?.post_date).toLocaleDateString() : '—'}</span>
            </footer>

            <InstagramSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
}
