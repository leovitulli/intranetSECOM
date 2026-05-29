import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
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
    ChevronUp,
    Download,
    TrendingUp,
    Clock,
    AlertTriangle,
    Gauge,
    Globe,
    ShieldAlert,
    Smile,
    Frown,
    HelpCircle,
    BarChart3
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useRadarNoticias, type FilterParams, type RadarNoticia } from '../hooks/useRadarNoticias';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import RadarReportModal from '../components/RadarReportModal';
import { useData } from '../contexts/DataContext';
import TaskModal from '../components/TaskModal';
import type { Task } from '../types/kanban';
import { differenceInDays } from 'date-fns';
import { normalizeText } from '../utils/searchUtils';
import './RadarNoticias.css';
import './DashboardV3.css';
import './StrategicDashboard.css';

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

type Period = '7d' | '30d' | '90d' | '2025' | 'all' | 'custom';

export default function RadarNoticias() {
    const { user } = useAuth();
    
    // Tab Controller
    const [activeTab, setActiveTab] = useState<'estrategico' | 'radar'>('estrategico');
    
    // Simplified Filter Period states (Defaults to ALL)
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    
    // Radar Tab specific filters
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedEntregaType, setSelectedEntregaType] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<{ type: string; value: string } | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncSuccess, setSyncSuccess] = useState(false);
    const [fullSyncing, setFullSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [displayLimit, setDisplayLimit] = useState(150);
    const tableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setDisplayLimit(150);
    }, [searchQuery, customStartDate, customEndDate, selectedCategory, selectedEntregaType, activeFilter]);

    // Strategic Tab specific states & references
    const { tasks, updateTask } = useData();
    const handleUpdateTask = (updatedTask: Task) => {
        updateTask(updatedTask);
        setSelectedTaskModal(null);
    };
    const [clippings, setClippings] = useState<ClippingItem[]>([]);
    const [selectedSecretaria, setSelectedSecretaria] = useState('');
    const [activeSubTab, setActiveSubTab] = useState<'eficiencia' | 'imprensa' | 'cadeia'>('cadeia');
    const [selectedTaskModal, setSelectedTaskModal] = useState<Task | null>(null);
    const [activeFilterPro, setActiveFilterPro] = useState<{ type: 'status' | 'type' | 'secretaria' | 'overdue' | 'active' | null; value: string; label: string } | null>(null);
    const [isSyncingClipping, setIsSyncingClipping] = useState(false);
    const [syncClippingSuccess, setSyncClippingSuccess] = useState<string | null>(null);
    const explorerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeFilter && tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [activeFilter]);

    // Simplified dynamic filters (if fields are blank, queries ALL records - TUDO)
    const filters = useMemo((): FilterParams => {
        const baseFilters: FilterParams = {};
        if (customStartDate) baseFilters.startDate = new Date(customStartDate + 'T00:00:00Z').toISOString();
        if (customEndDate) baseFilters.endDate = new Date(customEndDate + 'T23:59:59Z').toISOString();
        if (selectedCategory) baseFilters.category = selectedCategory;
        if (selectedEntregaType) baseFilters.entregaType = selectedEntregaType;
        return baseFilters;
    }, [selectedCategory, selectedEntregaType, customStartDate, customEndDate]);

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

    // ==========================================================================
    // STRATEGIC DATA PROCESSORS & MUTUAL CORRELATIONS
    // ==========================================================================
    // Fetch real external clippings dynamically
    useEffect(() => {
        async function fetchClippings() {
            try {
                const response = await fetch('/clipping_real.json');
                if (response.ok) {
                    const json = await response.json();
                    if (json && json.length > 0) {
                        setClippings(json);
                    }
                }
            } catch (err) {
                console.error("Error loading real clippings:", err);
            }
        }
        fetchClippings();
    }, []);

    // Scraping trigger for clippings
    const handleSyncClipping = async () => {
        setIsSyncingClipping(true);
        setSyncClippingSuccess(null);
        try {
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
                setSyncClippingSuccess(`Sincronizado! ${fetchedClippings.length} notícias de imprensa carregadas.`);
                setTimeout(() => setSyncClippingSuccess(null), 5000);
            }
        } catch (error) {
            console.error('Error syncing clipping:', error);
            setSyncClippingSuccess('Erro ao sincronizar. Usando cache local.');
            setTimeout(() => setSyncClippingSuccess(null), 3000);
        } finally {
            setIsSyncingClipping(false);
        }
    };

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
        const isJobA = cleanA.includes('emprego') || cleanA.includes('vagas') || cleanA.includes('trabalho');
        const isJobB = cleanB.includes('emprego') || cleanB.includes('vagas') || cleanB.includes('trabalho');
        const isZeladoriaA = cleanA.includes('zeladoria') || cleanA.includes('limpeza') || cleanA.includes('corrego') || cleanA.includes('tapa-buraco');
        const isZeladoriaB = cleanB.includes('zeladoria') || cleanB.includes('limpeza') || cleanB.includes('corrego') || cleanB.includes('tapa-buraco');
        if ((isJobA && isZeladoriaB) || (isZeladoriaA && isJobB)) return 0;

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
        if (tagA && tagB && tagA !== tagB) return 0;

        const tokensA = cleanAndTokenize(titleA);
        const tokensB = cleanAndTokenize(titleB);
        if (tokensA.length === 0 || tokensB.length === 0) return 0;
        
        const intersection = tokensA.filter(t => tokensB.includes(t));
        const uniqueMatches = new Set(intersection);
        let score = (uniqueMatches.size / Math.min(tokensA.length, tokensB.length)) * 100;
        if (tagA && tagA === tagB) score = Math.max(score, 100);
        return Math.round(score);
    };

    // Filter Tasks (Strategic View) based on Period Search
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (selectedSecretaria && !t.secretarias?.includes(selectedSecretaria)) return false;
            if (customStartDate) {
                const start = new Date(customStartDate + 'T00:00:00Z');
                if (new Date(t.createdAt) < start) return false;
            }
            if (customEndDate) {
                const end = new Date(customEndDate + 'T23:59:59Z');
                if (new Date(t.createdAt) > end) return false;
            }
            return true;
        });
    }, [tasks, selectedSecretaria, customStartDate, customEndDate]);

    // Portal News (loaded from useRadarNoticias hook)
    const filteredNews = useMemo(() => {
        return data?.allNews || [];
    }, [data?.allNews]);

    // External clippings filtered by dates
    const filteredClippings = useMemo(() => {
        return clippings.filter(c => {
            if (customStartDate) {
                const start = new Date(customStartDate + 'T00:00:00Z');
                if (new Date(c.created_at) < start) return false;
            }
            if (customEndDate) {
                const end = new Date(customEndDate + 'T23:59:59Z');
                if (new Date(c.created_at) > end) return false;
            }
            return true;
        });
    }, [clippings, customStartDate, customEndDate]);

    // Drilldown explorer for tasks
    const drilledDownTasks = useMemo(() => {
        if (!activeFilterPro) return filteredTasks;
        const { type, value } = activeFilterPro;
        return filteredTasks.filter(t => {
            if (type === 'status') return t.status === value;
            if (type === 'type') return t.type?.includes(value as any);
            if (type === 'secretaria') {
                if (value === 'Geral') return !t.secretarias || t.secretarias.length === 0 || t.secretarias.includes('Geral');
                return t.secretarias?.includes(value);
            }
            if (type === 'overdue') {
                if (t.status === 'publicado' || t.status === 'aprovado' || t.status === 'cancelado') return false;
                if (!t.dueDate) return false;
                return new Date(t.dueDate) < new Date();
            }
            if (type === 'active') return t.status !== 'publicado' && t.status !== 'cancelado';
            return true;
        });
    }, [filteredTasks, activeFilterPro]);

    const secretariasOptions = useMemo(() => {
        const allSecs = tasks.flatMap(t => t.secretarias || []);
        return Array.from(new Set(allSecs)).sort();
    }, [tasks]);

    const plannedReleases = useMemo(() => {
        return filteredTasks.filter(t => t.type?.includes('release'));
    }, [filteredTasks]);

    // Correlations
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

    const pressCorrelation = useMemo(() => {
        const matched: Array<{ portalTitle: string; clipping: ClippingItem; score: number }> = [];
        filteredNews.forEach(art => {
            filteredClippings.forEach(clip => {
                const score = calculateCorrelationScore(art.title, clip.title);
                if (score >= 33) {
                    matched.push({ portalTitle: art.title, clipping: clip, score });
                }
            });
        });
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

    const executiveMetrics = useMemo(() => {
        const total = filteredTasks.length;
        if (total === 0) {
            return { total, activeVolume: 0, deliveryRate: 0, leadTime: 0, overdueCount: 0, pressEcoRate: 0 };
        }
        const activeVolume = filteredTasks.filter(t => t.status !== 'publicado' && t.status !== 'cancelado').length;
        const deliveryRate = plannedReleases.length > 0 
            ? Math.round((internalCorrelation.matched.length / plannedReleases.length) * 100)
            : 0;
        const completedTasks = filteredTasks.filter(t => t.status === 'publicado' || t.status === 'aprovado');
        const leadTime = completedTasks.length > 0 
            ? Math.round(completedTasks.reduce((acc, t) => {
                const diff = differenceInDays(new Date(t.dueDate || new Date()), new Date(t.createdAt));
                return acc + Math.max(diff, 1);
              }, 0) / completedTasks.length)
            : 0;
        const overdueCount = filteredTasks.filter(t => {
            if (t.status === 'publicado' || t.status === 'aprovado' || t.status === 'cancelado') return false;
            if (!t.dueDate) return false;
            return new Date(t.dueDate) < new Date();
        }).length;
        const pressEcoRate = filteredNews.length > 0 
            ? Math.round((pressCorrelation.length / filteredNews.length) * 100)
            : 0;
        return { total, activeVolume, deliveryRate, leadTime, overdueCount, pressEcoRate };
    }, [filteredTasks, plannedReleases, internalCorrelation, pressCorrelation, filteredNews]);

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
        const tasksForMix = filteredTasks.filter(t => {
            if (activeFilterPro && activeFilterPro.type === 'secretaria') {
                const val = activeFilterPro.value;
                if (val === 'Geral') return !t.secretarias || t.secretarias.length === 0 || t.secretarias.includes('Geral');
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
    }, [filteredTasks, activeFilterPro]);

    const scrollToExplorer = () => {
        setTimeout(() => {
            explorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

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
        const monthMap = new Map<string, number>();

        filtered.forEach(n => {
            if (n.published_at) {
                const date = parseISO(n.published_at);
                const year = date.getFullYear();
                yearMap.set(year, (yearMap.get(year) || 0) + 1);

                const m = format(date, 'MMM/yyyy', { locale: ptBR });
                monthMap.set(m, (monthMap.get(m) || 0) + 1);
            }
        });
        const byYear = Array.from(yearMap.entries())
            .map(([year, count]) => ({ year, count }))
            .sort((a, b) => a.year - b.year);

        const byMonth = Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }));
        const mediaMensal = byMonth.length > 0 ? Math.round(filtered.length / byMonth.length) : filtered.length;

        return {
            news: filtered,
            byCategory,
            deliveries,
            byYear,
            byMonth,
            mediaMensal,
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
        <div className="dashboard-container dashboard-v3-root hub-radar-container">
            {loading && (
                <>
                    <div className="loading-progress-overlay">
                        <div className="loading-progress-bar" style={{ width: '100%' }}></div>
                    </div>
                    <div className="reloading-glass-overlay">
                        <div className="reloading-spinner-box">
                            <div className="aura-loading-circle"></div>
                            <span className="loading-sub-text">
                                {fetchedCount > 0 ? `Atualizando dados (${fetchedCount.toLocaleString()})...` : 'Carregando informações...'}
                            </span>
                        </div>
                    </div>
                </>
            )}
            <header className="page-header dashboard-header-premium glass">
                <div>
                    <h1 className="title text-gradient">Notícias & Painel Estratégico</h1>
                    <p className="subtitle">Monitoramento de canais oficiais, pautas planejadas e repercussão de imprensa</p>
                </div>
                <div className="header-actions-premium" style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {activeTab === 'radar' && (
                        <>
                            <div className="radar-search-wrapper-header">
                                <Search size={16} style={{ color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar nos registros..."
                                    className="radar-search-input-header"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            
                            <button
                                className="btn-secondary-v3"
                                onClick={() => setReportModalOpen(true)}
                                title="Exportar Relatório PDF / Imprimir"
                                disabled={!filteredAnalytics || filteredAnalytics.news.length === 0}
                            >
                                <Download size={16} />
                                Gerar Relatório
                            </button>

                            {data && data.totalCount > 0 && (
                                <button
                                    className="btn-secondary-v3 full-sync-btn"
                                    onClick={handleFullSync}
                                    disabled={fullSyncing}
                                    title="Sincronizar todas as páginas do site"
                                >
                                    <RefreshCw size={16} className={fullSyncing ? 'animate-spin' : ''} />
                                    {fullSyncing ? 'Sincronizando Tudo...' : 'Sync Completo'}
                                </button>
                            )}
                            <button
                                className={`btn-primary-v3 ${syncing ? 'syncing' : ''} ${syncSuccess ? 'success' : ''}`}
                                onClick={handleSync}
                                disabled={syncing}
                            >
                                {syncing ? <RefreshCw className="animate-spin" size={16} /> :
                                 syncSuccess ? <CheckCircle2 size={16} /> : <RefreshCw size={16} />}
                                {syncing ? 'Sincronizando...' : syncSuccess ? 'Sucesso!' : 'Atualizar Recentes'}
                            </button>
                        </>
                    )}

                    {activeTab === 'estrategico' && (
                        <button
                            className={`btn-primary-v3 ${isSyncingClipping ? 'syncing' : ''}`}
                            onClick={handleSyncClipping}
                            disabled={isSyncingClipping}
                        >
                            <RefreshCw className={isSyncingClipping ? 'animate-spin' : ''} size={16} />
                            {isSyncingClipping ? 'Sincronizando Clipping...' : 'Sync Imprensa Externa'}
                        </button>
                    )}
                </div>
            </header>

            {/* TAB SELECTOR */}
            <div className="v3-view-toggle" style={{ alignSelf: 'flex-start', margin: '0 0 0.5rem 0' }}>
                <button 
                    className={`toggle-btn ${activeTab === 'estrategico' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('estrategico'); setActiveFilter(null); setActiveFilterPro(null); }}
                >
                    <BarChart3 size={16} />
                    Painel Estratégico
                </button>
                <button 
                    className={`toggle-btn ${activeTab === 'radar' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('radar'); setActiveFilter(null); setActiveFilterPro(null); }}
                >
                    <Zap size={16} />
                    Radar de Notícias SECOM
                </button>
            </div>

            {/* MINIMALIST DATE FILTER BAR */}
            <div className="radar-tactical-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'rgba(255,255,255,0.6)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', backdropFilter: 'blur(10px)', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="selector-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>
                        <Calendar size={15} /> PERÍODO DE PESQUISA:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>De</span>
                        <input 
                            type="date" 
                            className="radar-select premium-date-picker" 
                            style={{ border: 'none', background: 'transparent', padding: '0', cursor: 'pointer', outline: 'none', fontWeight: 600, color: '#1e3a8a', fontSize: '0.8rem' }} 
                            value={customStartDate} 
                            onChange={e => setCustomStartDate(e.target.value)} 
                            title="Data Inicial"
                        />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Até</span>
                        <input 
                            type="date" 
                            className="radar-select premium-date-picker" 
                            style={{ border: 'none', background: 'transparent', padding: '0', cursor: 'pointer', outline: 'none', fontWeight: 600, color: '#1e3a8a', fontSize: '0.8rem' }} 
                            value={customEndDate} 
                            onChange={e => setCustomEndDate(e.target.value)} 
                            title="Data Final"
                        />
                        {(customStartDate || customEndDate) && (
                            <button 
                                onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }} 
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', marginLeft: '0.25rem', padding: '0 4px' }}
                                title="Limpar Filtro de Período (Mostrar Tudo)"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                <div className="filter-selectors" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {activeTab === 'radar' ? (
                        <>
                            <select value={activeFilter?.type === 'category' ? activeFilter.value : selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setActiveFilter(null); }} className="radar-select" style={{ minWidth: 160 }}>
                                <option value="">Todas as Secretarias</option>
                                {data?.categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <select value={activeFilter?.type === 'entrega' ? activeFilter.value : selectedEntregaType} onChange={e => { setSelectedEntregaType(e.target.value); setActiveFilter(null); }} className="radar-select" style={{ minWidth: 140 }}>
                                <option value="">Todos os Tipos</option>
                                <option value="reforma">Reforma</option>
                                <option value="revitalizacao">Revitalização</option>
                                <option value="recapeamento">Recapeamento</option>
                                <option value="inauguracao">Inauguração</option>
                                <option value="insumos">Insumos</option>
                            </select>
                        </>
                    ) : (
                        <select 
                            value={selectedSecretaria} 
                            onChange={(e) => { setSelectedSecretaria(e.target.value); setActiveFilterPro(null); }}
                            className="radar-select"
                            style={{ minWidth: 180 }}
                        >
                            <option value="">Todas as Secretarias</option>
                            {secretariasOptions.map(sec => (
                                <option key={sec} value={sec}>{sec}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {error && (
                <div className="radar-error-banner">
                    <AlertCircle size={20} />
                    <span>Erro: {error}</span>
                </div>
            )}

            {syncClippingSuccess && (
                <div className="sync-status-toast" style={{ margin: '0.5rem 0', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.75rem 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
                    {syncClippingSuccess}
                </div>
            )}

            {/* TAB 1: STRATEGIC VIEW */}
            {activeTab === 'estrategico' && (
                <div className="strategic-dashboard-view animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* KPIs Executivos */}
                    <div className="strat-kpi-grid">
                        <div className="strat-kpi-card glass-premium green-glow" title="Porcentagem de pautas de assessoria publicadas no Portal oficial">
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

                        <div className="strat-kpi-card glass-premium purple-glow" title="Porcentagem do clipping de imprensa externa originado de ações de assessoria">
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

                        <div className="strat-kpi-card glass-premium cyan-glow" title="Tempo médio para tirar uma pauta do papel e publicar">
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
                            className={`strat-kpi-card glass-premium ${executiveMetrics.overdueCount > 0 ? 'orange-glow' : 'green-glow'} clickable-pro ${activeFilterPro?.type === 'overdue' ? 'active-filter' : ''}`}
                            onClick={() => {
                                setActiveFilterPro({ type: 'overdue', value: 'atrasado', label: 'Alertas de Atraso' });
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

                    {/* TOP SECRETARIAS & MIX GRAPHICS */}
                    <div className="strat-section-card glass-premium" style={{ width: '100%' }}>
                        <div className="card-title-header">
                            <h3>🏢 Produtividade por Secretaria e Mix de Conteúdo</h3>
                            <p>Volume gerado no período selecionado e o alinhamento com formatos de comunicação visual modernos.</p>
                        </div>
                        <div className="strat-charts-internal">
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
                                                    setActiveFilterPro({ type: 'secretaria', value: sec.name, label: `Secretaria: ${sec.name}` });
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
                                                    <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {rankingSecretarias.length === 0 && (
                                        <div className="empty-audit" style={{ padding: '20px 0' }}>Sem dados no período filtrado.</div>
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
                                                            setActiveFilterPro({ 
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
                                                    setActiveFilterPro({ 
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

                    {/* DYNAMIC CORRELATION SHIFT (AUDITORIA ATIVA DE MÍDIA) */}
                    <div className="strat-correlation-box glass-premium">
                        <div className="strat-box-header">
                            <div className="title-desc">
                                <h3>📡 Auditoria Ativa de Mídia (Batimento de Pautas)</h3>
                                <p>Batimento inteligente em tempo real cruzando pautas planejadas, releases publicados e repercussão em jornais.</p>
                            </div>
                            <div className="strat-sub-tabs">
                                <button className={activeSubTab === 'cadeia' ? 'active' : ''} onClick={() => setActiveSubTab('cadeia')}>
                                    <Zap size={14} />
                                    <span>Cadeia Completa ({tripleCorrelation.length})</span>
                                </button>
                                <button className={activeSubTab === 'eficiencia' ? 'active' : ''} onClick={() => setActiveSubTab('eficiencia')}>
                                    <Gauge size={14} />
                                    <span>Pauta vs. Portal Oficial ({internalCorrelation.matched.length})</span>
                                </button>
                                <button className={activeSubTab === 'imprensa' ? 'active' : ''} onClick={() => setActiveSubTab('imprensa')}>
                                    <Globe size={14} />
                                    <span>Repercussão Imprensa ({pressCorrelation.length})</span>
                                </button>
                            </div>
                        </div>

                        {activeSubTab === 'cadeia' && (
                            <div className="strat-correlation-content animate-fade">
                                <div className="strat-correlation-explainer">
                                    <strong>💡 Cadeia Completa de Divulgação:</strong> Rastreia o ciclo completo! Conecta a pauta da equipe de assessoria, a matéria lançada no Portal municipal oficial e a publicação na imprensa local exterior.
                                </div>
                                <div className="strat-audit-grid" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '8px', gap: '12px' }}>
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
                                                    <p onClick={() => setSelectedTaskModal(item.task)} className="pauta-interactive-link" title="Clique para abrir detalhes da pauta">
                                                        {item.task.title}
                                                    </p>
                                                </div>
                                                <div className="pair-divider"></div>
                                                <div className="pair-item">
                                                    <span>🌐 2. DIVULGADO NO PORTAL OFICIAL:</span>
                                                    <div style={{ marginTop: '2px' }}>
                                                        <a href={item.portalNews.url} target="_blank" rel="noopener noreferrer" className="portal-interactive-link" title="Ver matéria no portal municipal">
                                                            {item.portalNews.title} <ExternalLink size={10} style={{ display: 'inline', marginLeft: '2px' }} />
                                                        </a>
                                                    </div>
                                                </div>
                                                <div className="pair-divider"></div>
                                                <div className="pair-item">
                                                    <span>📰 3. PUBLICADO NA IMPRENSA EXTERNA:</span>
                                                    <div style={{ marginTop: '2px' }}>
                                                        <a href={item.clipping.url} target="_blank" rel="noopener noreferrer" className="clipping-interactive-link" title="Ler matéria na imprensa externa">
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
                                        <div className="empty-audit">Nenhuma cadeia de publicação mapeada no período selecionado.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeSubTab === 'eficiencia' && (
                            <div className="strat-correlation-content animate-fade">
                                <div className="strat-correlation-explainer">
                                    <strong>💡 Pauta vs Portal Oficial:</strong> Cruza e bate as pautas internas com as publicações reais no Portal Guarulhos.
                                </div>
                                <div className="strat-audit-grid" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '8px', gap: '12px' }}>
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
                                                    <p onClick={() => setSelectedTaskModal(item.task)} className="pauta-interactive-link" title="Clique para abrir detalhes da pauta">
                                                        {item.task.title}
                                                    </p>
                                                </div>
                                                <div className="pair-divider"></div>
                                                <div className="pair-item">
                                                    <span>🌐 2. DIVULGADO NO PORTAL OFICIAL:</span>
                                                    <div style={{ marginTop: '2px' }}>
                                                        <a href={item.article.url} target="_blank" rel="noopener noreferrer" className="portal-interactive-link">
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
                                        <div className="empty-audit">Sem confirmações de publicações no portal oficial para o período selecionado.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeSubTab === 'imprensa' && (
                            <div className="strat-correlation-content animate-fade">
                                <div className="strat-correlation-explainer">
                                    <strong>💡 Repercussão de Imprensa:</strong> Compara matérias do Portal oficial com as menções em jornais exteriores locais de Guarulhos.
                                </div>
                                <div className="strat-audit-grid" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '8px', gap: '12px' }}>
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
                                                        <a href={item.clipping.url} target="_blank" rel="noopener noreferrer" className="clipping-interactive-link">
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
                                        <div className="empty-audit">Sem matérias de clippings localizadas nas últimas 48h.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DETAILED EXPLORER FOR DEMANDS */}
                    <div className="explorer-premium-card glass-premium" ref={explorerRef} style={{ marginTop: '0.5rem' }}>
                        <div className="explorer-header">
                            <div>
                                <h3>🔎 Auditoria Detalhada de Demandas</h3>
                                <p>Tabela analítica rastreando as pautas estratégicas registradas no Hub.</p>
                            </div>
                            {activeFilterPro && (
                                <div className="active-filter-glow-badge">
                                    <span>Filtro Ativo: <strong>{activeFilterPro.label}</strong></span>
                                    <button onClick={() => setActiveFilterPro(null)} className="btn-clear-filter-pro">
                                        Limpar Filtro ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="explorer-table-wrapper">
                            {drilledDownTasks.length === 0 ? (
                                <div className="no-matches-box">
                                    <HelpCircle size={32} />
                                    <p>Nenhuma pauta crítica com este filtro.</p>
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
                                                onClick={() => setSelectedTaskModal(task)}
                                                style={{ cursor: 'pointer' }}
                                                title="Clique para abrir detalhes"
                                            >
                                                <td><span className="explorer-title-link">{task.title}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {task.secretarias?.map(s => (
                                                            <span key={s} style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>{s}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>{format(new Date(task.createdAt), 'dd/MM/yyyy')}</td>
                                                <td>
                                                    <span className={`status-badge-v3 ${task.status}`}>
                                                        {task.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`priority-indicator-pro ${task.priority}`}>
                                                        {task.priority.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td>
                                                    {task.dueDate ? (
                                                        <span className={`dueDate-text ${task.status !== 'publicado' && new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                                                            {format(new Date(task.dueDate), 'dd/MM/yyyy')}
                                                        </span>
                                                    ) : '—'}
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

            {/* TAB 2: TACTICAL NEWS RADAR */}
            {activeTab === 'radar' && (
                <>
                    <div className="kpi-grid animate-fade">
                        <div className="kpi-card kpi-total">
                            <div className="kpi-icon-wrapper" style={{ background: '#f8fafc', color: '#1e3a8a' }}><Activity size={24} /></div>
                            <div className="kpi-content">
                                <h3>TOTAL GERAL</h3>
                                <div className="kpi-value">{filteredAnalytics?.totalFiltered?.toLocaleString() || 0}</div>
                                <p className="kpi-label">Volume do filtro selecionado</p>
                            </div>
                        </div>
                        <div className="kpi-card kpi-entregas">
                            <div className="kpi-icon-wrapper"><Calendar size={24} /></div>
                            <div className="kpi-content">
                                <h3>MÉDIA MENSAL</h3>
                                <div className="kpi-value">{filteredAnalytics?.mediaMensal || 0}</div>
                                <p className="kpi-label">No período filtrado</p>
                            </div>
                        </div>
                        <div className="kpi-card kpi-secretarias">
                            <div className="kpi-icon-wrapper"><Users size={24} /></div>
                            <div className="kpi-content">
                                <h3>SECRETARIAS ATIVAS</h3>
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

                    <main className="hub-radar-content animate-fade" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
                        <div className="radar-main-column" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className={`hub-card ranking-card ${collapsedCards.ranking ? 'collapsed' : ''}`}>
                                <div className="card-header" onClick={() => toggleCard('ranking')} style={{ cursor: 'pointer' }}>
                                    <div className="title-group">
                                        <Target size={18} /> 
                                        <div>
                                            <h2>TOTAL GERAL POR SECRETARIA</h2>
                                            {!collapsedCards.ranking && <p>Volume de releases por órgão</p>}
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
                                    <div className="card-body feed-list" style={{ flex: 1, overflowY: 'auto', maxHeight: '450px' }}>
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
                                            <h2>TOTAL GERAL POR MÊS</h2>
                                            {!collapsedCards.evolution && <p>Volume consolidado no período</p>}
                                        </div>
                                    </div>
                                    {collapsedCards.evolution ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                </div>
                                {!collapsedCards.evolution && (
                                    <div className="card-body chart-box">
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={filteredAnalytics?.byMonth}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                                                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                                                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px' }} cursor={{fill: '#f1f5f9'}} />
                                                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>

                    <div className={`hub-card table-card ${collapsedCards.details ? 'collapsed' : ''}`} ref={tableRef} style={{ marginTop: '1.5rem' }}>
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
                                        {filteredAnalytics?.news.slice(0, displayLimit).map(news => (
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
                            {filteredAnalytics?.news && filteredAnalytics.news.length > displayLimit && (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                    <button 
                                        className="btn-secondary-v3" 
                                        onClick={() => setDisplayLimit(prev => prev + 150)}
                                        style={{ padding: '0.65rem 1.75rem', fontWeight: 600, fontSize: '0.85rem' }}
                                    >
                                        Carregar Mais Notícias ({filteredAnalytics.news.length - displayLimit} restantes)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                    </div>
                </>
            )}

            {selectedTaskModal && (
                <TaskModal 
                    task={selectedTaskModal}
                    onClose={() => setSelectedTaskModal(null)}
                    onUpdateTask={handleUpdateTask}
                />
            )}

            <RadarReportModal 
                isOpen={reportModalOpen} 
                onClose={() => setReportModalOpen(false)}
                news={filteredAnalytics?.news || []}
                byCategory={filteredAnalytics?.byCategory || []}
                periodLabel={customStartDate || customEndDate ? `${customStartDate ? format(new Date(customStartDate + 'T12:00:00'), 'dd/MM/yyyy') : '...'} a ${customEndDate ? format(new Date(customEndDate + 'T12:00:00'), 'dd/MM/yyyy') : '...'}` : 'Todo o Histórico'}
                userName={user?.name || 'Sistema'}
            />
        </div>
    );
}

