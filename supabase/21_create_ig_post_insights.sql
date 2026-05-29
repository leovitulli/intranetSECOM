-- supabase/migrations/21_create_ig_post_insights.sql

-- Cria a tabela compacta para armazenar apenas a linha agregada de cada Post
CREATE TABLE IF NOT EXISTS public.ig_post_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id TEXT UNIQUE NOT NULL,
    post_preview TEXT NOT NULL,
    post_image TEXT,
    post_url TEXT,
    post_date TIMESTAMPTZ NOT NULL,
    
    -- Agregados Semânticos (Estatísticas e Resumo Executivo)
    metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Lista de Comentários Críticos (Apenas aqueles que demandam atenção/resposta)
    critical_comments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- metrics_json schema documentation (exemplo do payload da IA):
-- {
--   "total_comments": 150,
--   "sentiment_breakdown": { "positive": 60, "negative": 10, "neutral": 30 },
--   "topics": ["Saúde", "Infraestrutura", "Educação"],
--   "ai_executive_summary": "A população aprovou a nova policlínica, porém existem 10 comentários relatando atrasos nas linhas de ônibus ao redor do local."
-- }

-- critical_comments_json schema documentation (exemplo do array gerado pela IA):
-- [
--   { 
--      "id": "c1", 
--      "author": "Maria Silva", 
--      "text": "Meu filho está sem remédio de asma no posto! Alguém me ajuda?", 
--      "sentiment": "negative", 
--      "topic": "Saúde", 
--      "urgency": "high", 
--      "replied": false 
--   }
-- ]

-- Habilita o RLS
ALTER TABLE public.ig_post_insights ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Allow authenticated to select ig_post_insights" ON public.ig_post_insights
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to insert/update ig_post_insights" ON public.ig_post_insights
    FOR ALL USING (auth.role() = 'authenticated');
