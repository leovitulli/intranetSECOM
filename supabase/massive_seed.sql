-- Script de Geração de Volume Maciço de Pautas
-- Execute no Editor SQL do Supabase.

DO $$
DECLARE
    i INT := 1;
    task_id UUID;
    random_status TEXT;
    random_type_idx INT;
    random_priority TEXT;
    random_creator TEXT;
    random_date TIMESTAMP;
    random_user_id UUID;
    types TEXT[] := ARRAY['{"release"}', '{"arte"}', '{"video"}', '{"release","arte"}', '{"arte","video"}'];
    statuses TEXT[] := ARRAY['solicitado', 'escrita', 'producao-arte', 'edicao-video', 'correcao', 'aprovacao-final', 'publicado'];
    priorities TEXT[] := ARRAY['baixa', 'media', 'alta'];
    creators TEXT[] := ARRAY['Leo Vitulli', 'Assessoria de Comunicação', 'Prefeito', 'Secretaria da Saúde'];
BEGIN
    -- Obter pelo menos um usuário para associar aos task logs ou assignees, se necessário
    SELECT id INTO random_user_id FROM public.users LIMIT 1;

    -- Gerar 50 tarefas retroativas e futuras
    FOR i IN 1..50 LOOP
        -- Escolher valores aleatórios
        random_status := statuses[1 + floor(random() * array_length(statuses, 1))];
        random_type_idx := 1 + floor(random() * array_length(types, 1));
        random_priority := priorities[1 + floor(random() * array_length(priorities, 1))];
        random_creator := creators[1 + floor(random() * array_length(creators, 1))];
        
        -- Gerar data entre -30 dias e +15 dias a partir de hoje
        random_date := (now() - interval '30 days') + (random() * (interval '45 days'));

        -- Inserir Tarefa
        INSERT INTO public.tasks (title, description, status, type, priority, creator, due_date, created_at)
        VALUES (
            'Pauta Gerada Automática ' || i || ' (' || random_status || ')',
            'Descrição fictícia de volume maciço para popular os relatórios de produtividade. Número: ' || i,
            random_status,
            types[random_type_idx]::text[],
            random_priority,
            random_creator,
            random_date,
            random_date - interval '3 days'
        ) RETURNING id INTO task_id;

        -- Inserir pelo menos um assignee se um usuário foi encontrado
        IF random_user_id IS NOT NULL THEN
            INSERT INTO public.task_assignees (task_id, user_id)
            VALUES (task_id, random_user_id) ON CONFLICT DO NOTHING;
            
            -- Inserir um log de exemplo
            INSERT INTO public.task_logs (task_id, user_id, user_name, action_type, details, created_at)
            VALUES (task_id, random_user_id, 'Sistema Fictício', 'status_change', 'Criado por script maciço.', random_date - interval '2 days');
        END IF;

    END LOOP;

    RAISE NOTICE 'Volume maciço de % pautas gerado com sucesso.', i - 1;
END $$;
