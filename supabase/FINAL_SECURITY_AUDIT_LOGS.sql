-- [SCENARIO 15] LOGS DE SEGURANÇA E AUDITORIA GLOBAL
-- Este script cria uma infraestrutura de log para eventos administrativos (usuários, cargos, secretarias).

-- -----------------------------------------------------------------------------
-- [1] TABELA DE LOGS DE SEGURANÇA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- quem fez a ação
    user_name TEXT, -- cópia do nome
    target_id UUID, -- ID do objeto afetado (se aplicável)
    target_type TEXT, -- 'user', 'job_function', 'secretaria'
    action_type TEXT, -- 'create', 'update', 'delete', 'login_grant', 'login_revoke'
    details TEXT NOT NULL, -- descritivo amigável em PT-BR
    ip_address TEXT, -- opcional
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Security Logs - Acesso Restrito" ON public.security_logs;
CREATE POLICY "Security Logs - Acesso Restrito" ON public.security_logs 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'desenvolvedor'))
);

-- -----------------------------------------------------------------------------
-- [2] TRIGGER PARA USUÁRIOS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_user_security_events()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_name TEXT;
    v_details TEXT;
BEGIN
    SELECT name INTO v_admin_name FROM public.users WHERE id = auth.uid();
    IF v_admin_name IS NULL THEN v_admin_name := 'Sistema'; END IF;

    IF (TG_OP = 'INSERT') THEN
        v_details := 'Novo membro da equipe adicinado: ' || NEW.name || ' (Pefil: ' || NEW.role || ')';
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.role IS DISTINCT FROM NEW.role) THEN
            v_details := 'Perfil de ' || NEW.name || ' alterado de ' || OLD.role || ' para ' || NEW.role;
        ELSIF (OLD.has_login IS DISTINCT FROM NEW.has_login) THEN
            IF NEW.has_login THEN
                v_details := 'Acesso ao sistema concedido para ' || NEW.name;
            ELSE
                v_details := 'Acesso ao sistema removido para ' || NEW.name;
            END IF;
        ELSE
            v_details := 'Dados cadastrais de ' || NEW.name || ' atualizados';
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_details := 'Membro da equipe removido: ' || OLD.name;
    END IF;

    INSERT INTO public.security_logs (user_id, user_name, target_id, target_type, action_type, details)
    VALUES (auth.uid(), v_admin_name, COALESCE(NEW.id, OLD.id), 'user', lower(TG_OP), v_details);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_user_security ON public.users;
CREATE TRIGGER tr_log_user_security
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.log_user_security_events();

-- -----------------------------------------------------------------------------
-- [3] TRIGGER PARA CONFIGURAÇÕES (Cargos e Secretarias)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_config_security_events()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_name TEXT;
    v_details TEXT;
    v_type TEXT;
BEGIN
    SELECT name INTO v_admin_name FROM public.users WHERE id = auth.uid();
    IF v_admin_name IS NULL THEN v_admin_name := 'Sistema'; END IF;

    v_type := TG_TABLE_NAME; -- 'job_functions' ou 'secretarias'

    IF (TG_OP = 'INSERT') THEN
        v_details := 'Novo ' || v_type || ' cadastrado: ' || COALESCE(NEW.title, NEW.nome);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_details := 'Nome de ' || v_type || ' alterado: de "' || COALESCE(OLD.title, OLD.nome) || '" para "' || COALESCE(NEW.title, NEW.nome) || '"';
    ELSIF (TG_OP = 'DELETE') THEN
        v_details := v_type || ' excluído: ' || COALESCE(OLD.title, OLD.nome);
    END IF;

    INSERT INTO public.security_logs (user_id, user_name, target_id, target_type, action_type, details)
    VALUES (auth.uid(), v_admin_name, COALESCE(NEW.id, OLD.id), v_type, lower(TG_OP), v_details);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_job_functions ON public.job_functions;
CREATE TRIGGER tr_log_job_functions
AFTER INSERT OR UPDATE OR DELETE ON public.job_functions
FOR EACH ROW EXECUTE FUNCTION public.log_config_security_events();

DROP TRIGGER IF EXISTS tr_log_secretarias ON public.secretarias;
CREATE TRIGGER tr_log_secretarias
AFTER INSERT OR UPDATE OR DELETE ON public.secretarias
FOR EACH ROW EXECUTE FUNCTION public.log_config_security_events();

-- -----------------------------------------------------------------------------
-- [4] ATUALIZAR TASK LOGS PARA LINGUAGEM AMIGÁVEL
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_task_details_ptbr()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_details TEXT := '';
BEGIN
    SELECT name INTO v_user_name FROM public.users WHERE id = auth.uid();
    IF v_user_name IS NULL THEN v_user_name := 'Sistema'; END IF;

    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            v_details := 'Moveu a pauta da coluna "' || OLD.status || '" para "' || NEW.status || '"';
            
            INSERT INTO public.task_logs (task_id, user_id, user_name, action_type, details)
            VALUES (NEW.id, auth.uid(), v_user_name, 'status_change', v_details);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
