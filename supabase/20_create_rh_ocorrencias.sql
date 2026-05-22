-- 1. Add cod_funcional to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS cod_funcional VARCHAR(50);

-- 2. Create rh_ocorrencias table
CREATE TABLE IF NOT EXISTS rh_ocorrencias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL, -- Ocorrência, Serviço Externo, 115, Folga de Plantão, Atestado Médico, Home Office, Pauta
    turno VARCHAR(50) NOT NULL, -- Manhã, Tarde, Noite, Dia todo
    data_ocorrencia DATE NOT NULL,
    descricao TEXT,
    anexo_url TEXT,
    status VARCHAR(50) DEFAULT 'Pendente', -- Pendente, Aprovado, Rejeitado
    aprovado_por VARCHAR(100), -- Nome do gestor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE rh_ocorrencias ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Usuário comum só pode ler suas próprias ocorrências
CREATE POLICY "Users can view their own occurrences" ON rh_ocorrencias
    FOR SELECT USING (auth.uid() = user_id);

-- Usuário comum só pode criar ocorrências no seu nome
CREATE POLICY "Users can insert their own occurrences" ON rh_ocorrencias
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todas
CREATE POLICY "Admins can view all occurrences" ON rh_ocorrencias
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'desenvolvedor')
        )
    );

-- Admins podem atualizar qualquer ocorrência (para Aprovar/Rejeitar)
CREATE POLICY "Admins can update occurrences" ON rh_ocorrencias
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'desenvolvedor')
        )
    );
