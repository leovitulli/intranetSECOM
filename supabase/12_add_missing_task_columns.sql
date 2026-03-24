-- Migration: Add missing columns to tasks table
-- This is necessary because the RPCs refer to these columns but they were not present in the table schema.

ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS foto_briefing TEXT,
ADD COLUMN IF NOT EXISTS arte_pecas TEXT,
ADD COLUMN IF NOT EXISTS arte_informacoes TEXT;

COMMENT ON COLUMN public.tasks.foto_briefing IS 'Briefing detalhado para a equipe de fotografia';
COMMENT ON COLUMN public.tasks.arte_pecas IS 'Lista de peças solicitadas para arte/design';
COMMENT ON COLUMN public.tasks.arte_informacoes IS 'Conteúdo e informações textuais para a arte';
