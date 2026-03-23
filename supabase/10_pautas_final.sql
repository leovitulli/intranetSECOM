-- 🛠️ ATUALIZAÇÃO FINAL: PAUTAS BLINDADAS (CREATE + UPDATE)
-- Este script sincroniza as funções de Criar e Editar com todos os novos campos (Post, Pref, Secretarias).

-- [1] Garantir colunas
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS presenca_prefeito BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS secretarias TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS post_criacao_texto TEXT,
ADD COLUMN IF NOT EXISTS post_criacao_corrigido BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS post_aprovado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS post_alterado_texto TEXT,
ADD COLUMN IF NOT EXISTS post_data_postagem TEXT,
ADD COLUMN IF NOT EXISTS post_horario_postagem TEXT,
ADD COLUMN IF NOT EXISTS post_reprovado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS post_reprovado_comentario TEXT,
ADD COLUMN IF NOT EXISTS post_material_solicitado TEXT[] DEFAULT '{}';

-- [2] ATUALIZAR FUNÇÃO DE CRIAÇÃO (Sincronizada com o Frontend)
DROP FUNCTION IF EXISTS public.create_task_atomic(text,text,text,text,text[],text,timestamptz,uuid[],text,text,text[],text,jsonb,date,text,text,text,text,boolean,text[],date,text[],date,text,text[],date,text,date);

CREATE OR REPLACE FUNCTION public.create_task_atomic(
    p_title TEXT,
    p_description TEXT DEFAULT '',
    p_status TEXT DEFAULT 'solicitado',
    p_priority TEXT DEFAULT 'baixa',
    p_type TEXT[] DEFAULT '{}',
    p_creator TEXT DEFAULT 'Sistema',
    p_due_date TIMESTAMPTZ DEFAULT NULL,
    p_assignee_ids UUID[] DEFAULT '{}',
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
    p_presenca_prefeito BOOLEAN DEFAULT FALSE,
    p_secretarias TEXT[] DEFAULT '{}',
    p_video_captacao_equipe TEXT[] DEFAULT '{}',
    p_video_captacao_data DATE DEFAULT NULL,
    p_video_edicao_equipe TEXT[] DEFAULT '{}',
    p_video_edicao_data DATE DEFAULT NULL,
    p_video_briefing TEXT DEFAULT NULL,
    p_video_necessidades TEXT[] DEFAULT '{}',
    p_video_entrega_data DATE DEFAULT NULL,
    p_arte_tipo_pecas TEXT DEFAULT NULL,
    p_arte_entrega_data DATE DEFAULT NULL,
    p_post_criacao_texto TEXT DEFAULT NULL,
    p_post_criacao_corrigido BOOLEAN DEFAULT FALSE,
    p_post_aprovado BOOLEAN DEFAULT FALSE,
    p_post_alterado_texto TEXT DEFAULT NULL,
    p_post_data_postagem TEXT DEFAULT NULL,
    p_post_horario_postagem TEXT DEFAULT NULL,
    p_post_reprovado BOOLEAN DEFAULT FALSE,
    p_post_reprovado_comentario TEXT DEFAULT NULL,
    p_post_material_solicitado TEXT[] DEFAULT '{}'
) RETURNS public.tasks AS $$
DECLARE
    v_task public.tasks;
    v_user_name TEXT;
BEGIN
    SELECT name INTO v_user_name FROM public.users WHERE id = auth.uid();

    INSERT INTO public.tasks (
        title, description, status, priority, type, creator, due_date,
        inauguracao_nome, inauguracao_endereco, inauguracao_secretarias, inauguracao_tipo, inauguracao_checklist, inauguracao_data,
        pauta_data, pauta_horario, pauta_endereco, pauta_saida, is_pauta_externa, presenca_prefeito, secretarias,
        video_captacao_equipe, video_captacao_data, video_edicao_equipe, video_edicao_data, video_briefing, video_necessidades, video_entrega_data,
        arte_tipo_pecas, arte_entrega_data,
        post_criacao_texto, post_criacao_corrigido, post_aprovado, post_alterado_texto, post_data_postagem, post_horario_postagem, post_reprovado, post_reprovado_comentario, post_material_solicitado
    )
    VALUES (
        p_title, p_description, p_status, p_priority, p_type, p_creator, p_due_date,
        p_inauguracao_nome, p_inauguracao_endereco, p_inauguracao_secretarias, p_inauguracao_tipo, p_inauguracao_checklist, p_inauguracao_data,
        p_pauta_data, p_pauta_horario, p_pauta_endereco, p_pauta_saida, p_is_pauta_externa, p_presenca_prefeito, p_secretarias,
        p_video_captacao_equipe, p_video_captacao_data, p_video_edicao_equipe, p_video_edicao_data, p_video_briefing, p_video_necessidades, p_video_entrega_data,
        p_arte_tipo_pecas, p_arte_entrega_data,
        p_post_criacao_texto, p_post_criacao_corrigido, p_post_aprovado, p_post_alterado_texto, p_post_data_postagem, p_post_horario_postagem, p_post_reprovado, p_post_reprovado_comentario, p_post_material_solicitado
    )
    RETURNING * INTO v_task;

    IF p_assignee_ids IS NOT NULL AND array_length(p_assignee_ids, 1) > 0 THEN
        INSERT INTO public.task_assignees (task_id, user_id)
        SELECT v_task.id, unnest(p_assignee_ids);
    END IF;

    INSERT INTO public.task_logs (task_id, user_id, user_name, action_type, details)
    VALUES (v_task.id, auth.uid(), COALESCE(v_user_name, 'Sistema'), 'create', 'Pauta criada via RPC Atômica (Total Full)');

    RETURN v_task;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [3] FUNÇÃO DE EDIÇÃO (Já incluída para garantir sincronia)
CREATE OR REPLACE FUNCTION public.update_task_atomic(
    p_task_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_status TEXT,
    p_priority TEXT,
    p_type TEXT[],
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
    p_presenca_prefeito BOOLEAN DEFAULT FALSE,
    p_secretarias TEXT[] DEFAULT '{}',
    p_video_captacao_equipe TEXT[] DEFAULT '{}',
    p_video_captacao_data DATE DEFAULT NULL,
    p_video_edicao_equipe TEXT[] DEFAULT '{}',
    p_video_edicao_data DATE DEFAULT NULL,
    p_video_briefing TEXT DEFAULT NULL,
    p_video_necessidades TEXT[] DEFAULT '{}',
    p_video_entrega_data DATE DEFAULT NULL,
    p_arte_tipo_pecas TEXT DEFAULT NULL,
    p_arte_entrega_data DATE DEFAULT NULL,
    p_post_criacao_texto TEXT DEFAULT NULL,
    p_post_criacao_corrigido BOOLEAN DEFAULT FALSE,
    p_post_aprovado BOOLEAN DEFAULT FALSE,
    p_post_alterado_texto TEXT DEFAULT NULL,
    p_post_data_postagem TEXT DEFAULT NULL,
    p_post_horario_postagem TEXT DEFAULT NULL,
    p_post_reprovado BOOLEAN DEFAULT FALSE,
    p_post_reprovado_comentario TEXT DEFAULT NULL,
    p_post_material_solicitado TEXT[] DEFAULT '{}'
) RETURNS public.tasks AS $$
DECLARE
    v_task public.tasks;
    v_user_name TEXT;
BEGIN
    SELECT name INTO v_user_name FROM public.users WHERE id = auth.uid();

    UPDATE public.tasks SET
        title = p_title, description = p_description, status = p_status, priority = p_priority, type = p_type, due_date = p_due_date,
        inauguracao_nome = p_inauguracao_nome, inauguracao_endereco = p_inauguracao_endereco, inauguracao_secretarias = p_inauguracao_secretarias,
        inauguracao_tipo = p_inauguracao_tipo, inauguracao_checklist = p_inauguracao_checklist, inauguracao_data = p_inauguracao_data,
        pauta_data = p_pauta_data, pauta_horario = p_pauta_horario, pauta_endereco = p_pauta_endereco, pauta_saida = p_pauta_saida,
        is_pauta_externa = p_is_pauta_externa, presenca_prefeito = p_presenca_prefeito, secretarias = p_secretarias,
        video_captacao_equipe = p_video_captacao_equipe, video_captacao_data = p_video_captacao_data, video_edicao_equipe = p_video_edicao_equipe,
        video_edicao_data = p_video_edicao_data, video_briefing = p_video_briefing, video_necessidades = p_video_necessidades, video_entrega_data = p_video_entrega_data,
        arte_tipo_pecas = p_arte_tipo_pecas, arte_entrega_data = p_arte_entrega_data,
        post_criacao_texto = p_post_criacao_texto, post_criacao_corrigido = p_post_criacao_corrigido, post_aprovado = p_post_aprovado,
        post_alterado_texto = p_post_alterado_texto, post_data_postagem = p_post_data_postagem, post_horario_postagem = p_post_horario_postagem,
        post_reprovado = p_post_reprovado, post_reprovado_comentario = p_post_reprovado_comentario, post_material_solicitado = p_post_material_solicitado
    WHERE id = p_task_id
    RETURNING * INTO v_task;

    DELETE FROM public.task_assignees WHERE task_id = p_task_id;
    IF p_assignee_ids IS NOT NULL AND array_length(p_assignee_ids, 1) > 0 THEN
        INSERT INTO public.task_assignees (task_id, user_id)
        SELECT p_task_id, unnest(p_assignee_ids);
    END IF;

    INSERT INTO public.task_logs (task_id, user_id, user_name, action_type, details)
    VALUES (v_task.id, auth.uid(), COALESCE(v_user_name, 'Sistema'), 'edit', 'Pauta editada via RPC Atômica (Full)');

    RETURN v_task;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [4] Permissões
GRANT EXECUTE ON FUNCTION public.create_task_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_task_atomic TO authenticated;

SELECT ' Motor de Pautas 100% Sincronizado e Blindado!' as status;
