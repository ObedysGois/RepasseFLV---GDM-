# Guia de Implantação do Frontend RepasseList GDM na Vercel

Este guia fornece instruções passo a passo para implantar o frontend do RepasseList GDM na plataforma Vercel, uma das melhores opções para hospedagem de aplicações frontend.

## Pré-requisitos

- Conta na [Vercel](https://vercel.com/)
- Repositório Git com o código do projeto
- Backend já implantado (preferencialmente no Render, conforme o guia `README-BACKEND-RENDER.md`)

## Passo 1: Preparar o Frontend

1. Crie um arquivo de configuração para ambiente de produção

   Crie um arquivo chamado `.env.production` na raiz do projeto frontend com o seguinte conteúdo:

   ```
   VITE_API_URL=https://seu-backend.onrender.com
   ```

   Substitua `https://seu-backend.onrender.com` pela URL do seu backend implantado no Render.

2. Atualize o arquivo `public/script.js` para usar a URL da API do ambiente:

   ```javascript
   // No início do arquivo
   const API_URL = import.meta.env.VITE_API_URL || '';
   
   // Substitua todas as chamadas de API para usar API_URL
   // Exemplo:
   // De: fetch('/api/registros')
   // Para: fetch(`${API_URL}/api/registros`)
   ```

3. Crie um arquivo `vercel.json` na raiz do projeto para configurar redirecionamentos:

   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ],
     "headers": [
       {
         "source": "/(.*)\\.(js|css|json|png|jpg|svg)",
         "headers": [
           { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
         ]
       }
     ]
   }
   ```

## Passo 2: Configurar o Projeto na Vercel

1. Faça login na sua conta da Vercel
2. Clique em "Add New..." > "Project"
3. Importe seu repositório Git
4. Configure o projeto:
   - **Framework Preset**: Selecione "Other" (ou o framework que você está usando, se aplicável)
   - **Root Directory**: Deixe em branco se o frontend estiver na raiz do repositório, ou especifique o diretório (ex: `frontend`)
   - **Build Command**: Se estiver usando um bundler como Webpack ou Vite, use o comando de build apropriado (ex: `npm run build`). Se for um frontend simples com HTML/CSS/JS, pode deixar em branco.
   - **Output Directory**: Se estiver usando um bundler, especifique o diretório de saída (geralmente `dist` ou `build`). Caso contrário, deixe em branco.

## Passo 3: Configurar Variáveis de Ambiente

1. Na página de configuração do projeto, vá até a aba "Environment Variables"
2. Adicione a seguinte variável:
   - **Nome**: `VITE_API_URL`
   - **Valor**: URL do seu backend (ex: `https://repasselist-gdm-backend.onrender.com`)
3. Certifique-se de que a variável está configurada para todos os ambientes (Production, Preview, Development)

## Passo 4: Implantar o Frontend

1. Clique em "Deploy" para iniciar a implantação
2. Aguarde o processo de build e deploy ser concluído
3. Após a conclusão, a Vercel fornecerá um URL para seu site (ex: `https://repasselist-gdm.vercel.app`)

## Passo 5: Configurar Domínio Personalizado (Opcional)

1. Na página do seu projeto na Vercel, vá até a aba "Domains"
2. Clique em "Add" e siga as instruções para adicionar seu domínio personalizado
3. Configure os registros DNS conforme indicado pela Vercel
4. Aguarde a propagação DNS (pode levar até 48 horas)

## Passo 6: Verificar a Implantação

1. Acesse o URL fornecido pela Vercel para verificar se o frontend está funcionando
2. Teste a integração com o backend realizando operações como login e visualização de dados

## Passo 7: Configurar Implantação Contínua

A Vercel já configura automaticamente a implantação contínua a partir do seu repositório Git. Cada vez que você fizer um push para a branch principal, a Vercel irá reimplantar o frontend.

## Solução de Problemas Comuns

### Erro de CORS

- Verifique se o backend está configurado para aceitar requisições do domínio do frontend
- Adicione o domínio do frontend à lista de origens permitidas no backend:

  ```javascript
  // No arquivo server.js do backend
  app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', 'https://seu-frontend.vercel.app');
      // Ou para permitir múltiplos domínios:
      // const allowedOrigins = ['https://seu-frontend.vercel.app', 'https://seu-dominio-personalizado.com'];
      // const origin = req.headers.origin;
      // if (allowedOrigins.includes(origin)) {
      //     res.header('Access-Control-Allow-Origin', origin);
      // }
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-user-email');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') {
          return res.sendStatus(200);
      }
      next();
  });
  ```

### Erro de Conexão com o Backend

- Verifique se a URL do backend está correta nas variáveis de ambiente
- Confirme se o backend está em execução e acessível
- Verifique se as chamadas de API no frontend estão usando a URL correta

### Problemas de Roteamento

- Verifique se o arquivo `vercel.json` está configurado corretamente
- Certifique-se de que todas as rotas do frontend estão sendo tratadas adequadamente

## Otimizações Recomendadas

1. **Minificação e Bundling**: Use ferramentas como Webpack, Vite ou Parcel para minificar e agrupar seus arquivos JavaScript e CSS
2. **Lazy Loading**: Implemente carregamento preguiçoso para componentes e rotas que não são necessários imediatamente
3. **Caching**: Configure cabeçalhos de cache adequados para recursos estáticos
4. **Compressão de Imagens**: Otimize imagens usando formatos modernos como WebP
5. **CDN**: A Vercel já fornece CDN global por padrão, aproveitando-o para melhorar o desempenho

## Recursos Adicionais

- [Documentação da Vercel](https://vercel.com/docs)
- [Guia de Implantação na Vercel](https://vercel.com/guides/deploying-react-with-vercel)
- [Otimização de Performance Frontend](https://web.dev/fast)

---

Para informações sobre a implantação do backend, consulte o arquivo `README-BACKEND-RENDER.md`.