-- 🧹 LIMPEZA DE CADASTRO TRAVADO (REMEDIAÇÃO)
-- Se o sistema disser que o e-mail já existe mas ele não aparece na lista, rode este script.
-- Isso vai "limpar" o rastro do usuário para que você possa cadastrá-lo do zero.

DO $$
DECLARE
    target_email TEXT := 'iamguiluiz@gmail.com'; -- ALTERE O E-MAIL AQUI SE NECESSÁRIO
    target_id UUID;
BEGIN
    -- 1. Tentar localizar o ID do usuário pelo e-mail
    SELECT id INTO target_id FROM auth.users WHERE email = target_email;
    
    IF target_id IS NOT NULL THEN
        -- 2. Remover em cascata manual (Identidades, Perfil Público e Auth)
        DELETE FROM auth.identities WHERE user_id = target_id;
        DELETE FROM public.users WHERE id = target_id;
        DELETE FROM auth.users WHERE id = target_id;
        
        RAISE NOTICE 'Usuário % (ID: %) foi completamente removido do sistema.', target_email, target_id;
    ELSE
        -- 3. Caso esteja apenas na tabela pública por algum erro anterior
        DELETE FROM public.users WHERE email = target_email;
        RAISE NOTICE 'Usuário % não estava no Auth, mas limpamos qualquer rastro na tabela pública.', target_email;
    END IF;
END $$;

SELECT 'Limpeza concluída! Tente cadastrar o usuário novamente agora.' as status;
