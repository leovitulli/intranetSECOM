-- Migration 09: Atomic Transactions and User Auto-Sync
-- Esse script garante que pautas e usuários sejam criados de forma íntegra (Tudo ou Nada).

-- 1. SINCRONIZAÇÃO AUTOMÁTICA DE USUÁRIOS (Trigger)
-- Garante que se um login existir no Auth, o perfil existirá na tabela public.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, avatar, job_titles, has_login)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    'https://ui-avatars.com/api/?name=' || COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || '&background=random',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'job_titles', '[]'::jsonb))),
    COALESCE((NEW.raw_user_meta_data->>'has_login')::boolean, true)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    job_titles = EXCLUDED.job_titles,
    has_login = EXCLUDED.has_login;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove o gatilho se já existir para evitar erros
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. GARANTIR COLUNAS DE SEGURANÇA (Caso falte alguma)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS pauta_saida TEXT,
ADD COLUMN IF NOT EXISTS is_pauta_externa BOOLEAN DEFAULT FALSE;


-- 3. FUNÇÃO DE CRIAÇÃO ATÔMICA DE PAUTA (RPC)
-- Executa Pauta + Equipe + Log em uma única transação no servidor.
CREATE OR REPLACE FUNCTION public.create_task_atomic(
    p_title TEXT,
    p_description TEXT,
    p_status TEXT,
    p_priority TEXT,
    p_type TEXT[],
    p_creator TEXT,
    p_due_date TIMESTAMPTZ,
    p_assignee_ids UUID[],
    p_inauguracao_nome TEXT DEFAULT NULL,
    p_inauguracao_endereco TEXT DEFAULT NULL,
    p_inauguracao_secretarias TEXT[] DEFAULT '{}',
    p_inauguracao_tipo TEXT DEFAULT NULL,
    p_inauguracao_checklist JSONB DEFAULT NULL,
    p_inauguracao_data DATE DEFAULT NULL,
    p_pauta_data TEXT DEFAULT NULL,
    p_pauta_horario TEXT DEFAULT NULL,
    p_pauta_endereco TEXT DEFAULT NULL,
    p_pauta_saida TEXT DEFAULT NULL,
    p_is_pauta_externa BOOLEAN DEFAULT FALSE,
    p_video_captacao_equipe TEXT[] DEFAULT '{}',
    p_video_captacao_data DATE DEFAULT NULL,
    p_video_edicao_equipe TEXT[] DEFAULT '{}',
    p_video_edicao_data DATE DEFAULT NULL,
    p_video_briefing TEXT DEFAULT NULL,
    p_video_necessidades TEXT[] DEFAULT '{}',
    p_video_entrega_data DATE DEFAULT NULL,
    p_arte_tipo_pecas TEXT DEFAULT NULL,
    p_arte_entrega_data DATE DEFAULT NULL
) RETURNS public.tasks AS $$
DECLARE
    v_task public.tasks;
    v_user_name TEXT;
BEGIN
    -- Busca o nome do usuário que está criando para o log
    SELECT name INTO v_user_name FROM public.users WHERE id = auth.uid();

    -- A. Inserir a Pauta
    INSERT INTO public.tasks (
        title, description, status, priority, type, creator, due_date,
        inauguracao_nome, inauguracao_endereco, inauguracao_secretarias, inauguracao_tipo, inauguracao_checklist, inauguracao_data,
        pauta_data, pauta_horario, pauta_endereco, pauta_saida, is_pauta_externa,
        video_captacao_equipe, video_captacao_data, video_edicao_equipe, video_edicao_data, video_briefing, video_necessidades, video_entrega_data,
        arte_tipo_pecas, arte_entrega_data
    )
    VALUES (
        p_title, p_description, p_status, p_priority, p_type, p_creator, p_due_date,
        p_inauguracao_nome, p_inauguracao_endereco, p_inauguracao_secretarias, p_inauguracao_tipo, p_inauguracao_checklist, p_inauguracao_data,
        p_pauta_data, p_pauta_horario, p_pauta_endereco, p_pauta_saida, p_is_pauta_externa,
        p_video_captacao_equipe, p_video_captacao_data, p_video_edicao_equipe, p_video_edicao_data, p_video_briefing, p_video_necessidades, p_video_entrega_data,
        p_arte_tipo_pecas, p_arte_entrega_data
    )
    RETURNING * INTO v_task;

    -- B. Inserir Equipe (Se houver)
    IF p_assignee_ids IS NOT NULL AND array_length(p_assignee_ids, 1) > 0 THEN
        INSERT INTO public.task_assignees (task_id, user_id)
        SELECT v_task.id, unnest(p_assignee_ids);
    END IF;

    -- C. Inserir Log de Atividade
    INSERT INTO public.task_logs (task_id, user_id, user_name, action_type, details)
    VALUES (v_task.id, auth.uid(), COALESCE(v_user_name, 'Sistema'), 'create', 'Pauta criada via RPC Atômica (Confiabilidade Total)');

    RETURN v_task;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
