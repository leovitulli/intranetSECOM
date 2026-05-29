import fs from 'fs';
import path from 'path';

const RSS_URL = 'https://news.google.com/rss/search?q=Guarulhos&hl=pt-BR&gl=BR&ceid=BR:pt-419';

// Map categories based on title keywords
const CATEGORY_KEYWORDS = [
    { category: 'Saúde', keywords: ['saude', 'medico', 'medicos', 'upa', 'exame', 'consulta', 'ginecologia', 'pediatria', 'vacinacao', 'vacina', 'hospital', 'posto', 'sus', 'apurasus', 'cancer', 'prevencao'] },
    { category: 'Zeladoria', keywords: ['zeladoria', 'limpeza', 'corrego', 'tapa-buraco', 'bueiro', 'varricao', 'entulho', 'capina', 'asfalto', 'recapeamento', 'drenagem', 'obras', 'obra', 'pavimentacao'] },
    { category: 'Trabalho', keywords: ['emprego', 'empregos', 'vagas', 'trabalho', 'oportunidades', 'contratacao', 'curriculo', 'trabalhador', 'conselho municipal do trabalho'] },
    { category: 'Educação', keywords: ['escola', 'alunos', 'estudantes', 'aula', 'aulas', 'ensino', 'educacao', 'juventude', 'creche', 'professor'] },
    { category: 'Esporte', keywords: ['esporte', 'lutas', 'judo', 'karate', 'boxe', 'palacio', 'atleta', 'corrida', 'batom', 'caminhada', 'circuito bem-estar', 'bem-estar', 'futebol', 'quadra'] },
    { category: 'Cultura', keywords: ['cultura', 'shows', 'musica', 'teatro', 'bosque maia', 'livros', 'leitura', 'biblioteca', 'cinema', 'biscuit', 'artesanato', 'sabonete'] }
];

const UNSPLASH_IMAGES = {
    'Saúde': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
    'Zeladoria': 'https://images.unsplash.com/photo-1541675154750-0444c7d51e8e?auto=format&fit=crop&q=80&w=800',
    'Trabalho': 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=800',
    'Educação': 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=800',
    'Esporte': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=800',
    'Cultura': 'https://images.unsplash.com/photo-1590483734159-4670221375a0?auto=format&fit=crop&q=80&w=800',
    'Outros': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800'
};

const LOGOS = {
    'FOLHA METROPOLITANA': 'https://img.vendaapre.com.br/logos/folha.png',
    'CLICK GUARULHOS': 'https://img.vendaapre.com.br/logos/click.png',
    'JORNAL VOZ DE GUARULHOS': 'https://img.vendaapre.com.br/logos/voz.png',
    'GUARULHOS HOJE': 'https://img.vendaapre.com.br/logos/voz.png',
    'R7 NOTÍCIAS': 'https://img.vendaapre.com.br/logos/r7.png',
    'G1': 'https://img.vendaapre.com.br/logos/r7.png',
    'DEFAULT': 'https://img.vendaapre.com.br/logos/click.png'
};

function determineCategory(title) {
    const text = title.toLowerCase();
    for (const item of CATEGORY_KEYWORDS) {
        if (item.keywords.some(kw => text.includes(kw))) {
            return item.category;
        }
    }
    return 'Outros';
}

function determineSentiment(title) {
    const text = title.toLowerCase();
    const criticalWords = ['crise', 'falta', 'atraso', 'reclamacao', 'protesto', 'crime', 'assalto', 'violencia', 'suspeito', 'acusado', 'morte', 'acidente', 'interditado', 'buraco', 'lixo', 'abandono', 'paralisa', 'greve'];
    const positiveWords = ['inaugura', 'entrega', 'conquista', 'ganha', 'destaque', 'excelente', 'beneficia', 'sucesso', 'amplia', 'modernizacao', 'reforma', 'revitalizacao', 'recapeamento', 'comemora'];

    if (criticalWords.some(w => text.includes(w))) return 'critical';
    if (positiveWords.some(w => text.includes(w))) return 'positive';
    return 'neutral';
}

async function fetchRealClipping() {
    console.log('📡 Buscando notícias reais de Guarulhos via Google News RSS...');
    
    try {
        const response = await fetch(RSS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const xml = await response.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        
        const clippings = [];
        let match;
        let idCounter = 1;
        
        while ((match = itemRegex.exec(xml)) !== null) {
            const itemContent = match[1];
            
            // Extract Title
            const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
            if (!titleMatch) continue;
            const fullTitle = titleMatch[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
            
            // Separate title and source (format: "Title of News - Source Name")
            const parts = fullTitle.split(' - ');
            const source = parts.length > 1 ? parts.pop().trim().toUpperCase() : 'IMPRENSA EXTERNA';
            const cleanTitle = parts.join(' - ').trim();
            
            // Extract URL
            const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
            const url = linkMatch ? linkMatch[1] : '';
            
            // Extract Date
            const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
            const pubDateStr = dateMatch ? dateMatch[1] : new Date().toISOString();
            const created_at = new Date(pubDateStr).toISOString();
            
            // Classify
            const category = determineCategory(cleanTitle);
            const sentiment = determineSentiment(cleanTitle);
            const image_url = UNSPLASH_IMAGES[category] || UNSPLASH_IMAGES['Outros'];
            
            // Logo
            let source_logo = LOGOS[source];
            if (!source_logo) {
                if (source.includes('METROPOLITANA')) source_logo = LOGOS['FOLHA METROPOLITANA'];
                else if (source.includes('CLICK')) source_logo = LOGOS['CLICK GUARULHOS'];
                else if (source.includes('VOZ')) source_logo = LOGOS['JORNAL VOZ DE GUARULHOS'];
                else if (source.includes('G1')) source_logo = LOGOS['G1'];
                else if (source.includes('R7')) source_logo = LOGOS['R7 NOTÍCIAS'];
                else source_logo = LOGOS['DEFAULT'];
            }
            
            clippings.push({
                id: `real_${idCounter++}`,
                title: cleanTitle,
                source: source,
                source_logo: source_logo,
                excerpt: `Reportagem sobre cotidiano e acontecimentos de Guarulhos publicada originalmente no veículo ${source}.`,
                category: category,
                sentiment: sentiment,
                url: url,
                created_at: created_at,
                image_url: image_url,
                priority: sentiment === 'critical' ? 1 : 2
            });
        }
        
        console.log(`✅ Sucesso! ${clippings.length} notícias reais encontradas e estruturadas.`);
        
        // Write to public/clipping_real.json
        const outputPath = path.resolve('public/clipping_real.json');
        fs.writeFileSync(outputPath, JSON.stringify(clippings, null, 4), 'utf8');
        console.log(`📂 Salvo com sucesso em: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ Erro fatal ao buscar notícias reais:', error);
    }
}

fetchRealClipping();
