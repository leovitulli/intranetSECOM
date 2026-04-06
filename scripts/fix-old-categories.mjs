import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').filter(line => line.includes('=')).forEach(line => {
    const [key, value] = line.split('=');
    env[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const BASE_URL = 'https://www.guarulhos.sp.gov.br/todas-noticias';

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

function checkEntrega(title) {
    const text = title.toLowerCase();
    for (const entry of ENTREGA_KEYWORDS) {
        if (entry.keywords.some(regex => regex.test(text))) {
            return { isEntrega: true, type: entry.type };
        }
    }
    return { isEntrega: false, type: null };
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPage(pageNum) {
    const url = `${BASE_URL}?title=&page=${pageNum}`;
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    if (!res.ok) return [];

    const html = await res.text();
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
    const titleRegex = /class="views-field views-field-title"><a href="(\/artigo\/.*?)".*?>(.*?)<\/a>/;
    const categoryRegex = /class="views-field views-field-field-category"><a[^>]*>(.*?)<\/a>/;
    const dateRegex = /class="views-field views-field-field-data">\s*(.*?)\s*<\/td>/;

    const news = [];
    let rowMatch;
    while ((rowMatch = rowRegex.exec(html)) !== null) {
        const rowHTML = rowMatch[1];
        const titleMatch = rowHTML.match(titleRegex);
        if (!titleMatch) continue;

        const urlPath = titleMatch[1];
        const title = titleMatch[2].trim();
        const catMatch = rowHTML.match(categoryRegex);
        const rawCategory = catMatch ? catMatch[1].trim() : '';
        const dateMatch = rowHTML.match(dateRegex);
        const rawDate = dateMatch ? dateMatch[1].trim() || '' : '';

        let publishedAt = null;
        if (rawDate) {
            const [datePart] = rawDate.split(' - ');
            const [day, month, year] = datePart.split('/');
            const parsedYear = parseInt(year);
            if (parsedYear > 2000 && parsedYear < 2100) {
                publishedAt = new Date(`${year}-${month}-${day}T12:00:00Z`).toISOString();
            }
        }

        const { isEntrega, type } = checkEntrega(title);
        news.push({
            external_id: urlPath.split('/').pop(),
            title,
            url: `https://www.guarulhos.sp.gov.br${urlPath}`,
            category: normalizeCategory(rawCategory),
            published_at: publishedAt,
            is_entrega: isEntrega,
            entrega_type: type
        });
    }
    return news;
}

async function main() {
    console.log('🔧 Corrigindo categorias dos registros antigos\n');

    const wrongCats = ['Casa Civil', 'Ciência, Tecnologia e Inovação', 'Administrações Regionais', 'Acessibilidade e Inclusão', 'Chefia do Gabinete do Prefeito', 'Bem-Estar Animal'];

    const { data: wrongRecords } = await supabase
        .from('radar_noticias')
        .select('external_id, url')
        .in('category', wrongCats);

    console.log(`📋 Registros com categorias erradas: ${wrongRecords?.length || 0}`);

    // Build a map of external_id -> correct data by fetching all pages
    const res = await fetch(BASE_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const pageLinks = html.match(/page=(\d+)/g) || [];
    const totalPages = Math.max(...pageLinks.map(p => parseInt(p.split('=')[1])), 0) + 1 || 353;

    console.log(`📊 Varrendo ${totalPages} páginas para encontrar dados corretos...\n`);

    let corrected = 0;
    const wrongIds = new Set(wrongRecords?.map(r => r.external_id));

    for (let p = 0; p < totalPages; p++) {
        try {
            const news = await fetchPage(p);

            const toUpdate = news.filter(n => wrongIds.has(n.external_id));
            if (toUpdate.length > 0) {
                for (const item of toUpdate) {
                    const { error } = await supabase
                        .from('radar_noticias')
                        .update({
                            category: item.category,
                            is_entrega: item.is_entrega,
                            entrega_type: item.entrega_type,
                            published_at: item.published_at
                        })
                        .eq('external_id', item.external_id);

                    if (error) {
                        console.error(`  [ERR] Update failed for ${item.external_id}: ${error.message}`);
                    } else {
                        corrected++;
                    }
                }
            }

            if ((p + 1) % 50 === 0 || p === totalPages - 1) {
                const pct = Math.round(((p + 1) / totalPages) * 100);
                console.log(`  [${p + 1}/${totalPages}] ${pct}% — ${corrected} corrigidos`);
            }
            await delay(200);
        } catch (err) {
            console.error(`  [CRASH] Page ${p}: ${err.message}`);
        }
    }

    console.log(`\n✅ Correção concluída! ${corrected} registros atualizados`);

    // Verify
    const { count: remainingWrong } = await supabase
        .from('radar_noticias')
        .select('*', { count: 'exact', head: true })
        .in('category', wrongCats);
    console.log(`   Registros ainda com categorias erradas: ${remainingWrong}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
