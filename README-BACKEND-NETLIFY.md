# Guia de Implantação do Backend RepasseList GDM no Netlify

Este guia fornece instruções passo a passo para implantar o backend do RepasseList GDM na plataforma Netlify.

## Importante: Limitações do Netlify para Backend Node.js

O Netlify é otimizado principalmente para aplicações frontend estáticas e funções serverless. Para uma aplicação backend Node.js completa como o RepasseList GDM, recomendamos usar plataformas como **Render** (conforme documentado em README-BACKEND-RENDER.md) ou **Heroku**.

No entanto, se você ainda deseja usar o Netlify, pode implementar o backend como funções serverless (Netlify Functions). Este guia mostrará como fazer isso.

## Pré-requisitos

- Conta no [Netlify](https://www.netlify.com/)
- Conta no [Supabase](https://supabase.com/)
- Conta no [Google Cloud Platform](https://cloud.google.com/) com API Sheets habilitada
- Repositório Git com o código do projeto
- [Node.js](https://nodejs.org/) instalado localmente
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) instalado (`npm install netlify-cli -g`)

## Passo 1: Adaptar o Projeto para Netlify Functions

1. Crie uma pasta `netlify/functions` na raiz do projeto:

   ```bash
   mkdir -p netlify/functions
   ```

2. Crie um arquivo `api.js` dentro da pasta `netlify/functions` para servir como ponto de entrada para sua API:

   ```javascript
   // netlify/functions/api.js
   const express = require('express');
   const serverless = require('serverless-http');
   const path = require('path');
   require('dotenv').config();
   const sheets = require('../../src/googleSheets');
   const supabase = require('../../src/supabase');
   const bcrypt = require('bcrypt');
   const googleAuth = require('../../src/googleAuth');
   
   const app = express();
   const saltRounds = 10;
   
   // Middleware para permitir que o frontend acesse a API
   app.use((req, res, next) => {
       res.header('Access-Control-Allow-Origin', '*');
       res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-user-email');
       res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
       if (req.method === 'OPTIONS') {
           return res.sendStatus(200);
       }
       next();
   });
   
   // Middleware para interpretar o corpo das requisições como JSON
   app.use(express.json());
   
   // Copie todas as rotas do seu arquivo server.js para aqui
   // Por exemplo:
   
   // Rotas de autenticação
   app.post('/api/login', async (req, res) => {
       try {
           const { email, senha } = req.body;
   
           const user = await supabase.getUserByEmail(email);
           if (!user) {
               return res.status(401).json({ error: 'Credenciais inválidas' });
           }
   
           // Detecta se a senha armazenada é hash bcrypt
           const isHash = typeof user.senha === 'string' && user.senha.startsWith('$2');
           let match = false;
   
           if (isHash) {
               match = await bcrypt.compare(senha, user.senha);
           } else {
               // tentativa única com texto puro
               match = senha === user.senha;
               if (match) {
                   // upgrade: grava hash no banco
                   try {
                       const hashed = await bcrypt.hash(senha, saltRounds);
                       await supabase.updateUserPassword(user.id, hashed);
                   } catch (e) {
                       console.error('Falha ao atualizar hash de senha:', e);
                   }
               }
           }
   
           if (!match) {
               return res.status(401).json({ error: 'Credenciais inválidas' });
           }
   
           const { senha: _, ...userData } = user;
           res.json({ user: userData });
       } catch (error) {
           console.error('Erro ao fazer login:', error);
           res.status(500).json({ error: 'Erro ao fazer login' });
       }
   });
   
   // Adicione todas as outras rotas da sua API aqui...
   
   // Rota para sincronização via HTTP
   app.get('/api/sincronizar', async (req, res) => {
     try {
       const { sincronizarRegistros } = require('../../src/sincronizacao');
       const resultado = await sincronizarRegistros();
       res.json({ success: true, ...resultado });
     } catch (error) {
       console.error('Erro na sincronização:', error);
       res.status(500).json({ success: false, error: error.message });
     }
   });
   
   // Exportar a aplicação como uma função serverless
   module.exports.handler = serverless(app);
   ```

3. Instale as dependências necessárias:

   ```bash
   npm install serverless-http --save
   ```

4. Crie um arquivo `netlify.toml` na raiz do projeto:

   ```toml
   [build]
     command = "npm install"
     functions = "netlify/functions"
     publish = "public"
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/api/:splat"
     status = 200
   ```

## Passo 2: Configurar o Projeto no Netlify

1. Faça login no Netlify CLI:

   ```bash
   netlify login
   ```

2. Inicialize o projeto Netlify:

   ```bash
   netlify init
   ```

3. Siga as instruções para conectar seu repositório Git ou fazer deploy manual.

## Passo 3: Configurar Variáveis de Ambiente

1. No dashboard do Netlify, vá até o seu site e clique em "Site settings" > "Environment variables"
2. Adicione as seguintes variáveis:

   ```
   # Configurações do Supabase
   SUPABASE_URL=sua_url_do_supabase
   SUPABASE_KEY=sua_chave_do_supabase

   # Configurações do Google Sheets
   SPREADSHEET_ID=id_da_sua_planilha

   # Credenciais do Google
   GOOGLE_CLIENT_EMAIL=seu-email-de-servico@seu-projeto.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"

   # Configurações do servidor
   NODE_ENV=production
   ```

## Passo 4: Implantar o Serviço

1. Faça deploy do seu site:

   ```bash
   netlify deploy --prod
   ```

2. Após a conclusão, o Netlify fornecerá um URL para seu serviço (ex: `https://repasselist-gdm.netlify.app`)

## Passo 5: Verificar a Implantação

1. Acesse o URL fornecido pelo Netlify para verificar se o serviço está funcionando
2. Teste as rotas da API usando uma ferramenta como Postman ou o próprio navegador
   - As rotas da API estarão disponíveis em `https://seu-site.netlify.app/api/...`

## Passo 6: Configurar Sincronização Automática

Como o Netlify não suporta diretamente tarefas cron, você tem duas opções para configurar a sincronização automática:

### Opção 1: Usar o Netlify Scheduled Functions (recomendado)

1. Instale o pacote necessário:

   ```bash
   npm install @netlify/functions --save
   ```

2. Crie um arquivo `netlify/functions/scheduled-sync.js`:

   ```javascript
   const { schedule } = require('@netlify/functions');
   const fetch = require('node-fetch');

   // Executa a cada hora
   const handler = schedule('0 * * * *', async () => {
     try {
       const { sincronizarRegistros } = require('../../src/sincronizacao');
       await sincronizarRegistros();
       return {
         statusCode: 200,
         body: JSON.stringify({ message: 'Sincronização concluída com sucesso' }),
       };
     } catch (error) {
       console.error('Erro na sincronização:', error);
       return {
         statusCode: 500,
         body: JSON.stringify({ error: error.message }),
       };
     }
   });

   module.exports = { handler };
   ```

### Opção 2: Usar um serviço externo

1. Use um serviço como [cron-job.org](https://cron-job.org) para chamar o endpoint de sincronização periodicamente
2. Configure o serviço para acessar `https://seu-site.netlify.app/api/sincronizar` em intervalos regulares

## Limitações e Considerações

1. **Tempo de execução**: As funções do Netlify têm um limite de tempo de execução de 10 segundos para contas gratuitas e 26 segundos para contas pagas. Se suas operações de sincronização forem demoradas, considere usar outra plataforma como Render ou Heroku.

2. **Tamanho do pacote**: As funções do Netlify têm um limite de tamanho de 50MB para o pacote implantado. Certifique-se de que suas dependências não excedam esse limite.

3. **Conexões persistentes**: O Netlify Functions não é ideal para aplicações que precisam manter conexões persistentes (como WebSockets).

4. **Custo**: Verifique os limites da conta gratuita do Netlify e considere os custos se sua aplicação tiver alto tráfego.

## Conclusão

Embora seja possível implantar o backend do RepasseList GDM no Netlify usando funções serverless, recomendamos usar plataformas mais adequadas para aplicações backend Node.js completas, como Render (conforme documentado em README-BACKEND-RENDER.md) ou Heroku.

Se você encontrar limitações com o Netlify, considere migrar para uma dessas plataformas alternativas para uma experiência mais robusta e sem restrições para seu backend.