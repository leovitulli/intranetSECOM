-- Migration: Add pauta-specific columns to tasks table
-- Run this in the Supabase SQL Editor

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS pauta_data        TEXT,
    ADD COLUMN IF NOT EXISTS pauta_horario     TEXT,
    ADD COLUMN IF NOT EXISTS pauta_endereco    TEXT;
