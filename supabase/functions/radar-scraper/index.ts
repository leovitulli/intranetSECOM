import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = 'https://www.guarulhos.sp.gov.br/todas-noticias';

// Keywords to detect "entregas"
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

Deno.serve(async (req) => {
  // CORS Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle options
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { pages = 3 } = await req.json().catch(() => ({ pages: 3 }));
    console.log(`[Radar Scraper] Starting sync of ${pages} pages...`);

    const allAdded = [];

    for (let p = 0; p < pages; p++) {
        const url = `${BASE_URL}?title=&page=${p}`;
        console.log(`[Radar Scraper] Fetching: ${url}`);
        
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!res.ok) {
            console.error(`[Radar Scraper] Fetch error: ${res.status} ${res.statusText}`);
            continue;
        }

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

        console.log(`[Radar Scraper] Page ${p} parsed. Found ${news.length} items.`);

        if ((p + 1) % 10 === 0) {
            console.log(`[Radar Scraper] Progress: page ${p + 1}, ${allAdded.length + news.length} items so far`);
        }

        if (news.length > 0) {
            const { error: upsertError } = await supabaseClient
                .from('radar_noticias')
                .upsert(news, { onConflict: 'external_id' });

            if (upsertError) {
                console.error(`[Radar Scraper] Upsert error:`, upsertError);
                throw upsertError;
            }
            allAdded.push(...news);
        }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Sync complete!', 
        pagesSynced: pages, 
        itemsProcessed: allAdded.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(`[Radar Scraper] Critical error:`, err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
