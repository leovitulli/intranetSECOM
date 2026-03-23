-- ALERTA TÁTICO: RODAR ESSE SCRIPT NO SQL EDITOR DO SUPABASE PARA ATIVAR O AGENDAMENTO DE POSTS

-- 1. Criação das novas colunas na tabela principal (caso não existam)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS post_data_postagem TEXT,
ADD COLUMN IF NOT EXISTS post_horario_postagem TEXT;

-- 2. Atualizar a RPC de criação atômica para aceitar os campos de Agendamento do Post
CREATE OR REPLACE FUNCTION public.create_task_atomic(
    p_title TEXT,
    p_description TEXT DEFAULT '',
    p_status TEXT DEFAULT 'solicitacao',
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
        title, 
        description, 
        status, 
        priority, 
        type, 
        creator, 
        due_date,
        inauguracao_nome, 
        inauguracao_endereco, 
        inauguracao_secretarias, 
        inauguracao_tipo, 
        inauguracao_checklist, 
        inauguracao_data,
        pauta_data, 
        pauta_horario, 
        pauta_endereco, 
        pauta_saida, 
        is_pauta_externa,
        video_captacao_equipe, 
        video_captacao_data, 
        video_edicao_equipe, 
        video_edicao_data, 
        video_briefing, 
        video_necessidades, 
        video_entrega_data,
        arte_tipo_pecas, 
        arte_entrega_data,
        post_criacao_texto, 
        post_criacao_corrigido, 
        post_aprovado, 
        post_alterado_texto,
        post_data_postagem,
        post_horario_postagem,
        post_reprovado, 
        post_reprovado_comentario,
        post_material_solicitado
    )
    VALUES (
        p_title, 
        COALESCE(p_description, ''), 
        COALESCE(p_status, 'solicitacao'), 
        COALESCE(p_priority, 'baixa'), 
        COALESCE(p_type, '{}'), 
        COALESCE(p_creator, 'Sistema'), 
        p_due_date,
        p_inauguracao_nome, 
        p_inauguracao_endereco, 
        COALESCE(p_inauguracao_secretarias, '{}'), 
        p_inauguracao_tipo, 
        p_inauguracao_checklist, 
        p_inauguracao_data,
        p_pauta_data, 
        p_pauta_horario, 
        p_pauta_endereco, 
        p_pauta_saida, 
        p_is_pauta_externa,
        COALESCE(p_video_captacao_equipe, '{}'), 
        p_video_captacao_data, 
        COALESCE(p_video_edicao_equipe, '{}'), 
        p_video_edicao_data, 
        p_video_briefing, 
        COALESCE(p_video_necessidades, '{}'), 
        p_video_entrega_data,
        p_arte_tipo_pecas, 
        p_arte_entrega_data,
        p_post_criacao_texto, 
        COALESCE(p_post_criacao_corrigido, FALSE), 
        COALESCE(p_post_aprovado, FALSE), 
        p_post_alterado_texto,
        p_post_data_postagem,
        p_post_horario_postagem,
        COALESCE(p_post_reprovado, FALSE), 
        p_post_reprovado_comentario,
        COALESCE(p_post_material_solicitado, '{}')
    )
    RETURNING * INTO v_task;

    IF p_assignee_ids IS NOT NULL AND array_length(p_assignee_ids, 1) > 0 THEN
        INSERT INTO public.task_assignees (task_id, user_id)
        SELECT v_task.id, unnest(p_assignee_ids);
    END IF;

    INSERT INTO public.task_logs (task_id, user_id, user_name, action_type, details)
    VALUES (v_task.id, auth.uid(), COALESCE(v_user_name, 'Sistema'), 'create', 'Pauta criada via RPC Atômica com Agendamento de Post');

    RETURN v_task;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
