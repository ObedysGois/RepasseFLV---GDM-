# Solução para o Erro de Login no Render

## Problemas Identificados

Os problemas na aplicação hospedada no Render ocorriam devido a três fatores principais:

1. O frontend estava tentando acessar a API em `http://localhost:3000/api`, que é um endereço local e não funciona quando a aplicação está hospedada no Render.
2. O servidor não estava configurado para servir os arquivos estáticos corretamente no ambiente de produção.
3. A função `apiFetch` estava adicionando a porta explicitamente na URL (usando a porta 8080), o que causava erros nas chamadas para as APIs de histórico e usuários.

## Alterações Realizadas

### 1. Atualização do Frontend (script.js)

Modificamos o arquivo `script.js` para detectar automaticamente o ambiente e usar a URL da API correta:

```javascript
// Antes
const apiUrl = 'http://localhost:3000/api';

// Depois
const isProduction = window.location.hostname !== 'localhost';
const apiUrl = isProduction ? '/api' : 'http://localhost:3000/api';
```

Esta alteração faz com que o frontend use `/api` quando estiver em produção (no Render) e continue usando `http://localhost:3000/api` quando estiver em desenvolvimento local.

### 2. Correção da função apiFetch

Modificamos a função `apiFetch` para não adicionar a porta explicitamente na URL quando em produção:

```javascript
// Antes
async function apiFetch(path, init = {}) {
  const current = getCurrentUser();
  const headers = Object.assign({}, init.headers || {}, {
    'Content-Type': 'application/json',
    'x-user-email': current?.email || ''
  });
  // Usar a porta do servidor atual (8080 ou 3000)
  const serverPort = window.location.port || '8080';
  const serverHost = window.location.hostname || 'localhost';
  const serverProtocol = window.location.protocol || 'http:';
  return fetch(`${serverProtocol}//${serverHost}:${serverPort}${path}`, { ...init, headers });
}

// Depois
async function apiFetch(path, init = {}) {
  const current = getCurrentUser();
  const headers = Object.assign({}, init.headers || {}, {
    'Content-Type': 'application/json',
    'x-user-email': current?.email || ''
  });
  
  // Determinar a URL base da API com base no ambiente
  const isProduction = window.location.hostname !== 'localhost';
  let baseUrl;
  
  if (isProduction) {
    // Em produção, use a URL relativa sem especificar a porta
    baseUrl = '';
  } else {
    // Em desenvolvimento local, use a porta específica
    const serverPort = window.location.port || '3000';
    const serverHost = window.location.hostname || 'localhost';
    const serverProtocol = window.location.protocol || 'http:';
    baseUrl = `${serverProtocol}//${serverHost}:${serverPort}`;
  }
  
  return fetch(`${baseUrl}${path}`, { ...init, headers });
}
```

Esta alteração corrige os erros nas chamadas para as APIs de histórico e usuários, permitindo que essas funcionalidades funcionem corretamente no ambiente de produção.

### 3. Configuração do Servidor (server-api-only.js)

Atualizamos o arquivo `server-api-only.js` para servir os arquivos estáticos da pasta `public`:

```javascript
// Adicionado middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, '..', 'public')));
```

Também modificamos a rota raiz para servir o arquivo `index.html` em vez de apenas retornar informações da API:

```javascript
// Rota raiz - serve o arquivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Rota de informações da API
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API RepasseFLV - GDM funcionando!',
    endpoints: [
      '/api/registros',
      '/api/login',
      '/api/signup',
      '/api/auth/google'
    ]
  });
});
```

### 4. Configuração do Deploy no Render (render.yaml)

Atualizamos o arquivo `render.yaml` para usar o script `start:api-only` em vez de `update:render`:

```yaml
services:
  - type: web
    name: repasselist-gdm-backend
    env: node
    buildCommand: npm install
    startCommand: npm run start:api-only
```

## Como Fazer o Deploy no Render

1. Faça commit das alterações e envie para o repositório GitHub.
2. No dashboard do Render, vá até o serviço `repasselist-gdm-backend`.
3. Clique em "Manual Deploy" e selecione "Deploy latest commit".
4. Aguarde o deploy ser concluído.
5. Acesse a aplicação em https://repasselist-gdm-backend.onrender.com

## Verificação

Após o deploy, verifique se:

1. A página inicial carrega corretamente.
2. O login funciona corretamente.
3. As demais funcionalidades da aplicação estão funcionando normalmente.

Se ainda houver problemas, verifique os logs do Render para identificar possíveis erros.