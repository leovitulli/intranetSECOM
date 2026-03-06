-- Migration: Add inauguration-specific columns to tasks table
-- Run this in the Supabase SQL Editor

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS inauguracao_nome        TEXT,
    ADD COLUMN IF NOT EXISTS inauguracao_endereco    TEXT,
    ADD COLUMN IF NOT EXISTS inauguracao_secretarias TEXT[],
    ADD COLUMN IF NOT EXISTS inauguracao_tipo        TEXT,
    ADD COLUMN IF NOT EXISTS inauguracao_checklist   JSONB,
    ADD COLUMN IF NOT EXISTS inauguracao_data        DATE;
