import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://www.guarulhos.sp.gov.br/todas-noticias';

// Keywords to detect "entregas" (public works/deliveries)
const ENTREGA_KEYWORDS = [
    { type: 'reforma', keywords: [/reforma/i, /reformada/i, /reformado/i] },
    { type: 'revitalizacao', keywords: [/revitaliza/i, /revitalização/i, /revitalizada/i] },
    { type: 'recapeamento', keywords: [/recapeamento/i, /asfalto/i, /pavimentação/i] },
    { type: 'inauguracao', keywords: [/inaugura/i, /entrega/i, /nova sede/i, /novo equipamento/i] },
    { type: 'insumos', keywords: [/insumo/i, /remédio/i, /medicamento/i, /distribuição/i] },
];

function normalizeCategory(raw) {
    if (!raw) return 'Outros';
    const split = raw.split(' - ');
    return split.length > 1 ? split[1].trim() : raw.trim();
}

function checkEntrega(title, body = '') {
    const text = (title + ' ' + body).toLowerCase();
    for (const entry of ENTREGA_KEYWORDS) {
        if (entry.keywords.some(regex => regex.test(text))) {
            return { isEntrega: true, type: entry.type };
        }
    }
    return { isEntrega: false, type: null };
}

async function fetchPage(pageNum) {
    const url = `${BASE_URL}?title=&page=${pageNum}`;
    console.log(`[Scraper] Fetching page ${pageNum}...`);
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.text();
    } catch (err) {
        console.error(`[Scraper] Error fetching page ${pageNum}:`, err.message);
        return '';
    }
}

async function parseNewsFromHTML(html) {
    const news = [];
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
    const titleRegex = /class="views-field views-field-title"><a href="(\/artigo\/.*?)".*?>(.*?)<\/a>/;
    const categoryRegex = /class="views-field views-field-field-category"><a href=".*?">(.*?)<\/a>/;
    const dateRegex = /class="views-field views-field-field-data">\s*(.*?)\s*<\/td>/;
    
    let rowMatch;
    while ((rowMatch = rowRegex.exec(html)) !== null) {
        const rowHTML = rowMatch[1];
        const titleMatch = rowHTML.match(titleRegex);
        if (!titleMatch) continue;

        const urlPath = titleMatch[1];
        const title = titleMatch[2].trim();
        const url = `https://www.guarulhos.sp.gov.br${urlPath}`;
        const externalId = urlPath.split('/').pop();
        
        const catMatch = rowHTML.match(categoryRegex);
        const rawCategory = catMatch ? catMatch[1].trim() : '';

        const dateMatch = rowHTML.match(dateRegex);
        const rawDate = dateMatch ? dateMatch[1].trim() : '';

        let publishedAt = null;
        if (rawDate) {
            const [datePart] = rawDate.split(' - ');
            const [day, month, year] = datePart.split('/');
            publishedAt = new Date(`${year}-${month}-${day}T12:00:00Z`).toISOString();
        }

        const { isEntrega, type } = checkEntrega(title);

        news.push({
            external_id: externalId,
            title,
            url,
            category: normalizeCategory(rawCategory),
            published_at: publishedAt,
            is_entrega: isEntrega,
            entrega_type: type
        });
    }
    return news;
}

async function crawl(maxPages = 150) {
    const START_LIMIT_DATE = new Date('2025-01-01');
    console.log(`[Scraper] Starting crawl for Jan 2025 to Today (Max ${maxPages} pages)`);

    for (let p = 0; p < maxPages; p++) {
        const html = await fetchPage(p);
        const news = await parseNewsFromHTML(html);
        
        if (news.length === 0) {
            console.warn(`[Scraper] No articles found on page ${p}. Stopping.`);
            break;
        }

        console.log(`[Scraper] Found ${news.length} news items. Saving to DB...`);
        
        const { error } = await supabase
            .from('radar_noticias')
            .upsert(news, { onConflict: 'external_id' });

        if (error) {
            console.error(`[Scraper] Error upserting to Supabase:`, error);
        } else {
            console.log(`[Scraper] Page ${p} synced successfully.`);
        }

        // Check if oldest news on this page is older than our limit
        const oldestOnPageStr = news[news.length - 1].published_at;
        if (oldestOnPageStr) {
            const oldestOnPage = new Date(oldestOnPageStr);
            if (oldestOnPage < START_LIMIT_DATE) {
                console.log(`[Scraper] Reached date limit (${oldestOnPageStr}). Stopping historical sync.`);
                break;
            }
        }
    }
    console.log('[Scraper] Workflow finished.');
}

const pagesToCrawl = process.argv[2] ? parseInt(process.argv[2]) : 150;
crawl(pagesToCrawl)
    .then(() => {
        console.log('[Scraper] Job done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('[Scraper] Fatal error:', err);
        process.exit(1);
    });
