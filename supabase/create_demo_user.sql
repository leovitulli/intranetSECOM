-- Criação do usuário genérico de demonstração para a Secretária de Comunicação
-- Execute este SQL no Supabase SQL Editor

-- 1. Criar a conta de auth do Supabase (note: substitua o UUID caso necessite)
-- O login será feito via Supabase Authentication normalmente.
-- Use o painel em Authentication > Users > "Add user" com:
--   Email: email@secom.br
--   Password: 1123mudar

-- 2. Após criar o usuário no painel, anote o UUID gerado e use aqui:
-- (Substitua 'COLOQUE-O-UUID-AQUI' pelo UUID real do Auth)

DO $$
DECLARE
    demo_user_id UUID;
BEGIN
    -- Tente encontrar o usuário de demo na tabela de auth
    SELECT id INTO demo_user_id FROM auth.users WHERE email = 'email@secom.br' LIMIT 1;

    IF demo_user_id IS NOT NULL THEN
        -- Inserir ou atualizar o perfil na tabela public.users
        INSERT INTO public.users (id, name, email, role, avatar_url, job_titles)
        VALUES (
            demo_user_id,
            'Demo SECOM',
            'email@secom.br',
            'viewer',  -- acesso somente leitura
            'https://ui-avatars.com/api/?name=Demo+SECOM&background=4F7BF7&color=fff',
            ARRAY['Demo']
        )
        ON CONFLICT (id) DO UPDATE
            SET name = 'Demo SECOM',
                role = 'viewer',
                job_titles = ARRAY['Demo'];

        RAISE NOTICE 'Usuário demo criado/atualizado com sucesso (ID: %)', demo_user_id;
    ELSE
        RAISE NOTICE 'ATENÇÃO: Usuário email@secom.br não encontrado em auth.users.';
        RAISE NOTICE 'Crie o usuário manualmente em Authentication > Users > Add user, então execute este script novamente.';
    END IF;
END $$;
