-- Migration: Add secure team management columns
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar colunas para controle de segurança e sincronização
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pending_email TEXT,
ADD COLUMN IF NOT EXISTS security_stamp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- 2. Garantir que o e-mail no perfil público sempre reflita o Auth (se possível)
-- Removendo restrição de unicidade se houver, para permitir pending_email se necessário
-- (Geralmente o e-mail no users já é único)

-- 3. Função para forçar re-autenticação de um usuário
CREATE OR REPLACE FUNCTION public.force_user_logout(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.users 
  SET security_stamp = security_stamp + 1 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário para o usuário:
-- Esta função permite que o sistema identifique quando um acesso deve ser revogado.
-- O React ficará "ouvindo" esse security_stamp.
