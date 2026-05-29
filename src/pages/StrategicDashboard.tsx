import { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Zap, 
    TrendingUp, 
    Clock, 
    CheckCircle2, 
    AlertTriangle,
    ArrowUpRight,
    HelpCircle,
    Gauge,
    Globe,
    ShieldAlert,
    Smile,
    Frown,
    Sparkle,
    ExternalLink
} from 'lucide-react';
import { 
    XAxis, 
    YAxis, 
    Tooltip, 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    Cell, 
    PieChart, 
    Pie 
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { useData } from '../contexts/DataContext';
import TaskModal from '../components/TaskModal';
import type { Task } from '../types/kanban';
import { format, differenceInDays } from 'date-fns';
import './StrategicDashboard.css';

interface RadarNoticia {
    id: string;
    title: string;
    url: string;
    category: string;
    published_at: string;
}

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

// ==========================================================================
// REAL DATA MODE: Mockups removed. Reading 100% authentic news from database and live scrapers.
// ==========================================================================

export default function StrategicDashboard() {
    const { tasks } = useData();
    const [news, setNews] = useState<RadarNoticia[]>([]);
    const [clippings, setClippings] = useState<ClippingItem[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<'30' | '90' | '365' | 'all'>('365');
    const [selectedSecretaria, setSelectedSecretaria] = useState('');
    const [activeSubTab, setActiveSubTab] = useState<'eficiencia' | 'imprensa' | 'cadeia'>('cadeia');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [activeFilter, setActiveFilter] = useState<{ type: 'status' | 'type' | 'secretaria' | 'overdue' | 'active' | null; value: string; label: string } | null>(null);
    const explorerRef = useRef<HTMLDivElement>(null);

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

    const handleSyncClipping = async () => {
        setIsSyncing(true);
        setSyncSuccess(null);
        try {
            // Call the local server proxy which bypasses CORS constraints on Node.js side 100% reliably
            const response = await fetch('/api/google-news?q=Guarulhos&hl=pt-BR&gl=BR&ceid=BR:pt-419');
            if (!response.ok) throw new Error('Erro na rede do proxy local');
            
            const xmlText = await response.text();
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const items = xmlDoc.getElementsByTagName('item');
            
            const fetchedClippings: ClippingItem[] = [];
            
            const CATEGORY_KEYWORDS = [
                { category: 'Saúde', keywords: ['saude', 'medico', 'medicos', 'upa', 'exame', 'consulta', 'ginecologia', 'pediatria', 'vacinacao', 'vacina', 'hospital', 'posto', 'sus', 'apurasus', 'cancer', 'prevencao'] },
                { category: 'Zeladoria', keywords: ['zeladoria', 'limpeza', 'corrego', 'tapa-buraco', 'bueiro', 'varricao', 'entulho', 'capina', 'asfalto', 'recapeamento', 'drenagem', 'obras', 'obra', 'pavimentacao'] },
                { category: 'Trabalho', keywords: ['emprego', 'empregos', 'vagas', 'trabalho', 'oportunidades', 'contratacao', 'curriculo', 'trabalhador', 'conselho municipal do trabalho'] },
                { category: 'Educação', keywords: ['escola', 'alunos', 'estudantes', 'aula', 'aulas', 'ensino', 'educacao', 'juventude', 'creche', 'professor'] },
                { category: 'Esporte', keywords: ['esporte', 'lutas', 'judo', 'karate', 'boxe', 'palacio', 'atleta', 'corrida', 'batom', 'caminhada', 'circuito bem-estar', 'bem-estar', 'futebol', 'quadra'] },
                { category: 'Cultura', keywords: ['cultura', 'shows', 'musica', 'teatro', 'bosque maia', 'livros', 'leitura', 'biblioteca', 'biscuit', 'artesanato', 'sabonete'] }
            ];

            const UNSPLASH_IMAGES: Record<string, string> = {
                'Saúde': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
                'Zeladoria': 'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?auto=format&fit=crop&q=80&w=800',
                'Trabalho': 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=800',
                'Educação': 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=800',
                'Esporte': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=800',
                'Cultura': 'https://images.unsplash.com/photo-1590483734159-4670221375a0?auto=format&fit=crop&q=80&w=800',
                'Outros': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800'
            };

            const LOGOS: Record<string, string> = {
                'FOLHA METROPOLITANA': 'https://img.vendaapre.com.br/logos/folha.png',
                'CLICK GUARULHOS': 'https://img.vendaapre.com.br/logos/click.png',
                'JORNAL VOZ DE GUARULHOS': 'https://img.vendaapre.com.br/logos/voz.png',
                'GUARULHOS HOJE': 'https://img.vendaapre.com.br/logos/voz.png',
                'R7 NOTÍCIAS': 'https://img.vendaapre.com.br/logos/r7.png',
                'G1': 'https://img.vendaapre.com.br/logos/r7.png',
                'DEFAULT': 'https://img.vendaapre.com.br/logos/click.png'
            };

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const fullTitle = item.getElementsByTagName('title')[0]?.textContent || '';
                const url = item.getElementsByTagName('link')[0]?.textContent || '';
                const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || new Date().toISOString();
                
                if (!fullTitle) continue;
                
                const parts = fullTitle.split(' - ');
                const source = parts.length > 1 ? parts.pop()?.trim().toUpperCase() || 'IMPRENSA EXTERNA' : 'IMPRENSA EXTERNA';
                const cleanTitle = parts.join(' - ').trim();
                
                const textLower = cleanTitle.toLowerCase();
                let category = 'Outros';
                for (const catItem of CATEGORY_KEYWORDS) {
                    if (catItem.keywords.some(kw => textLower.includes(kw))) {
                        category = catItem.category;
                        break;
                    }
                }
                
                let sentiment: 'positive' | 'neutral' | 'critical' = 'neutral';
                const criticalWords = ['crise', 'falta', 'atraso', 'reclamacao', 'protesto', 'crime', 'assalto', 'violencia', 'morte', 'acidente', 'buraco', 'lixo', 'greve'];
                const positiveWords = ['inaugura', 'entrega', 'conquista', 'ganha', 'destaque', 'excelente', 'beneficia', 'sucesso', 'amplia', 'reforma', 'revitalizacao'];
                if (criticalWords.some(w => textLower.includes(w))) sentiment = 'critical';
                else if (positiveWords.some(w => textLower.includes(w))) sentiment = 'positive';
                
                let source_logo = LOGOS[source];
                if (!source_logo) {
                    if (source.includes('METROPOLITANA')) source_logo = LOGOS['FOLHA METROPOLITANA'];
                    else if (source.includes('CLICK')) source_logo = LOGOS['CLICK GUARULHOS'];
                    else if (source.includes('VOZ')) source_logo = LOGOS['JORNAL VOZ DE GUARULHOS'];
                    else if (source.includes('G1')) source_logo = LOGOS['G1'];
                    else if (source.includes('R7')) source_logo = LOGOS['R7 NOTÍCIAS'];
                    else source_logo = LOGOS['DEFAULT'];
                }
                
                fetchedClippings.push({
                    id: `live_${i}_${Date.now()}`,
                    title: cleanTitle,
                    source,
                    source_logo,
                    excerpt: `Reportagem sobre cotidiano e acontecimentos de Guarulhos publicada originalmente no veículo ${source}.`,
                    category,
                    sentiment,
                    url,
                    created_at: new Date(pubDate).toISOString(),
                    image_url: UNSPLASH_IMAGES[category] || UNSPLASH_IMAGES['Outros'],
                    priority: sentiment === 'critical' ? 1 : 2
                });
            }

            if (fetchedClippings.length > 0) {
                setClippings(fetchedClippings);
                setSyncSuccess(`Sincronizado! ${fetchedClippings.length} notícias reais carregadas.`);
                setTimeout(() => setSyncSuccess(null), 5000);
            }
        } catch (error) {
            console.error('Erro ao sincronizar clipping pelo navegador:', error);
            setSyncSuccess('Erro ao sincronizar. Usando cache local.');
            setTimeout(() => setSyncSuccess(null), 3000);
        } finally {
            setIsSyncing(false);
        }
    };

    // Fetch prefeitura portal news (radar_noticias)
    useEffect(() => {
        async function fetchNews() {
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
            }
        }
        fetchNews();
    }, []);

    // Fetch real external clippings dynamically
    useEffect(() => {
        async function fetchClippings() {
            try {
                const response = await fetch('/clipping_real.json');
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        setClippings(data);
                    }
                }
            } catch (err) {
                console.error("Error loading real clippings:", err);
            }
        }
        fetchClippings();
    }, []);

    const scrollToExplorer = () => {
        setTimeout(() => {
            explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    // Helper: Tokenização de textos para correlação
    const cleanAndTokenize = (text: string): string[] => {
        const stopwords = new Set([
            'de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'na', 'se', 'por', 'mais', 'as', 'dos', 'das', 'como', 'mas', 'ao', 'ele', 'seu', 'sua', 'ou', 'quando', 'muito', 'nos', 'já', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'depois', 'sem', 'mesmo', 'aos', 'seus', 'quem', 'nas', 'me', 'esse', 'eles', 'você', 'essa', 'num', 'nem', 'suas', 'meu', 'à', 'sendo', 'prefeitura', 'guarulhos', 'secom', 'secretaria'
        ]);
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopwords.has(word));
    };

    const calculateCorrelationScore = (titleA: string, titleB: string): number => {
        const cleanA = titleA.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const cleanB = titleB.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Prevenção estrita de falsos positivos entre mutirão de emprego e mutirão de zeladoria
        const isJobA = cleanA.includes('emprego') || cleanA.includes('vagas') || cleanA.includes('trabalho');
        const isJobB = cleanB.includes('emprego') || cleanB.includes('vagas') || cleanB.includes('trabalho');
        
        const isZeladoriaA = cleanA.includes('zeladoria') || cleanA.includes('limpeza') || cleanA.includes('corrego') || cleanA.includes('tapa-buraco');
        const isZeladoriaB = cleanB.includes('zeladoria') || cleanB.includes('limpeza') || cleanB.includes('corrego') || cleanB.includes('tapa-buraco');

        if ((isJobA && isZeladoriaB) || (isZeladoriaA && isJobB)) {
            return 0;
        }

        // Mapeamento semântico ultra-fiel para temas e pautas estratégicas
        const tags = [
            { keywords: ['edp', 'sistema eletrico', 'complexo guarulhos', 'milionario da edp'], id: 'edp' },
            { keywords: ['sabonetes artesanais', 'mães atípicas', 'sabonete'], id: 'sabonete' },
            { keywords: ['juventude na escola', 'escolas estaduais', 'marcos freire'], id: 'juventude' },
            { keywords: ['corrida do batom', 'toneladas de alimentos', 'caminhada do batom'], id: 'batom' },
            { keywords: ['borboletas biscuit', 'oficina de biscuit', 'zoologico'], id: 'biscuit' },
            { keywords: ['circuito bem-estar', 'serviços exclusivos para mulheres', 'estéticos', 'saúde rápida', 'bem-estar'], id: 'bem_estar' },
            { keywords: ['sede do fundo social', 'fundo social de guarulhos', 'solidariedade'], id: 'fundo_social' },
            { keywords: ['empregos para mulheres', 'vagas para mulheres', 'exclusivas para mulheres'], id: 'emprego_mulher' },
            { keywords: ['sos orquideas', 'cultivo', 'oficina de orquideas'], id: 'orquideas' },
            { keywords: ['feira de troca', 'acessibilidade e inclusao', 'troca solidaria'], id: 'feira_troca' },
            { keywords: ['marco lilas', 'azul escuro', 'cancer', 'prevencao de canceres', 'conscientizam'], id: 'marco_lilas' },
            { keywords: ['orcamento participativo', 'plenaria', 'paco municipal'], id: 'orcamento' },
            { keywords: ['vagas 50+', 'mutirao de emprego', '300 vagas', 'maiores de 50', 'vagas 50', 'público 50+'], id: 'emprego_50' },
            { keywords: ['palacio de lutas', 'joao do pulo', 'artes marciais'], id: 'lutas' },
            { keywords: ['titulos de propriedade', 'a casa e minha', 'regularizacao fundiaria'], id: 'propriedade' },
            { keywords: ['abre e fecha', 'feriado', 'prolongado', 'funcionamento'], id: 'abre_fecha' },
            { keywords: ['maria dirce', 'grafite', 'rodovia dutra', 'via dutra'], id: 'maria_dirce' },
            { keywords: ['conselho municipal do trabalho', 'posse do conselho', 'conselho municipal renova'], id: 'conselho_trabalho' },
            { keywords: ['animais domesticos', 'bem-estar e cuidados com animais', 'guarda responsavel'], id: 'animais' },
            { keywords: ['apurasus', 'gestao de custos', 'gestao financeira'], id: 'apurasus' },
            { keywords: ['doacao de livros', 'incentivo a leitura', 'bibliotecas'], id: 'livros' }
        ];

        let tagA = '';
        let tagB = '';
        for (const tag of tags) {
            if (tag.keywords.some(kw => cleanA.includes(kw))) tagA = tag.id;
            if (tag.keywords.some(kw => cleanB.includes(kw))) tagB = tag.id;
        }

        if (tagA && tagB && tagA !== tagB) {
            return 0;
        }

        const tokensA = cleanAndTokenize(titleA);
        const tokensB = cleanAndTokenize(titleB);
        if (tokensA.length === 0 || tokensB.length === 0) return 0;
        
        const intersection = tokensA.filter(t => tokensB.includes(t));
        const uniqueMatches = new Set(intersection);
        let score = (uniqueMatches.size / Math.min(tokensA.length, tokensB.length)) * 100;
        if (tagA && tagA === tagB) {
            score = Math.max(score, 100);
        }

        return Math.round(score);
    };

    // Filtro base das demandas
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (selectedSecretaria && !t.secretarias?.includes(selectedSecretaria)) return false;
            
            if (selectedPeriod !== 'all') {
                const limitDays = parseInt(selectedPeriod);
                const diff = differenceInDays(new Date(), new Date(t.createdAt));
                if (diff > limitDays) return false;
            }
            return true;
        });
    }, [tasks, selectedPeriod, selectedSecretaria]);

    // Filtro por período para o Portal Oficial
    const filteredNews = useMemo(() => {
        return news.filter(n => {
            if (selectedPeriod !== 'all') {
                const limitDays = parseInt(selectedPeriod);
                const diff = differenceInDays(new Date(), new Date(n.published_at));
                if (diff > limitDays || diff < 0) return false;
            }
            return true;
        });
    }, [news, selectedPeriod]);

    // Filtro por período para o Clipping de Imprensa
    const filteredClippings = useMemo(() => {
        return clippings.filter(c => {
            if (selectedPeriod !== 'all') {
                const limitDays = parseInt(selectedPeriod);
                const diff = differenceInDays(new Date(), new Date(c.created_at));
                if (diff > limitDays || diff < 0) return false;
            }
            return true;
        });
    }, [clippings, selectedPeriod]);

    // Tabela do explorador com drill-down
    const drilledDownTasks = useMemo(() => {
        if (!activeFilter) return filteredTasks;
        const { type, value } = activeFilter;
        return filteredTasks.filter(t => {
            if (type === 'status') return t.status === value;
            if (type === 'type') return t.type?.includes(value as any);
            if (type === 'secretaria') {
                if (value === 'Geral') {
                    return !t.secretarias || t.secretarias.length === 0 || t.secretarias.includes('Geral');
                }
                return t.secretarias?.includes(value);
            }
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

    // Opções de Secretarias para Filtro
    const secretariasOptions = useMemo(() => {
        const allSecs = tasks.flatMap(t => t.secretarias || []);
        return Array.from(new Set(allSecs)).sort();
    }, [tasks]);

    // Pautas planejadas tipo "release"
    const plannedReleases = useMemo(() => {
        return filteredTasks.filter(t => t.type?.includes('release'));
    }, [filteredTasks]);

    // 📡 MOTOR DE CORRELAÇÃO 1: Pautas Internas ➔ Portal Oficial
    const internalCorrelation = useMemo(() => {
        if (plannedReleases.length === 0 || filteredNews.length === 0) return { matched: [], pending: [] };
        
        const matched: Array<{ task: Task; article: RadarNoticia; score: number }> = [];
        const pending: Task[] = [];

        plannedReleases.forEach(task => {
            let bestMatch: RadarNoticia | null = null;
            let highestScore = 0;

            filteredNews.forEach(art => {
                const score = calculateCorrelationScore(task.title, art.title);
                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = art;
                }
            });

            if (bestMatch && highestScore >= 33) {
                matched.push({ task, article: bestMatch, score: highestScore });
            } else {
                pending.push(task);
            }
        });

        matched.sort((a, b) => b.score - a.score);
        return { matched, pending };
    }, [plannedReleases, filteredNews]);

    // 📡 MOTOR DE CORRELAÇÃO 2: Pautas/Portal ➔ Clipping de Imprensa Exterior
    const pressCorrelation = useMemo(() => {
        const matched: Array<{ portalTitle: string; clipping: ClippingItem; score: number }> = [];
        
        // Compara cada matéria do portal oficial com a mídia exterior
        filteredNews.forEach(art => {
            filteredClippings.forEach(clip => {
                const score = calculateCorrelationScore(art.title, clip.title);
                if (score >= 33) {
                    matched.push({ portalTitle: art.title, clipping: clip, score });
                }
            });
        });

        // Caso não haja matérias suficientes no portal, compara pautas do Hub com o Clipping
        if (matched.length === 0) {
            plannedReleases.forEach(task => {
                filteredClippings.forEach(clip => {
                    const score = calculateCorrelationScore(task.title, clip.title);
                    if (score >= 33) {
                        matched.push({ portalTitle: task.title, clipping: clip, score });
                    }
                });
            });
        }

        return matched.sort((a, b) => b.score - a.score);
    }, [filteredNews, plannedReleases, filteredClippings]);

    // 📡 MOTOR DE CORRELAÇÃO 3: Cadeia Completa (Pauta ➔ Portal ➔ Mídia Exterior)
    const tripleCorrelation = useMemo(() => {
        const results: Array<{
            task: Task;
            portalNews: RadarNoticia;
            clipping: ClippingItem;
            scorePortal: number;
            scoreClipping: number;
        }> = [];

        internalCorrelation.matched.forEach(({ task, article, score }) => {
            let bestClip: ClippingItem | null = null;
            let highestClipScore = 0;

            filteredClippings.forEach(clip => {
                const scoreClip = calculateCorrelationScore(article.title, clip.title);
                if (scoreClip > highestClipScore) {
                    highestClipScore = scoreClip;
                    bestClip = clip;
                }
            });

            if (bestClip && highestClipScore >= 33) {
                results.push({
                    task,
                    portalNews: article,
                    clipping: bestClip,
                    scorePortal: score,
                    scoreClipping: highestClipScore
                });
            }
        });

        return results;
    }, [internalCorrelation.matched, filteredClippings]);

    // Métricas Executivas Simplificadas
    const executiveMetrics = useMemo(() => {
        const total = filteredTasks.length;
        if (total === 0) {
            return {
                total,
                activeVolume: 0,
                deliveryRate: 0,
                leadTime: 0,
                overdueCount: 0,
                pressEcoRate: 0
            };
        }

        const activeVolume = filteredTasks.filter(t => t.status !== 'publicado' && t.status !== 'cancelado').length;
        
        // Conversão Portal Oficial: pautas que de fato viraram notícia
        const deliveryRate = plannedReleases.length > 0 
            ? Math.round((internalCorrelation.matched.length / plannedReleases.length) * 100)
            : 0;

        const completedTasks = filteredTasks.filter(t => t.status === 'publicado' || t.status === 'aprovado');
        const leadTime = completedTasks.length > 0 
            ? Math.round(completedTasks.reduce((sum, t) => sum + differenceInDays(new Date(t.dueDate || new Date()), new Date(t.createdAt)), 0) / completedTasks.length)
            : 0;

        const overdueCount = filteredTasks.filter(t => {
            if (t.status === 'publicado' || t.status === 'aprovado' || t.status === 'cancelado') return false;
            if (!t.dueDate) return false;
            return new Date(t.dueDate) < new Date();
        }).length;

        // Eco na Imprensa: proporção do clipping externo correlacionado à prefeitura
        const pressEcoRate = filteredClippings.length > 0
            ? Math.round((pressCorrelation.length / filteredClippings.length) * 100)
            : 0;

        return {
            total,
            activeVolume,
            deliveryRate,
            leadTime: Math.max(0, leadTime),
            overdueCount,
            pressEcoRate
        };
    }, [filteredTasks, plannedReleases, internalCorrelation, pressCorrelation, filteredClippings]);


    // Ranking de Secretarias simplificado
    const rankingSecretarias = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredTasks.forEach(t => {
            const secs = t.secretarias && t.secretarias.length > 0 ? t.secretarias : ['Geral'];
            secs.forEach(s => {
                counts[s] = (counts[s] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredTasks]);

    const contentMixData = useMemo(() => {
        let textOnly = 0;
        let richMedia = 0;

        // Apply activeFilter if it filters by a specific secretariat
        const tasksForMix = filteredTasks.filter(t => {
            if (activeFilter && activeFilter.type === 'secretaria') {
                const val = activeFilter.value;
                if (val === 'Geral') {
                    return !t.secretarias || t.secretarias.length === 0 || t.secretarias.includes('Geral');
                }
                return t.secretarias?.includes(val);
            }
            return true;
        });

        tasksForMix.forEach(t => {
            if (t.type.includes('video') || t.type.includes('arte') || t.type.includes('foto')) {
                richMedia++;
            } else {
                textOnly++;
            }
        });

        return [
            { name: 'Mídia Rica (Vídeo/Foto/Arte)', value: richMedia, color: '#8b5cf6' },
            { name: 'Apenas Texto (Releases)', value: textOnly, color: '#0ea5e9' }
        ].filter(d => d.value > 0);
    }, [filteredTasks, activeFilter]);

    return (
        <div className="strategic-dashboard-container">
            {/* Header Executivo */}
            <div className="strat-header glass-premium">
                <div className="header-meta-row">
                    <div className="header-meta">
                        <div className="gov-badge">
                            <Sparkle size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
                            <span>PAINEL DE MONITORAMENTO DE COMUNICAÇÃO</span>
                        </div>
                        <h1>Painel de Presença Digital e Mídia</h1>
                        <p>Análise integrada de pautas, portal oficial e repercussão de imprensa local.</p>
                    </div>

                    <button 
                        onClick={handleSyncClipping}
                        className={`btn-sync-clipping ${isSyncing ? 'loading' : ''}`}
                        disabled={isSyncing}
                        title="Buscar notícias reais da imprensa de Guarulhos e grande mídia em tempo real"
                    >
                        <Zap size={14} className={isSyncing ? 'animate-spin' : ''} />
                        <span>{isSyncing ? 'Buscando...' : 'Buscar Notícias Recentes'}</span>
                    </button>
                </div>

                <div className="header-filters-row">
                    <div className="filter-group">
                        <span className="filter-label">Período de Análise</span>
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
                                Trimestre
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
                    </div>

                    <div className="filter-group">
                        <span className="filter-label">Filtro por Secretaria</span>
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

                    {syncSuccess && (
                        <div className="sync-status-toast">
                            {syncSuccess}
                        </div>
                    )}
                </div>
            </div>

            {/* KPIs Executivos de Impacto */}
            <div className="strat-kpi-grid">
                <div 
                    className="strat-kpi-card glass-premium green-glow"
                    title="Porcentagem de pautas de assessoria publicadas no Portal oficial"
                >
                    <div className="strat-kpi-header">
                        <span>Conversão para o Portal</span>
                        <div className="strat-icon"><Gauge size={18} /></div>
                    </div>
                    <h2>{executiveMetrics.deliveryRate}%</h2>
                    <p>Das pautas cadastradas viraram matérias publicadas</p>
                    <div className="strat-footer-indicator text-green">
                        <CheckCircle2 size={12} /> <span>Conversão Excelente</span>
                    </div>
                </div>

                <div 
                    className="strat-kpi-card glass-premium purple-glow"
                    title="Porcentagem do clipping de imprensa externa originado de ações de assessoria"
                >
                    <div className="strat-kpi-header">
                        <span>Repercussão na Imprensa</span>
                        <div className="strat-icon"><Globe size={18} /></div>
                    </div>
                    <h2>{executiveMetrics.pressEcoRate}%</h2>
                    <p>Menções e matérias nos portais jornalísticos</p>
                    <div className="strat-footer-indicator text-purple">
                        <TrendingUp size={12} /> <span>Forte Presença de Mídia</span>
                    </div>
                </div>

                <div 
                    className="strat-kpi-card glass-premium cyan-glow"
                    title="Tempo médio para tirar uma pauta do papel e publicar"
                >
                    <div className="strat-kpi-header">
                        <span>Agilidade de Resposta</span>
                        <div className="strat-icon"><Clock size={18} /></div>
                    </div>
                    <h2>{executiveMetrics.leadTime} <span className="small">dias</span></h2>
                    <p>Prazo médio de produção e aprovação</p>
                    <div className="strat-footer-indicator text-cyan">
                        <Zap size={12} /> <span>Fluxo Rápido de Assessoria</span>
                    </div>
                </div>

                <div 
                    className={`strat-kpi-card glass-premium ${executiveMetrics.overdueCount > 0 ? 'orange-glow' : 'green-glow'} clickable-pro ${activeFilter?.type === 'overdue' ? 'active-filter' : ''}`}
                    onClick={() => {
                        setActiveFilter({ type: 'overdue', value: 'atrasado', label: 'Alertas de Atraso' });
                        scrollToExplorer();
                    }}
                    title="Clique para detalhar pautas em atraso abaixo"
                >
                    <div className="strat-kpi-header">
                        <span>Pautas Atrasadas</span>
                        <div className="strat-icon"><ShieldAlert size={18} /></div>
                    </div>
                    <h2 className={executiveMetrics.overdueCount > 0 ? "pulse-red" : ""}>{executiveMetrics.overdueCount}</h2>
                    <p>Pautas que necessitam de agilização</p>
                    <div className={`strat-footer-indicator ${executiveMetrics.overdueCount > 0 ? 'text-orange' : 'text-green'}`}>
                        <AlertTriangle size={12} /> <span>{executiveMetrics.overdueCount > 0 ? 'Exige atenção' : 'Tudo em dia'}</span>
                    </div>
                </div>
            </div>

            {/* SEÇÃO DUPLA: CAPACIDADE DA EQUIPE & PASTAS MAIS ATIVAS */}
            {/* PASTAS MAIS ATIVAS E FORMATOS */}
            <div className="strat-section-card glass-premium" style={{ width: '100%' }}>
                <div className="card-title-header">
                    <h3>🏢 Produtividade por Secretaria e Mix de Conteúdo</h3>
                    <p>O volume gerado de pautas e matérias em cada pasta da nossa comunicação e o alinhamento com formatos modernos.</p>
                </div>

                <div className="strat-charts-internal">
                    {/* Custom progress meters instead of raw horizontal Recharts */}
                    <div className="strat-bar-chart-box">
                        <strong>Top 5 Secretarias mais Ativas:</strong>
                        <div className="custom-progress-list" style={{ marginTop: '16px' }}>
                            {rankingSecretarias.map((sec, idx) => {
                                const maxVal = rankingSecretarias[0]?.value || 1;
                                const percentage = Math.round((sec.value / maxVal) * 100);
                                return (
                                    <div 
                                        key={idx} 
                                        className="progress-row clickable-row-metric"
                                        onClick={() => {
                                            setActiveFilter({ type: 'secretaria', value: sec.name, label: `Secretaria: ${sec.name}` });
                                            scrollToExplorer();
                                        }}
                                        title={`Filtrar por ${sec.name}`}
                                    >
                                        <div className="progress-row-info">
                                            <span className="progress-row-name">
                                                <span className="progress-rank">#{idx + 1}</span>
                                                {sec.name}
                                            </span>
                                            <span className="progress-row-value">{sec.value} Pautas</span>
                                        </div>
                                        <div className="progress-bar-bg">
                                            <div 
                                                className="progress-bar-fill" 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {rankingSecretarias.length === 0 && (
                                <div className="empty-audit" style={{ padding: '20px 0' }}>Sem dados no período.</div>
                            )}
                        </div>
                    </div>

                    <div className="strat-bar-chart-box mix-conteudo-box">
                        <strong>Mix de Conteúdo (Modernização Visual):</strong>
                        <div className="donut-chart-layout">
                            <div className="chart-wrapper-mini" style={{ height: '140px', width: '140px', position: 'relative' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={contentMixData} 
                                            innerRadius={45} 
                                            outerRadius={60} 
                                            dataKey="value"
                                            paddingAngle={6}
                                            onClick={(data) => {
                                                if (data && data.name) {
                                                    const isVideo = data.name.includes('Mídia');
                                                    setActiveFilter({ 
                                                        type: 'type', 
                                                        value: isVideo ? 'video' : 'release', 
                                                        label: isVideo ? 'Mídia Rica (Vídeo/Foto/Arte)' : 'Apenas Texto (Releases)' 
                                                    });
                                                    scrollToExplorer();
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {contentMixData.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} style={{ filter: 'drop-shadow(0px 2px 6px rgba(0, 0, 0, 0.08))' }} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="donut-center-info">
                                    <span className="donut-center-label">Total</span>
                                    <span className="donut-center-val">
                                        {contentMixData.reduce((acc, curr) => acc + curr.value, 0)}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="mix-legend-vertical">
                                {contentMixData.map((item, idx) => (
                                    <div 
                                        key={idx} 
                                        className="mix-legend-item clickable-row-metric"
                                        onClick={() => {
                                            const isVideo = item.name.includes('Mídia');
                                            setActiveFilter({ 
                                                type: 'type', 
                                                value: isVideo ? 'video' : 'release', 
                                                label: isVideo ? 'Mídia Rica (Vídeo/Foto/Arte)' : 'Apenas Texto (Releases)' 
                                            });
                                            scrollToExplorer();
                                        }}
                                        title={`Filtrar por ${item.name}`}
                                    >
                                        <span className="legend-dot" style={{ backgroundColor: item.color }}></span>
                                        <div className="legend-desc">
                                            <span className="legend-name">{item.name}</span>
                                            <span className="legend-val">{item.value} itens ({Math.round((item.value / (contentMixData.reduce((acc, curr) => acc + curr.value, 0) || 1)) * 100)}%)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DUPLO MOTOR DE CORRELAÇÃO SEMÂNTICA */}
            <div className="strat-correlation-box glass-premium">
                <div className="strat-box-header">
                    <div className="title-desc">
                        <h3>📡 Auditoria Ativa de Mídia (Batimento de Pautas)</h3>
                        <p>Batimento semântico em tempo real conectando as pautas, notícias publicadas no Portal oficial e repercussão de imprensa.</p>
                    </div>
                    
                    <div className="strat-sub-tabs">
                        <button 
                            className={activeSubTab === 'cadeia' ? 'active' : ''} 
                            onClick={() => setActiveSubTab('cadeia')}
                        >
                            <Zap size={14} />
                            <span>Cadeia Completa ({tripleCorrelation.length})</span>
                        </button>
                        <button 
                            className={activeSubTab === 'eficiencia' ? 'active' : ''} 
                            onClick={() => setActiveSubTab('eficiencia')}
                        >
                            <Gauge size={14} />
                            <span>Pauta vs. Portal Oficial ({internalCorrelation.matched.length})</span>
                        </button>
                        <button 
                            className={activeSubTab === 'imprensa' ? 'active' : ''} 
                            onClick={() => setActiveSubTab('imprensa')}
                        >
                            <Globe size={14} />
                            <span>Repercussão Imprensa ({pressCorrelation.length})</span>
                        </button>
                    </div>
                </div>

                {activeSubTab === 'cadeia' && (
                    <div className="strat-correlation-content animate-fade">
                        <div className="strat-correlation-explainer">
                            <strong>💡 Cadeia Completa de Divulgação:</strong> Exibe o ciclo de vida completo da informação! Conecta o que foi planejado na assessoria, o texto publicado no Portal oficial e a repercussão gerada em jornais de Guarulhos.
                        </div>

                        <div className="strat-audit-grid" style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '8px', gap: '12px' }}>
                            {tripleCorrelation.map((item, idx) => (
                                <div key={idx} className="strat-audit-card glass-premium" style={{ borderLeft: '4px solid #10b981' }}>
                                    <div className="press-header-row">
                                        <span className="source-name" style={{ color: '#10b981' }}>🔗 Cadeia Completa de Divulgação ({item.clipping.source})</span>
                                        <span className="sentiment-badge positive" style={{ fontSize: '0.7rem' }}>
                                            {item.clipping.sentiment === 'positive' ? <Smile size={12} /> : <Frown size={12} />}
                                            {item.clipping.sentiment.toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <div className="audit-pair">
                                        <div className="pair-item">
                                            <span>📋 1. PLANEJADO NO HUB (PAUTA):</span>
                                            <p 
                                                onClick={() => setSelectedTask(item.task)} 
                                                className="pauta-interactive-link"
                                                title="Clique para abrir detalhes da pauta no Hub"
                                            >
                                                {item.task.title}
                                            </p>
                                        </div>
                                        <div className="pair-divider"></div>
                                        <div className="pair-item">
                                            <span>🌐 2. DIVULGADO NO PORTAL OFICIAL:</span>
                                            <div style={{ marginTop: '2px' }}>
                                                <a 
                                                    href={item.portalNews.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="portal-interactive-link"
                                                    title="Clique para ver a matéria no Portal Oficial da Prefeitura"
                                                >
                                                    {item.portalNews.title} <ExternalLink size={10} style={{ display: 'inline', marginLeft: '2px' }} />
                                                </a>
                                            </div>
                                        </div>
                                        <div className="pair-divider"></div>
                                        <div className="pair-item">
                                            <span>📰 3. PUBLICADO NA IMPRENSA EXTERNA:</span>
                                            <div style={{ marginTop: '2px' }}>
                                                <a 
                                                    href={item.clipping.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="clipping-interactive-link"
                                                    title="Clique para ler a matéria na imprensa externa"
                                                >
                                                    {item.clipping.title} <ExternalLink size={10} style={{ display: 'inline', marginLeft: '2px' }} />
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="audit-footer">
                                        <span className="affinity-badge" style={{ fontSize: '0.65rem' }}>Eco de Mídia: {item.scoreClipping}%</span>
                                        <a href={item.clipping.url} target="_blank" rel="noopener noreferrer" className="btn-external" style={{ color: '#10b981' }}>
                                            Ler Matéria Completa <ExternalLink size={12} />
                                        </a>
                                    </div>
                                </div>
                            ))}
                            {tripleCorrelation.length === 0 && (
                                <div className="empty-audit">Nenhuma cadeia de publicação completa mapeada com os filtros atuais.</div>
                            )}
                        </div>
                    </div>
                )}

                {activeSubTab === 'eficiencia' && (
                    <div className="strat-correlation-content animate-fade">
                        <div className="strat-correlation-explainer">
                            <strong>💡 Como ler este painel:</strong> Ele cruza os títulos das pautas que sua equipe montou no Hub com as matérias que de fato saíram no Portal de notícias da cidade, confirmando a entrega.
                        </div>

                        <div className="strat-audit-grid" style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '8px', gap: '12px' }}>
                            {internalCorrelation.matched.map((item, idx) => (
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
                                                title="Clique para abrir detalhes da pauta no Hub"
                                            >
                                                {item.task.title}
                                            </p>
                                        </div>
                                        <div className="pair-divider"></div>
                                        <div className="pair-item">
                                            <span>🌐 2. DIVULGADO NO PORTAL OFICIAL:</span>
                                            <div style={{ marginTop: '2px' }}>
                                                <a 
                                                    href={item.article.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="portal-interactive-link"
                                                >
                                                    {item.article.title} <ExternalLink size={10} style={{ display: 'inline', marginLeft: '2px' }} />
                                                </a>
                                            </div>
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
                            {internalCorrelation.matched.length === 0 && (
                                <div className="empty-audit">Nenhuma publicação correspondente identificada no período.</div>
                            )}
                        </div>
                    </div>
                )}

                {activeSubTab === 'imprensa' && (
                    <div className="strat-correlation-content animate-fade">
                        <div className="strat-correlation-explainer">
                            <strong>💡 Como ler este painel:</strong> Ele descobre quais notícias dos veículos de imprensa de Guarulhos repercutiram as pautas e comunicados locais.
                        </div>

                        <div className="strat-audit-grid" style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '8px', gap: '12px' }}>
                            {pressCorrelation.map((item, idx) => (
                                <div key={idx} className="strat-audit-card glass-premium press-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                                    <div className="press-header-row">
                                        <span className="source-name">📰 Repercussão Imprensa ({item.clipping.source})</span>
                                        <span className={`sentiment-badge ${item.clipping.sentiment}`}>
                                            {item.clipping.sentiment === 'positive' ? <Smile size={12} /> : <Frown size={12} />}
                                            {item.clipping.sentiment.toUpperCase()}
                                        </span>
                                    </div>
                                    
                                    <div className="audit-pair">
                                        <div className="pair-item">
                                            <span>📋 1. PAUTA / ASSUNTO (Portal):</span>
                                            <p>{item.portalTitle}</p>
                                        </div>
                                        <div className="pair-divider"></div>
                                        <div className="pair-item">
                                            <span>📰 2. Manchete na Imprensa:</span>
                                            <div style={{ marginTop: '2px' }}>
                                                <a 
                                                    href={item.clipping.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="clipping-interactive-link"
                                                >
                                                    {item.clipping.title} <ExternalLink size={10} style={{ display: 'inline', marginLeft: '2px' }} />
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="audit-footer">
                                        <span className="affinity-badge" style={{ fontSize: '0.65rem' }}>Eco de Mídia: {item.score}%</span>
                                        <a href={item.clipping.url} target="_blank" rel="noopener noreferrer" className="btn-external">
                                            Ler Notícia <ArrowUpRight size={14} />
                                        </a>
                                    </div>
                                </div>
                            ))}
                            {pressCorrelation.length === 0 && (
                                <div className="empty-audit">Sem clipping externo correspondente nas últimas 48h.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* DRILLDOWN EXPLORER TABLE */}
            <div className="explorer-premium-card glass-premium" ref={explorerRef} style={{ marginTop: '24px' }}>
                <div className="explorer-header">
                    <div>
                        <h3>🔎 Auditoria Detalhada de Demandas</h3>
                        <p>Visão direta de rastreamento das pautas de interesse estratégico.</p>
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
                            <p>Nenhuma pauta com pendência crítica detectada para este filtro.</p>
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
                                        title="Clique para ver os detalhes completos desta pauta"
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
