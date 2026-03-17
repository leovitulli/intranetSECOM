-- Migration: Adicionar colunas de controle de produção de vídeo
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS video_captacao_equipe text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_captacao_data date,
ADD COLUMN IF NOT EXISTS video_edicao_equipe text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_edicao_data date,
ADD COLUMN IF NOT EXISTS video_briefing text,
ADD COLUMN IF NOT EXISTS video_necessidades text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS video_entrega_data date;

COMMENT ON COLUMN tasks.video_captacao_equipe IS 'Equipe responsável pela captação das imagens';
COMMENT ON COLUMN tasks.video_captacao_data IS 'Data em que a captação foi ou será realizada';
COMMENT ON COLUMN tasks.video_edicao_equipe IS 'Equipe responsável pela edição e finalização';
COMMENT ON COLUMN tasks.video_edicao_data IS 'Previsão ou data de realização da edição';
COMMENT ON COLUMN tasks.video_entrega_data IS 'Prazo limite para a entrega do vídeo final';
