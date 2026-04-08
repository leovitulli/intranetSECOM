-- [18] ADICIONAR DATA DE NASCIMENTO E CAMPOS DE PERFIL
-- Adiciona suporte para aniversariantes e completude de perfil.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;

-- Comentário para documentação do Supabase
COMMENT ON COLUMN public.users.birth_date IS 'Data de nascimento do usuário para notificações de aniversário';
