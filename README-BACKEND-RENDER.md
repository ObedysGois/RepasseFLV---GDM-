# Guia de Implantação do Backend RepasseList GDM no Render

Este guia fornece instruções passo a passo para implantar o backend do RepasseList GDM na plataforma Render.

## Pré-requisitos

- Conta no [Render](https://render.com/)
- Conta no [Supabase](https://supabase.com/)
- Conta no [Google Cloud Platform](https://cloud.google.com/) com API Sheets habilitada
- Repositório Git com o código do projeto

## Passo 1: Preparar o Repositório

1. Certifique-se de que seu código está em um repositório Git (GitHub, GitLab, Bitbucket)
2. Verifique se o arquivo `package.json` contém o script de inicialização correto:
   ```json
   "scripts": {
     "start": "node src/server.js"
   }
   ```
3. Certifique-se de que todas as dependências estão listadas no `package.json`

## Passo 2: Configurar o Projeto no Render

1. Faça login na sua conta do Render
2. Clique em "New" e selecione "Web Service"
3. Conecte seu repositório Git
4. Configure o serviço:
   - **Nome**: `repasselist-gdm-backend` (ou outro nome de sua preferência)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plano**: Selecione o plano adequado às suas necessidades (o plano gratuito é suficiente para testes)

## Passo 3: Configurar Variáveis de Ambiente

1. Na página de configuração do seu serviço no Render, vá até a seção "Environment Variables"
2. Adicione as seguintes variáveis:

   ```
   # Configurações do Supabase
   SUPABASE_URL=sua_url_do_supabase
   SUPABASE_KEY=sua_chave_do_supabase

   # Configurações do Google Sheets
   SPREADSHEET_ID=id_da_sua_planilha

   # Credenciais do Google (necessárias no Render)
   GOOGLE_CLIENT_EMAIL=sheets-editor@projeto-app-repasselist-gdm.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="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"

   # Configurações do servidor
   PORT=10000
   NODE_ENV=production
   ```

   > **Nota importante**: O Render usa a porta 10000 por padrão para serviços web. Certifique-se de definir PORT=10000 ou usar `process.env.PORT` no seu código.

## Passo 4: Implantar o Serviço

1. Clique em "Create Web Service" para iniciar a implantação
2. Aguarde o processo de build e deploy ser concluído
3. Após a conclusão, o Render fornecerá um URL para seu serviço (ex: `https://repasselist-gdm-backend.onrender.com`)

## Passo 5: Verificar a Implantação

1. Acesse o URL fornecido pelo Render para verificar se o serviço está funcionando
2. Teste as rotas da API usando uma ferramenta como Postman ou o próprio navegador

## Passo 6: Configurar Sincronização Automática

Como o Render não suporta diretamente tarefas cron, você tem duas opções para configurar a sincronização automática:

### Opção 1: Usar o Render Cron Jobs (recomendado)

1. No dashboard do Render, clique em "New" e selecione "Cron Job"
2. Configure o job:
   - **Nome**: `repasselist-gdm-sync`
   - **Schedule**: `0 * * * *` (executa a cada hora)
   - **Command**: `curl https://seu-servico.onrender.com/api/sincronizar`

### Opção 2: Implementar um endpoint de sincronização

1. Adicione a seguinte rota ao seu arquivo `server.js`:

   ```javascript
   // Rota para sincronização via HTTP
   app.get('/api/sincronizar', async (req, res) => {
     try {
       const { sincronizarRegistros } = require('./sincronizacao');
       const resultado = await sincronizarRegistros();
       res.json({ success: true, ...resultado });
     } catch (error) {
       console.error('Erro na sincronização:', error);
       res.status(500).json({ success: false, error: error.message });
     }
   });
   ```

2. Use um serviço externo como [cron-job.org](https://cron-job.org) para chamar este endpoint periodicamente

## Passo 7: Monitoramento e Logs

1. No dashboard do Render, acesse seu serviço
2. Vá para a aba "Logs" para visualizar os logs da aplicação
3. Configure alertas em "Settings" > "Alerts" para ser notificado sobre problemas

## Solução de Problemas Comuns

### Erro de conexão com o Supabase

- Verifique se as variáveis `SUPABASE_URL` e `SUPABASE_KEY` estão corretas
- Confirme se a API do Supabase está acessível e se as permissões estão configuradas corretamente

### Erro de autenticação do Google Sheets

- Verifique se as variáveis `GOOGLE_CLIENT_EMAIL` e `GOOGLE_PRIVATE_KEY` estão corretas
- Certifique-se de que a API Google Sheets está habilitada no console do Google Cloud
- Verifique se a conta de serviço tem permissão para acessar a planilha especificada

### Aplicação não inicia

- Verifique os logs no dashboard do Render
- Confirme se todas as dependências estão instaladas corretamente
- Verifique se o comando de inicialização está correto

## Recursos Adicionais

- [Documentação do Render](https://render.com/docs)
- [Documentação do Node.js no Render](https://render.com/docs/deploy-node-express-app)
- [Documentação do Supabase](https://supabase.com/docs)
- [Documentação da API Google Sheets](https://developers.google.com/sheets/api)

---

Para informações sobre a implantação do frontend, consulte o arquivo `README-FRONTEND-VERCEL.md`.