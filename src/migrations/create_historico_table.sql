-- Criação da tabela historico
CREATE TABLE IF NOT EXISTS historico (
    id SERIAL PRIMARY KEY,
    data TIMESTAMP WITH TIME ZONE NOT NULL,
    usuario TEXT NOT NULL,
    acao TEXT NOT NULL,
    detalhes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adiciona índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico(data);
CREATE INDEX IF NOT EXISTS idx_historico_usuario ON historico(usuario);
CREATE INDEX IF NOT EXISTS idx_historico_acao ON historico(acao);