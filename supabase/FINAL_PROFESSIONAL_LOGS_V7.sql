-- 1. APAGAR A FUNÇÃO COM CASCADE
DROP FUNCTION IF EXISTS log_task_changes() CASCADE;

-- 2. CRIAR A FUNÇÃO DE LOG PRO (BUSCANDO NOME DO USUÁRIO AUTOMATICAMENTE)
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    detail_msg TEXT := '';
    u_name TEXT := 'Sistema'; -- Default caso não ache o nome
BEGIN
    -- BUSCAR O NOME DO USUÁRIO NA TABELA PROFILES
    SELECT full_name INTO u_name FROM profiles WHERE id = auth.uid();

    IF (TG_OP = 'UPDATE') THEN
        -- MONITORANDO CAMPOS GARANTIDOS
        IF (OLD.title IS DISTINCT FROM NEW.title) THEN
            detail_msg := detail_msg || 'Alterou o título da pauta. ';
        END IF;
        
        IF (OLD.description IS DISTINCT FROM NEW.description) THEN
            detail_msg := detail_msg || 'Atualizou a descrição. ';
        END IF;

        IF (OLD.pauta_data IS DISTINCT FROM NEW.pauta_data) THEN
            detail_msg := detail_msg || 'Alterou a data para ' || to_char(NEW.pauta_data, 'DD/MM/YYYY') || '. ';
        END IF;

        IF (OLD.priority IS DISTINCT FROM NEW.priority) THEN
            detail_msg := detail_msg || 'Mudou a prioridade para ' || upper(NEW.priority) || '. ';
        END IF;

        -- MONITORAMENTO DE ANEXOS
        IF (OLD.attachments IS DISTINCT FROM NEW.attachments) THEN
            IF (jsonb_array_length(COALESCE(NEW.attachments, '[]')) > jsonb_array_length(COALESCE(OLD.attachments, '[]'))) THEN
                detail_msg := detail_msg || 'Anexou novas fotos/arquivos. ';
            ELSIF (jsonb_array_length(COALESCE(NEW.attachments, '[]')) < jsonb_array_length(COALESCE(OLD.attachments, '[]'))) THEN
                detail_msg := detail_msg || 'Removeu fotos/arquivos anexados. ';
            ELSE
                detail_msg := detail_msg || 'Atualizou a lista de anexos. ';
            END IF;
        END IF;

        -- SE HOUVE ALGUMA MUDANÇA REAL REGISTRADA NA MENSAGEM
        IF (detail_msg <> '') THEN
            INSERT INTO task_logs (task_id, user_id, user_name, details)
            VALUES (NEW.id, auth.uid(), u_name, trim(detail_msg));
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RE-CRIAR O TRIGGER
CREATE TRIGGER tr_log_task_changes
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION log_task_changes();
