-- ==========================================
-- MIGRATION: Anexos nas Sugestões
-- Execute no SQL Editor do Supabase
-- ==========================================

-- 1. Adicionar coluna de anexos na tabela suggestions
ALTER TABLE public.suggestions 
ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';

-- 2. Criar bucket público para os anexos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('suggestion-attachments', 'suggestion-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de acesso ao bucket
-- Leitura pública
CREATE POLICY "Suggestion attachments are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'suggestion-attachments');

-- Upload para usuários autenticados
CREATE POLICY "Auth users can upload suggestion attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'suggestion-attachments' AND
        auth.uid() IS NOT NULL
    );

-- Delete para usuários autenticados
CREATE POLICY "Auth users can delete suggestion attachments"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'suggestion-attachments' AND
        auth.uid() IS NOT NULL
    );
