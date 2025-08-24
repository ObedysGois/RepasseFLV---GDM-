# Solução para o Erro ERR_OSSL_UNSUPPORTED no Render

## Problema Identificado

Analisando os logs de erro do Render, identificamos que o problema persiste mesmo após a configuração do Node.js v18.18.0. O erro específico é:

```
Error: error:1E08010C:DECODER routines::unsupported
```

Este erro está relacionado à incompatibilidade entre as bibliotecas de autenticação do Google e o OpenSSL usado pelo Node.js, mesmo na versão 18.18.0.

## Soluções Implementadas

Implementamos várias soluções para resolver este problema:

1. **Correção no formato da chave privada**:
   - Criamos uma versão corrigida do arquivo `googleSheets.js` que trata melhor o formato da chave privada
   - O novo arquivo está em `src/googleSheets-fixed.js`

2. **Script de atualização automática**:
   - Criamos o script `render-update.sh` que aplica todas as correções necessárias
   - Adicionamos o comando `update:render` ao package.json

3. **Configuração do Render**:
   - Atualizamos o arquivo `render.yaml` para usar o script de atualização

## Como Aplicar a Solução

### Opção 1: Deploy Automático via render.yaml

1. Faça commit e push das alterações para seu repositório
2. No Render, configure seu serviço para usar o arquivo `render.yaml`

### Opção 2: Configuração Manual

1. No painel do Render, vá para "Settings" > "Build & Deploy"
2. Altere o comando de inicialização para `npm run update:render`
3. Certifique-se de que as variáveis de ambiente estão configuradas:
   - `NODE_VERSION`: `18.18.0`
   - `NODE_OPTIONS`: `--openssl-legacy-provider`

## Verificação da Chave Privada

Um dos problemas mais comuns é o formato incorreto da chave privada. Certifique-se de que:

1. A chave privada no Render está configurada corretamente como variável de ambiente `GOOGLE_PRIVATE_KEY`
2. A chave deve incluir as linhas `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`
3. As quebras de linha devem ser representadas como `\n` na variável de ambiente

Exemplo de formato correto:

```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSj...\n-----END PRIVATE KEY-----\n
```

## Logs de Depuração

A versão corrigida do `googleSheets.js` inclui logs adicionais que mostram:

1. Se está usando credenciais de arquivo ou variáveis de ambiente
2. O formato da chave privada (primeiros e últimos caracteres)

Isso ajudará a identificar problemas específicos com as credenciais.

## Outras Considerações

1. **Versão do Node.js**: O Supabase está alertando que o Node.js 18 será descontinuado. Considere atualizar para o Node.js 20 no futuro.

2. **Credenciais do Google**: O log mostra que "Credenciais Google OAuth ausentes". Isso não está relacionado ao erro principal, mas você pode querer configurar essas credenciais se precisar de autenticação OAuth.

3. **Alternativas ao Render**: Se continuar enfrentando problemas, considere outras plataformas como Heroku ou Railway que podem ter melhor compatibilidade com as bibliotecas do Google.

## Próximos Passos

1. Aplique as soluções acima
2. Verifique os logs após o deploy
3. Se o problema persistir, considere:
   - Atualizar as bibliotecas para versões mais recentes
   - Usar uma abordagem diferente para autenticação com o Google Sheets
   - Migrar para uma plataforma alternativa