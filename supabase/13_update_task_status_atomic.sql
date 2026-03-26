
-- Nova RPC para atualização de status (movimentação de colunas) de forma atômica e segura
-- Esta função é SECURITY DEFINER para garantir integridade e o registro de logs mesmo para usuários comuns.

CREATE OR REPLACE FUNCTION public.update_task_status_atomic(
    p_task_id UUID,
    p_new_status TEXT
) RETURNS public.tasks AS $$
DECLARE
    v_task public.tasks;
    v_user_name TEXT;
    v_old_status TEXT;
BEGIN
    -- 1. Verificar permissão básica (Deve estar logado)
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acesso negado. Usuário não autenticado.';
    END IF;

    -- 2. Pegar informações do usuário e status atual
    SELECT name INTO v_user_name FROM public.users WHERE id = auth.uid();
    SELECT status INTO v_old_status FROM public.tasks WHERE id = p_task_id;

    -- 3. Executar o Update
    UPDATE public.tasks 
    SET 
        status = p_new_status,
        updated_at = now()
    WHERE id = p_task_id
    RETURNING * INTO v_task;

    -- 4. Registrar no Log
    IF v_old_status <> p_new_status THEN
        INSERT INTO public.task_logs (task_id, user_id, user_name, action_type, details)
        VALUES (
            p_task_id, 
            auth.uid(), 
            COALESCE(v_user_name, 'Sistema'), 
            'status_change', 
            'Moveu de ' || upper(v_old_status) || ' para ' || upper(p_new_status)
        );
    END IF;

    RETURN v_task;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir acesso aos usuários autenticados
GRANT EXECUTE ON FUNCTION public.update_task_status_atomic TO authenticated;
