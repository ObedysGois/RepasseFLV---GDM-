# Configuração do Banco de Dados Supabase

## Tabela `historico`

Para que o histórico de edições funcione corretamente, é necessário criar a tabela `historico` no seu projeto do Supabase.

### Estrutura da Tabela

A tabela `historico` deve ter a seguinte estrutura:

```sql
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
```

### Como criar a tabela

1. Acesse o painel do seu projeto no [Supabase](https://app.supabase.io/)
2. Vá para a seção "Table Editor" no menu lateral
3. Clique em "New Table"
4. Nomeie a tabela como `historico`
5. Adicione as colunas conforme a estrutura acima:
   - `id` (SERIAL, PRIMARY KEY)
   - `data` (TIMESTAMP WITH TIME ZONE, NOT NULL)
   - `usuario` (TEXT, NOT NULL)
   - `acao` (TEXT, NOT NULL)
   - `detalhes` (TEXT, NOT NULL)
   - `created_at` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())
6. Crie os índices para as colunas `data`, `usuario` e `acao`

### Script SQL

Você também pode executar o script SQL disponível em `src/migrations/create_historico_table.sql` diretamente no editor SQL do Supabase:

1. Acesse a seção "SQL" no menu lateral do Supabase
2. Cole o conteúdo do arquivo `src/migrations/create_historico_table.sql`
3. Clique em "Run" para executar o script

Após criar a tabela, o histórico de edições será salvo corretamente no Supabase além de ser armazenado localmente no navegador. 