-- Migration: Adicionar colunas para a aba de Arte
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS arte_tipo_pecas TEXT,
ADD COLUMN IF NOT EXISTS arte_entrega_data DATE;

COMMENT ON COLUMN tasks.arte_tipo_pecas IS 'Descrição dos tipos de peças de arte a serem produzidas';
COMMENT ON COLUMN tasks.arte_entrega_data IS 'Prazo de entrega das artes';
