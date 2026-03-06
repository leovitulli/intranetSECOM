-- Migration: Add extra columns to users table
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna 'phone' se não existir
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Adicionar coluna 'has_login' se não existir
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_login BOOLEAN DEFAULT true;
