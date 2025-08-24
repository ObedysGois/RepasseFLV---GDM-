# Correção do Erro ERR_OSSL_UNSUPPORTED no Render

Este documento contém instruções para resolver o erro `ERR_OSSL_UNSUPPORTED` que ocorre durante a implantação do backend no Render, especificamente relacionado à autenticação com o Google Sheets.

## Problema

O erro ocorre porque o Render está usando o Node.js v22.16.0, que tem incompatibilidades com as bibliotecas de criptografia usadas para autenticação com o Google Sheets. O erro específico é:

```
Error: error:1E08010C:DECODER routines::unsupported
```

Este erro está relacionado às mudanças na API de criptografia do OpenSSL no Node.js v22.

## Soluções

Existem várias maneiras de resolver este problema:

### Solução 1: Especificar uma versão anterior do Node.js no Render

Esta é a solução mais simples e recomendada:

1. Acesse o painel do Render para seu serviço
2. Vá para "Settings" > "Environment"
3. Adicione uma nova variável de ambiente:
   - **Key**: `NODE_VERSION`
   - **Value**: `18.18.0` (ou outra versão LTS como 16.x ou 20.x)
4. Clique em "Save Changes"
5. Reimplante o serviço

### Solução 2: Adicionar flag de configuração do OpenSSL

Se você precisar manter o Node.js v22, pode adicionar uma flag para desativar a verificação de segurança do OpenSSL:

1. Acesse o painel do Render para seu serviço
2. Vá para "Settings" > "Environment"
3. Adicione uma nova variável de ambiente:
   - **Key**: `NODE_OPTIONS`
   - **Value**: `--openssl-legacy-provider`
4. Clique em "Save Changes"
5. Reimplante o serviço

### Solução 3: Atualizar o package.json

Adicione um campo `engines` ao seu package.json para especificar a versão do Node.js:

```json
{
  "name": "repasselist-gdm-backend",
  "version": "1.0.0",
  "engines": {
    "node": "18.x"
  },
  // resto do arquivo...
}
```

### Solução 4: Corrigir o formato da chave privada

Às vezes, o problema pode estar relacionado ao formato da chave privada nas variáveis de ambiente. Certifique-se de que:

1. A chave privada está corretamente formatada com quebras de linha (`\n`)
2. Não há caracteres extras no início ou fim da chave
3. A chave está entre aspas duplas no arquivo .env

Verifique se o código que processa a chave privada está correto:

```javascript
private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
```

## Verificação

Após implementar uma das soluções acima:

1. Reimplante o serviço no Render
2. Verifique os logs para confirmar que o erro não ocorre mais
3. Teste a funcionalidade de sincronização com o Google Sheets

## Informações Adicionais

- Este erro é comum em aplicações que usam bibliotecas de autenticação do Google em versões mais recentes do Node.js
- A solução mais confiável é usar uma versão LTS do Node.js (como 18.x ou 20.x)
- Se você estiver usando outras bibliotecas que dependem de criptografia, a flag `--openssl-legacy-provider` pode causar outros problemas

## Referências

- [Documentação do Render sobre variáveis de ambiente](https://render.com/docs/environment-variables)
- [Problemas conhecidos com Node.js v22 e OpenSSL](https://github.com/nodejs/node/issues/45475)
- [Documentação do Google Auth Library](https://github.com/googleapis/google-auth-library-nodejs)