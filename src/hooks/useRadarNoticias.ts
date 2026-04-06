import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface RadarNoticia {
    id: string;
    title: string;
    url: string;
    category: string;
    published_at: string;
    content?: string;
    image_url?: string;
    is_entrega: boolean;
    entrega_type: string;
}

export interface AnalyticsData {
    total: number;
    totalCount: number;
    byCategory: { name: string; value: number }[];
    byYear: { year: number; count: number }[];
    deliveries: { type: string; count: number }[];
    entregasTotal: number;
    recentNews: RadarNoticia[];
    allNews: RadarNoticia[];
    categories: string[];
}

export interface FilterParams {
    startDate?: string;
    endDate?: string;
    category?: string;
    entregaType?: string;
}

const PAGE_SIZE = 1000;

export function useRadarNoticias(filters?: FilterParams) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function fetchAnalytics() {
        try {
            setLoading(true);

            // Fetch all records with pagination (Supabase default max is 1000)
            let allNews: RadarNoticia[] = [];
            let from = 0;

            while (true) {
                let query = supabase
                    .from('radar_noticias')
                    .select('*', { count: 'exact' })
                    .order('published_at', { ascending: false })
                    .range(from, from + PAGE_SIZE - 1);

                if (filters?.startDate) query = query.gte('published_at', filters.startDate);
                if (filters?.endDate) query = query.lte('published_at', filters.endDate);
                if (filters?.category) query = query.eq('category', filters.category);
                if (filters?.entregaType) query = query.eq('entrega_type', filters.entregaType);

                const { data: page, error: pageErr } = await query;
                if (pageErr) throw pageErr;

                if (!page || page.length === 0) break;

                allNews = allNews.concat(page);

                if (page.length < PAGE_SIZE) break;
                from += PAGE_SIZE;

                // Safety: stop after 20 pages (20k records max)
                if (from >= 20000) break;
            }

            const { count: totalCount } = await supabase
                .from('radar_noticias')
                .select('*', { count: 'exact', head: true });

            const catMap = new Map<string, number>();
            allNews.forEach((n: RadarNoticia) => {
                const cat = n.category || 'Outros';
                catMap.set(cat, (catMap.get(cat) || 0) + 1);
            });
            const byCategory = Array.from(catMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

            const entregas = allNews.filter((n: RadarNoticia) => n.is_entrega);
            const entregasTotal = entregas.length;
            const deliveryMap = new Map<string, number>();
            entregas.forEach((n: RadarNoticia) => {
                const type = n.entrega_type || 'outros';
                deliveryMap.set(type, (deliveryMap.get(type) || 0) + 1);
            });
            const deliveries = Array.from(deliveryMap.entries())
                .map(([type, count]) => ({ type, count }))
                .sort((a, b) => b.count - a.count);

            const yearMap = new Map<number, number>();
            allNews.forEach((n: RadarNoticia) => {
                if (n.published_at) {
                    const year = new Date(n.published_at).getFullYear();
                    yearMap.set(year, (yearMap.get(year) || 0) + 1);
                }
            });
            const byYear = Array.from(yearMap.entries())
                .map(([year, count]) => ({ year, count }))
                .sort((a, b) => a.year - b.year);

            const categories = Array.from(new Set(
                allNews.map((n: RadarNoticia) => n.category).filter(Boolean)
            )).sort() as string[];

            setData({
                total: allNews.length,
                totalCount: totalCount || 0,
                byCategory,
                byYear,
                deliveries,
                entregasTotal,
                recentNews: entregas.slice(0, 15),
                allNews,
                categories
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            console.error('Error fetching radar analytics:', err);
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAnalytics();
    }, [filters?.startDate, filters?.endDate, filters?.category, filters?.entregaType]);

    return { data, loading, error, refetch: fetchAnalytics };
}
