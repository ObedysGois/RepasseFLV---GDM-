# Solução para o Problema de Frontend vs Backend no Render

## Problema Identificado

Analisando os logs e o código, identifiquei que o backend está funcionando corretamente no Render, mas está servindo o frontend (arquivos estáticos) na rota principal `/`. Isso ocorre porque o arquivo `server.js` está configurado para servir os arquivos estáticos da pasta `public` e redirecionar a rota raiz `/` para o arquivo `index.html`.

```javascript
// Middleware para servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));

// Rota de teste
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});
```

Este comportamento é esperado, pois o servidor está configurado para funcionar como um servidor full-stack que serve tanto o frontend quanto o backend.

## Solução

Se você deseja que o Render sirva apenas o backend (API) e não o frontend, você tem duas opções:

### Opção 1: Manter a configuração atual (recomendado)

A configuração atual permite que o mesmo servidor sirva tanto o frontend quanto o backend, o que é uma abordagem comum e eficiente. Neste caso:

1. O frontend está disponível em: `https://repasselist-gdm-backend.onrender.com/`
2. A API está disponível em: `https://repasselist-gdm-backend.onrender.com/api/...`

Esta abordagem simplifica a implantação e reduz custos, pois você precisa apenas de um serviço no Render.

### Opção 2: Separar frontend e backend (Solução Implementada)

Criamos uma solução completa para separar o frontend e o backend:

1. **Novo arquivo de servidor apenas para API**: `src/server-api-only.js`
   - Este arquivo é uma versão modificada do `server.js` que não serve arquivos estáticos
   - A rota raiz `/` retorna informações sobre a API em formato JSON

2. **Script de inicialização para API**: `render-api-only.sh`
   - Este script configura o ambiente e inicia o servidor apenas com a API

3. **Configuração do Render para API**: `render-api-only.yaml`
   - Use este arquivo para configurar um novo serviço no Render que servirá apenas a API

4. **Novo script no package.json**: `start:api-only`
   - Execute `npm run start:api-only` para iniciar o servidor apenas com a API

Para usar esta solução:

1. No Render, crie um novo serviço web usando o arquivo `render-api-only.yaml`
2. Implante o frontend separadamente no Vercel, Netlify ou outro serviço de hospedagem estática
3. Configure o frontend para apontar para a URL da API no Render

## Verificação do Funcionamento

Para verificar se o backend está funcionando corretamente, acesse:

- `https://repasselist-gdm-backend.onrender.com/api/registros`

Se você receber dados JSON ou uma resposta de erro de autenticação (não um erro 404), isso confirma que o backend está funcionando.

## Erro OpenSSL Persistente

O erro `ERR_OSSL_UNSUPPORTED` ainda está ocorrendo durante a sincronização com o Google Sheets, apesar das soluções implementadas. Isso indica que o problema com a chave privada persiste.

Verifique se a variável de ambiente `GOOGLE_PRIVATE_KEY` no Render está formatada corretamente:

1. A chave deve estar entre aspas duplas
2. As quebras de linha devem ser representadas como `\n`
3. Não deve haver caracteres extras ou espaços no início ou fim

O log mostra que a chave privada começa com `GOCSPX-YqpTh_aDgsqDvdEK_M4O...`, o que não parece ser o formato correto para uma chave privada RSA. Uma chave privada RSA normalmente começa com `-----BEGIN PRIVATE KEY-----`.

## Próximos Passos

1. Verifique o formato da variável de ambiente `GOOGLE_PRIVATE_KEY` no Render
2. Se o problema persistir, considere regenerar a chave de serviço no Google Cloud Console
3. Atualize a variável de ambiente no Render com a nova chave

Se você precisar apenas do backend funcionando sem a sincronização com o Google Sheets, pode modificar o código para desativar temporariamente essa funcionalidade enquanto resolve o problema da chave.