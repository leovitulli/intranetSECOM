-- 🛠️ CORREÇÃO DE CRIAÇÃO DE USUÁRIOS (RPC SECURE)
-- Execute este script no SQL Editor do Supabase se o cadastro de novos membros travar.

-- [1] Habilitar extensão de criptografia (pode já estar ativa)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- [2] Limpeza da assinatura antiga (Necessário para renomear parâmetros)
DROP FUNCTION IF EXISTS public.create_new_user_with_auth(text,text,text,text,text[],text,boolean);

-- [3] Função RPC para criar usuário com Auth e Perfil Público simultaneamente
CREATE OR REPLACE FUNCTION public.create_new_user_with_auth(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role_name TEXT,
  p_job_titles_list TEXT[],
  p_avatar_url_val TEXT DEFAULT '',
  p_has_login_val BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Verificar se já existe (evita erro 500 silencioso)
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'E-mail "%" já está registrado no sistema de autenticação.', p_email;
  END IF;

  -- 1. Criar a conta de Auth (senha criptografada no padrão blowfish)
  -- Nota: O UUID é gerado automaticamente se omitido, mas gen_random_uuid() é explícito aqui.
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- 2. Vincular Identidade (exigido para login funcional)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id, -- Necessário em versões novas
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', p_email, 'email_verified', true, 'phone_verified', false),
    'email',
    p_email, -- provider_id geralmente é o e-mail no provedor 'email'
    now(),
    now(),
    now()
  );

  -- 3. Criar Perfil Público (tabela users)
  INSERT INTO public.users (id, name, email, role, job_titles, avatar_url, has_login)
  VALUES (new_user_id, p_full_name, p_email, p_role_name, p_job_titles_list, p_avatar_url_val, p_has_login_val);

  -- 4. Audit Log
  INSERT INTO public.task_logs (user_name, action_type, details)
  VALUES ('Sistema', 'user_creation', 'Novo usuário criado: ' || p_full_name);

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [3] Permissões para Admins e Desenvolvedores chamarem a função
REVOKE EXECUTE ON FUNCTION public.create_new_user_with_auth(text,text,text,text,text[],text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_new_user_with_auth(text,text,text,text,text[],text,boolean) TO authenticated;

SELECT 'RPC de criação de usuários pronto para uso!' as status;
