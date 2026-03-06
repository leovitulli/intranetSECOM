-- =================================================================================
-- Script para Configuração de Gestão Dinâmica de Cargos / Funções
-- Execute este script no SQL Editor do seu projeto Supabase.
-- =================================================================================

-- 0. Corrigir função auxiliar que estava faltando
CREATE OR REPLACE FUNCTION public.get_user_role(user_uid uuid)
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = user_uid;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Criar a tabela 'job_functions'
CREATE TABLE IF NOT EXISTS public.job_functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS na tabela nova
ALTER TABLE public.job_functions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS para 'job_functions'
-- Todos logados podem ver os cargos disponíveis
CREATE POLICY "Anyone can view job functions"
    ON public.job_functions FOR SELECT
    USING (auth.role() = 'authenticated');

-- Apenas Admins e Desenvolvedores podem inserir ou deletar cargos
CREATE POLICY "Admins and Devs can insert job functions"
    ON public.job_functions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'desenvolvedor')
        )
    );

CREATE POLICY "Admins and Devs can delete job functions"
    ON public.job_functions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'desenvolvedor')
        )
    );

CREATE POLICY "Admins and Devs can update job functions"
    ON public.job_functions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'desenvolvedor')
        )
    );

-- 4. Inserir os cargos iniciais solicitados (Evita duplicação por causa do UNIQUE)
INSERT INTO public.job_functions (title)
VALUES 
    ('Jornalista'),
    ('Videomaker'),
    ('Designer'),
    ('Fotógrafo'),
    ('Drone'),
    ('Editor'),
    ('Secretária'),
    ('Diretor'),
    ('Coordenador'),
    ('Mídias Sociais')
ON CONFLICT (title) DO NOTHING;

-- 5. Adicionar a coluna de funções múltiplas na tabela 'users' se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'job_titles'
    ) THEN
        ALTER TABLE public.users ADD COLUMN job_titles TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Opcional: Para migrar a coluna 'role' atual para o array de funções (se a role for um cargo válido e não um acesso de admin)
UPDATE public.users
SET job_titles = ARRAY[role]
WHERE role IN (
    'Jornalista', 'Videomaker', 'Designer', 'Fotógrafo', 
    'Drone', 'Editor', 'Secretária', 'Diretor', 
    'Coordenador', 'Mídias Sociais'
);
