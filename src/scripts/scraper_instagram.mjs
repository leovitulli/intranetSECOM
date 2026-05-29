import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// -- Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERRO: Faltando VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env.local");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// -- Configuração de API Keys
const INSTAGRAM_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_AI_PROVIDER = process.env.IG_AI_PROVIDER || 'gemini';
const IG_AI_KEY = process.env.IG_AI_KEY;

if (!IG_AI_KEY) {
  console.error("❌ ERRO: Faltando IG_AI_KEY no .env.local");
  process.exit(1);
}

// ─── LÓGICA DO ROBÔ ────────────────────────────────────────────────────────

/**
 * Passo 1: Busca dados brutos no Instagram (Mockado neste exemplo se não houver Token)
 */
async function fetchInstagramComments() {
    console.log("📥 Puxando comentários do Instagram...");
    
    if (!INSTAGRAM_ACCESS_TOKEN) {
        console.warn("⚠️ Aviso: IG_ACCESS_TOKEN não encontrado. Usando payload simulado para testar a IA.");
        return [
            { id: "1", text: "Muito buraco na rua principal, estragou meu pneu!", author: "Joao123" },
            { id: "2", text: "Excelente o atendimento na UBS ontem, rápido e eficiente", author: "Maria_S" },
            { id: "3", text: "Falta segurança à noite perto da praça, muito escuro", author: "Carlos" },
            { id: "4", text: "A cidade está ficando cada vez mais bonita, parabéns", author: "Ana" },
            { id: "5", text: "Tem como pintar a faixa de pedestre da avenida?", author: "Pedro" }
        ];
    }
    return [];
}

/**
 * Passo 2: Envia os comentários brutos para a IA "Comprimir" (Agnóstico)
 */
async function compressCommentsWithAI(comments) {
    console.log(`🧠 Acionando provedor [${IG_AI_PROVIDER.toUpperCase()}] para comprimir ${comments.length} comentários...`);

    const prompt = `
    Você é um analista de mídias sociais de uma prefeitura.
    Analise a seguinte lista de comentários do Instagram:
    ${JSON.stringify(comments, null, 2)}
    
    Retorne APENAS um JSON válido seguindo EXATAMENTE este schema:
    {
        "total_comments": 5,
        "sentiment_breakdown": { "positive": 40, "negative": 40, "neutral": 20 },
        "topics": ["Saúde", "Zeladoria"],
        "ai_executive_summary": "Resumo de 2 linhas do que está acontecendo.",
        "critical_comments": [
             { "id": "1", "author": "Joao123", "text": "Muito buraco", "sentiment": "negative", "topic": "Zeladoria", "urgency": "high", "replied": false }
        ]
    }
    Instruções para critical_comments: Só inclua reclamações graves ou dúvidas urgentes. Ignore elogios.
    `;

    try {
        let textResult = "";

        if (IG_AI_PROVIDER === 'gemini') {
            const genAI = new GoogleGenerativeAI(IG_AI_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            textResult = result.response.text();
            
        } else if (IG_AI_PROVIDER === 'openai') {
            const openai = new OpenAI({ apiKey: IG_AI_KEY });
            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            });
            textResult = completion.choices[0].message.content;
            
        } else if (IG_AI_PROVIDER === 'claude') {
            const anthropic = new Anthropic({ apiKey: IG_AI_KEY });
            const msg = await anthropic.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1000,
                messages: [{ role: "user", content: prompt }]
            });
            textResult = msg.content[0].text;
        }
        
        // Limpar possíveis formatações markdown markdown (```json ... ```)
        textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(textResult);
        
    } catch (e) {
        console.error(`❌ Erro no provedor ${IG_AI_PROVIDER}:`, e.message || e);
        return null;
    }
}

/**
 * Passo 3: Salva o resultado otimizado no Supabase
 */
async function saveToSupabase(postPreview, aiData) {
    console.log("💾 Salvando na tabela ig_post_insights do Supabase...");

    const { data, error } = await supabase
        .from('ig_post_insights')
        .insert({
            post_id: `post_${Date.now()}`,
            post_preview: postPreview,
            post_date: new Date().toISOString(),
            metrics_json: {
                total_comments: aiData.total_comments,
                total_likes: 100, // Simulado
                sentiment_breakdown: aiData.sentiment_breakdown,
                topics: aiData.topics,
                ai_executive_summary: aiData.ai_executive_summary
            },
            critical_comments_json: aiData.critical_comments
        });

    if (error) {
        console.error("❌ Erro ao salvar no banco:", error);
    } else {
        console.log("✅ Dados salvos com sucesso!");
    }
}

// ─── EXECUÇÃO PRINCIPAL ──────────────────────────────────────────────────
async function runScraper() {
    console.log("==========================================");
    console.log(`🚀 Iniciando Motor de Varredura (${IG_AI_PROVIDER.toUpperCase()})`);
    console.log("==========================================");

    const comments = await fetchInstagramComments();
    if (comments.length === 0) return;

    const aiData = await compressCommentsWithAI(comments);
    if (!aiData) return;

    console.log("✅ IA comprimiu com sucesso:");
    console.log(JSON.stringify(aiData, null, 2));

    await saveToSupabase(`Varredura Multi-IA (${IG_AI_PROVIDER.toUpperCase()})`, aiData);
    
    console.log("🎉 Processo finalizado!");
}

runScraper();
