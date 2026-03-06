-- Script de Geração de Volume Maciço de Pautas (Focado)
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
    creators TEXT[] := ARRAY['Leo Vitulli', 'Assessoria de Comunicação', 'Prefeito', 'Secretaria da Saúde', 'Obras'];
BEGIN
    SELECT id INTO random_user_id FROM public.users LIMIT 1;

    -- Gerar 80 tarefas concentradas (60% na semana atual)
    FOR i IN 1..80 LOOP
        random_status := statuses[1 + floor(random() * array_length(statuses, 1))];
        random_type_idx := 1 + floor(random() * array_length(types, 1));
        random_priority := priorities[1 + floor(random() * array_length(priorities, 1))];
        random_creator := creators[1 + floor(random() * array_length(creators, 1))];
        
        -- Concentrar datas:
        -- 40% Hoje/Ontem/Amanhã
        -- 40% Nesta semana
        -- 20% Neste Mês
        IF random() < 0.4 THEN
            random_date := now() + (random() * interval '2 days' - interval '1 day');
        ELSIF random() < 0.8 THEN
            random_date := now() + (random() * interval '10 days' - interval '5 days');
        ELSE
            random_date := now() + (random() * interval '30 days' - interval '15 days');
        END IF;

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

        IF random_user_id IS NOT NULL THEN
            INSERT INTO public.task_assignees (task_id, user_id)
            VALUES (task_id, random_user_id) ON CONFLICT DO NOTHING;
            
            INSERT INTO public.task_logs (task_id, user_id, user_name, action_type, details, created_at)
            VALUES (task_id, random_user_id, 'Sistema Fictício', 'status_change', 'Criado por script maciço concentrado.', random_date - interval '2 days');
        END IF;

    END LOOP;

    RAISE NOTICE 'Volume maciço focado de % pautas gerado com sucesso.', i - 1;
END $$;
