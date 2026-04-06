-- ─── INSTAGRAM ANALYTICS SCHEMA ───────────────────────────────────────────
-- Fase 2: Estrutura para persistência de dados do Instagram e Análise de IA

-- 1. Tabela de Posts do Instagram
CREATE TABLE IF NOT EXISTS public.instagram_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ig_media_id TEXT UNIQUE NOT NULL, -- ID oficial do Instagram
    caption TEXT,
    media_type TEXT,
    permalink TEXT,
    thumbnail_url TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Comentários
CREATE TABLE IF NOT EXISTS public.instagram_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ig_comment_id TEXT UNIQUE NOT NULL, -- ID oficial do comentário no IG
    post_id UUID REFERENCES public.instagram_posts(id) ON DELETE CASCADE,
    author_username TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    like_count INTEGER DEFAULT 0,
    parent_id TEXT, -- Para respostas
    is_replied BOOLEAN DEFAULT false,
    reply_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Análise de IA (Sentimento e Temas)
CREATE TABLE IF NOT EXISTS public.instagram_comment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES public.instagram_comments(id) ON DELETE CASCADE UNIQUE,
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    topic TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    confidence_score FLOAT, -- Score de confiança da IA
    analyzed_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Histórico de Sentimento (Para o Dashboard)
CREATE TABLE IF NOT EXISTS public.instagram_sentiment_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    total_comments INTEGER DEFAULT 0,
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    top_topic TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── SEGURANÇA (RLS) ───────────────────────────────────────────────────

-- Habilitar RLS
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_comment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_sentiment_daily ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: Todos os usuários logados podem ver os dados
CREATE POLICY "Enable read access for authenticated users" ON public.instagram_posts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.instagram_comments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.instagram_comment_analysis
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.instagram_sentiment_daily
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política de Escrita: Apenas 'admin' e 'desenvolvedor'
CREATE POLICY "Enable insert/update for admins and developers" ON public.instagram_posts
    FOR ALL USING (
        public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')
    );

CREATE POLICY "Enable insert/update for admins and developers" ON public.instagram_comments
    FOR ALL USING (
        public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')
    );

CREATE POLICY "Enable insert/update for admins and developers" ON public.instagram_comment_analysis
    FOR ALL USING (
        public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')
    );

CREATE POLICY "Enable insert/update for admins and developers" ON public.instagram_sentiment_daily
    FOR ALL USING (
        public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor')
    );

-- Índices para Performance
CREATE INDEX idx_instagram_comments_post_id ON public.instagram_comments(post_id);
CREATE INDEX idx_instagram_comments_timestamp ON public.instagram_comments(timestamp);
CREATE INDEX idx_instagram_comment_analysis_sentiment ON public.instagram_comment_analysis(sentiment);
CREATE INDEX idx_instagram_sentiment_daily_date ON public.instagram_sentiment_daily(date);
