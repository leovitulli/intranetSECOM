-- ============================================================
-- INSTAGRAM INSIGHTS V2 — TABELAS SEPARADAS
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. TABELA DE POSTS
CREATE TABLE IF NOT EXISTS public.ig_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ig_post_id text NOT NULL UNIQUE,
    caption text,
    media_url text,
    permalink text,
    like_count integer DEFAULT 0,
    comments_count integer DEFAULT 0,
    post_date timestamptz,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ig_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ig_posts_read" ON public.ig_posts;
DROP POLICY IF EXISTS "ig_posts_write" ON public.ig_posts;
DROP POLICY IF EXISTS "ig_posts_update" ON public.ig_posts;
DROP POLICY IF EXISTS "ig_posts_delete" ON public.ig_posts;

CREATE POLICY "ig_posts_read" ON public.ig_posts FOR SELECT USING (true);
CREATE POLICY "ig_posts_write" ON public.ig_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "ig_posts_update" ON public.ig_posts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ig_posts_delete" ON public.ig_posts FOR DELETE USING (true);

-- 2. TABELA DE COMENTÁRIOS
CREATE TABLE IF NOT EXISTS public.ig_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ig_comment_id text NOT NULL UNIQUE,
    ig_post_id text NOT NULL,
    author_username text,
    comment_text text,
    comment_date timestamptz,
    sentiment text DEFAULT 'pending',
    topic text,
    urgency text,
    is_critical boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ig_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ig_comments_read" ON public.ig_comments;
DROP POLICY IF EXISTS "ig_comments_write" ON public.ig_comments;
DROP POLICY IF EXISTS "ig_comments_update" ON public.ig_comments;
DROP POLICY IF EXISTS "ig_comments_delete" ON public.ig_comments;

CREATE POLICY "ig_comments_read" ON public.ig_comments FOR SELECT USING (true);
CREATE POLICY "ig_comments_write" ON public.ig_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "ig_comments_update" ON public.ig_comments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ig_comments_delete" ON public.ig_comments FOR DELETE USING (true);

-- 3. TABELA DE ANÁLISES DA IA
CREATE TABLE IF NOT EXISTS public.ig_analysis (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ig_post_id text NOT NULL,
    ai_summary text,
    topics jsonb DEFAULT '[]',
    positive_pct integer DEFAULT 0,
    negative_pct integer DEFAULT 0,
    neutral_pct integer DEFAULT 0,
    analyzed_at timestamptz DEFAULT now()
);

ALTER TABLE public.ig_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ig_analysis_read" ON public.ig_analysis;
DROP POLICY IF EXISTS "ig_analysis_write" ON public.ig_analysis;
DROP POLICY IF EXISTS "ig_analysis_update" ON public.ig_analysis;
DROP POLICY IF EXISTS "ig_analysis_delete" ON public.ig_analysis;

CREATE POLICY "ig_analysis_read" ON public.ig_analysis FOR SELECT USING (true);
CREATE POLICY "ig_analysis_write" ON public.ig_analysis FOR INSERT WITH CHECK (true);
CREATE POLICY "ig_analysis_update" ON public.ig_analysis FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ig_analysis_delete" ON public.ig_analysis FOR DELETE USING (true);
