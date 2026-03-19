-- 1. Melhorar a função de log para ser descritiva
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    change_msg TEXT := '';
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        -- Comparar campos específicos para gerar mensagens amigáveis
        IF (OLD.title IS DISTINCT FROM NEW.title) THEN
            change_msg := 'Título alterado';
        ELSIF (OLD.description IS DISTINCT FROM NEW.description) THEN
            change_msg := 'Descrição atualizada';
        ELSIF (OLD.pauta_data IS DISTINCT FROM NEW.pauta_data) THEN
            change_msg := 'Data da pauta alterada';
        ELSIF (OLD.pauta_horario IS DISTINCT FROM NEW.pauta_horario) THEN
            change_msg := 'Horário da pauta alterado';
        ELSIF (OLD.priority IS DISTINCT FROM NEW.priority) THEN
            change_msg := 'Prioridade alterada para ' || NEW.priority;
        ELSIF (OLD.secretaria IS DISTINCT FROM NEW.secretaria) THEN
            change_msg := 'Secretaria alterada';
        ELSE
            -- Se não for nenhum dos campos acima, mas houve update
            change_msg := 'Informações da pauta atualizadas';
        END IF;

        -- Evitar logs repetitivos de status que já são logados pelo frontend
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            RETURN NEW; -- O frontend já gera "Moveu de X para Y"
        END IF;

        INSERT INTO task_logs (task_id, user_id, action)
        VALUES (NEW.id, auth.uid(), change_msg);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
