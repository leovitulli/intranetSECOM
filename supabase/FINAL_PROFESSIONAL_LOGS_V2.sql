-- 1. APAGAR A FUNÇÃO COM CASCADE (ISSO APAGA TODOS OS TRIGGERS QUE DEPENDEREM DELA)
DROP FUNCTION IF EXISTS log_task_changes() CASCADE;

-- 2. CRIAR A FUNÇÃO DE LOG DETECTIVE (PROFISSIONAL)
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    detail_msg TEXT := '';
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        -- COMPARANDO CADA CAMPO E CONCATENANDO AS MUDANÇAS
        IF (OLD.title IS DISTINCT FROM NEW.title) THEN
            detail_msg := detail_msg || 'Alterou o título da pauta. ';
        END IF;
        
        IF (OLD.description IS DISTINCT FROM NEW.description) THEN
            detail_msg := detail_msg || 'Atualizou a descrição. ';
        END IF;

        IF (OLD.pauta_data IS DISTINCT FROM NEW.pauta_data) THEN
            detail_msg := detail_msg || 'Alterou a data para ' || to_char(NEW.pauta_data, 'DD/MM/YYYY') || '. ';
        END IF;

        IF (OLD.pauta_horario IS DISTINCT FROM NEW.pauta_horario) THEN
            detail_msg := detail_msg || 'Alterou o horário para ' || NEW.pauta_horario || '. ';
        END IF;

        IF (OLD.priority IS DISTINCT FROM NEW.priority) THEN
            detail_msg := detail_msg || 'Mudou a prioridade para ' || upper(NEW.priority) || '. ';
        END IF;

        -- SE HOUVE ALGUMA MUDANÇA REAL REGISTRADA NA MENSAGEM
        IF (detail_msg <> '') THEN
            INSERT INTO task_logs (task_id, user_id, action)
            VALUES (NEW.id, auth.uid(), trim(detail_msg));
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RE-CRIAR O TRIGGER COM O NOME PADRÃO
CREATE TRIGGER tr_log_task_changes
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION log_task_changes();
