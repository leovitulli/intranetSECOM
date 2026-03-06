-- Migration: Create news table (Mural de Comunicação)
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.news (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'Avisos Gerais',
    author_name TEXT NOT NULL,
    author_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
    pinned      BOOLEAN DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can view news" ON public.news
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Anyone authenticated can create
CREATE POLICY "Authenticated users can insert news" ON public.news
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins and devs can update/delete
CREATE POLICY "Admins and Devs can update news" ON public.news
    FOR UPDATE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'))
    WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));

CREATE POLICY "Admins and Devs can delete news" ON public.news
    FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'desenvolvedor'));
