# RepasseList GDM - Sistema de Gerenciamento de Repasses

## Visão Geral

O RepasseList GDM é um sistema para gerenciamento de repasses de produtos, permitindo o controle de produtos, vendedores, motivos de repasse e outras informações relevantes. O sistema sincroniza dados entre o Google Sheets e o Supabase para manter as informações atualizadas.

## Requisitos

- Node.js (versão 14 ou superior)
- Conta no Supabase
- Conta no Google Cloud com API Sheets habilitada

## Configuração do Ambiente

### 1. Configuração do arquivo .env

O sistema utiliza variáveis de ambiente para configuração. Um arquivo `.env` deve ser criado na raiz do projeto com as seguintes variáveis:

```
# Configurações do Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_KEY=sua_chave_do_supabase

# Configurações do Google Sheets
SPREADSHEET_ID=id_da_sua_planilha

# Credenciais do Google (opcional, use apenas se não tiver o arquivo credentials.json)
# GOOGLE_CLIENT_EMAIL=seu-email-de-servico@seu-projeto.iam.gserviceaccount.com
# GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"

# Configurações do servidor
PORT=3000
NODE_ENV=production
```

### 2. Configuração das Credenciais do Google

Existem duas formas de configurar as credenciais do Google:

#### Opção 1: Usando arquivo credentials.json

Coloque o arquivo `credentials.json` obtido do Google Cloud Console na pasta `src/`.

#### Opção 2: Usando variáveis de ambiente

Descomente e preencha as variáveis `GOOGLE_CLIENT_EMAIL` e `GOOGLE_PRIVATE_KEY` no arquivo `.env`.

### 3. Instalação de Dependências

```bash
npm install
```

## Executando o Sistema

### Iniciar o Servidor

```bash
npm start
```

O servidor será iniciado na porta definida na variável de ambiente `PORT` (padrão: 3000).

### Sincronização Manual

Para sincronizar manualmente os dados do Google Sheets com o Supabase:

```bash
node sincronizar-supabase.js
```

### Configuração da Sincronização Automática

Para configurar a sincronização automática entre o Google Sheets e o Supabase:

```bash
node setup-sync.js
```

Este script configurará uma tarefa agendada para executar a sincronização a cada hora, de acordo com o sistema operacional:

- **Windows**: Cria uma tarefa no Task Scheduler
- **Linux/Mac**: Configura uma entrada no crontab

## Estrutura do Projeto

- `public/`: Arquivos estáticos do frontend
- `src/`: Código-fonte do backend
  - `server.js`: Ponto de entrada do servidor
  - `googleSheets.js`: Integração com Google Sheets
  - `supabase.js`: Integração com Supabase
  - `sincronizacao.js`: Lógica de sincronização
  - `credentials.json`: Credenciais do Google (se estiver usando arquivo)
- `sincronizar-supabase.js`: Script para sincronização manual
- `setup-sync.js`: Script para configurar sincronização automática
- `.env`: Arquivo de configuração de variáveis de ambiente

## Implantação em Produção

Para implantar o sistema em produção, recomenda-se:

1. Configurar um servidor Node.js em um provedor de hospedagem (Heroku, DigitalOcean, AWS, etc.)
2. Configurar as variáveis de ambiente no servidor
3. Configurar um proxy reverso (Nginx, Apache) para servir a aplicação
4. Configurar a sincronização automática usando o script `setup-sync.js`

## Suporte e Manutenção

Para manutenção do sistema, verifique regularmente:

1. Os logs de sincronização em `logs/sincronizacao.log`
2. O funcionamento correto da sincronização automática
3. A conexão com o Google Sheets e o Supabase

## Informações Adicionais

Para mais informações sobre a sincronização entre Google Sheets e Supabase, consulte o arquivo `README-sincronizacao.md`.

Para informações sobre a estrutura da tabela no Supabase, consulte o arquivo `README_SUPABASE.md`.