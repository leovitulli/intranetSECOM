-- 🛠️ SOLUÇÃO DEFINITIVA: SINCRONIZAÇÃO ATÔMICA (SEM DEADLOCK)
-- Este script resolve o travamento em "Processando" eliminando o conflito entre a RPC e o Trigger.

-- [1] Habilitar extensões
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- [2] ATUALIZAR O TRIGGER (O único responsável pela tabela pública)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, avatar, job_titles, has_login)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role_name', 'user'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://ui-avatars.com/api/?name=' || NEW.email),
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

-- [3] ATUALIZAR A FUNÇÃO RPC (Foca apenas na Autenticação)
DROP FUNCTION IF EXISTS public.create_new_user_with_auth(text,text,text,text,text[],text,boolean);

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
  -- Verificar se já existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'E-mail "%" já está registrado.', p_email;
  END IF;

  -- 1. Criar a conta de Auth (Isso dispara o Trigger automaticamente)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
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
    jsonb_build_object(
        'full_name', p_full_name,
        'role_name', p_role_name,
        'job_titles', p_job_titles_list,
        'avatar_url', p_avatar_url_val,
        'has_login', p_has_login_val
    ),
    now(),
    now()
  )
  RETURNING id INTO new_user_id;

  -- 2. Vincular Identidade
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', p_email, 'email_verified', true),
    'email',
    p_email,
    now(),
    now(),
    now()
  );

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [4] Permissões
GRANT EXECUTE ON FUNCTION public.create_new_user_with_auth TO authenticated;

SELECT 'Motor de usuários sincronizado! Execute o CLEAN e tente novamente.' as status;
