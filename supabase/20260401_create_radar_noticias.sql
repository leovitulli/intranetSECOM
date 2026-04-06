-- Migration: Create radar_noticias table for external scraping
-- Task reference: task-db-001 in noticias-dashboard.md

CREATE TABLE IF NOT EXISTS public.radar_noticias (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id     TEXT UNIQUE, -- Slug or unique identifier from the URL
    title           TEXT NOT NULL,
    url             TEXT UNIQUE NOT NULL,
    category        TEXT, -- Secretaria
    published_at    TIMESTAMP WITH TIME ZONE,
    content         TEXT,
    image_url       TEXT,
    is_entrega      BOOLEAN DEFAULT false,
    entrega_type    TEXT, -- 'reforma', 'revitalizacao', 'recapeamento', etc.
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Indices for performance on dashboard filters
CREATE INDEX IF NOT EXISTS idx_radar_noticias_category ON public.radar_noticias(category);
CREATE INDEX IF NOT EXISTS idx_radar_noticias_published_at ON public.radar_noticias(published_at);
CREATE INDEX IF NOT EXISTS idx_radar_noticias_is_entrega ON public.radar_noticias(is_entrega);

-- 3. Políticas de Segurança (RLS)
ALTER TABLE public.radar_noticias ENABLE ROW LEVEL SECURITY;

-- Permite que usuários autenticados (Equipe SECOM) vejam as notícias
CREATE POLICY "Authenticated users can view radar_noticias" 
ON public.radar_noticias FOR SELECT 
TO authenticated 
USING (true);

-- Permite que o robô (service_role) faça as inserções/atualizações sem bloqueios
CREATE POLICY "Service role can manage radar_noticias" 
ON public.radar_noticias FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Permite anon insert temporário para sincronização inicial (opcional, remover após sync)
CREATE POLICY "Allow initial sync" 
ON public.radar_noticias FOR INSERT 
TO anon 
WITH CHECK (true);

-- 4. Automação de Data
ALTER TABLE public.radar_noticias ALTER COLUMN created_at SET DEFAULT now();
-- In a real scenario, the scraper would use the service_role key to bypass RLS.
-- But we can add a policy for developers for manual edits.
CREATE POLICY "Developers can manage radar_noticias" ON public.radar_noticias
    FOR ALL USING (public.get_user_role(auth.uid()) = 'desenvolvedor');
