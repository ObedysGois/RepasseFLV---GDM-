# Solução para o Erro de Deploy no Render

## Problema Identificado

Analisando os logs de erro do Render, identifiquei que o deploy está falhando com o seguinte erro:

```
==> Running 'render-update-fixed.sh' 
bash: line 1: render-update-fixed.sh: command not found 
==> Exited with status 127 
```

Este erro ocorre porque o arquivo `render-update-fixed.sh` não está sendo incluído no repositório Git que o Render está clonando durante o deploy.

## Causa do Problema

O arquivo `render-update-fixed.sh` foi criado localmente, mas não foi adicionado ao repositório Git. Quando o Render faz o deploy, ele clona o repositório do GitHub, mas não encontra o arquivo `render-update-fixed.sh`, resultando no erro "command not found".

## Solução

### 1. Adicionar o arquivo ao repositório Git

1. Adicione o arquivo `render-update-fixed.sh` ao repositório Git:

   ```bash
   git add render-update-fixed.sh
   git commit -m "Adicionar script render-update-fixed.sh para resolver problemas de autenticação"
   git push origin main
   ```

2. Certifique-se de que o arquivo tenha permissões de execução:

   ```bash
   chmod +x render-update-fixed.sh
   git add render-update-fixed.sh
   git commit -m "Adicionar permissões de execução ao script"
   git push origin main
   ```

### 2. Solução Alternativa: Usar o script existente (IMPLEMENTADA)

Como solução imediata, modifiquei o arquivo `render.yaml` para usar o script `render-update.sh` que já existe no repositório:

1. O arquivo `render.yaml` foi atualizado para:

   ```yaml
   services:
     - type: web
       name: repasselist-gdm-backend
       env: node
       buildCommand: npm install
       startCommand: npm run update:render
       envVars:
         - key: NODE_VERSION
           value: 18.18.0
         - key: NODE_OPTIONS
           value: --openssl-legacy-provider
   ```

2. Além disso, melhorei o script `render-update.sh` existente para incluir verificações de variáveis de ambiente e formatação da chave privada, semelhantes às do `render-update-fixed.sh`:

   ```bash
   #!/bin/bash

   # Script atualizado para resolver o erro ERR_OSSL_UNSUPPORTED no Render

   # Exibir informações de debug
   echo "=== Iniciando script de atualização ==="
   echo "NODE_VERSION: $(node -v)"
   echo "NODE_OPTIONS: $NODE_OPTIONS"

   # Verificar se as variáveis de ambiente necessárias estão definidas
   if [ -z "$GOOGLE_CLIENT_EMAIL" ]; then
     echo "AVISO: Variável de ambiente GOOGLE_CLIENT_EMAIL não está definida"
   fi

   if [ -z "$GOOGLE_PRIVATE_KEY" ]; then
     echo "AVISO: Variável de ambiente GOOGLE_PRIVATE_KEY não está definida"
   fi

   # Verificar formato da chave privada
   if [ ! -z "$GOOGLE_PRIVATE_KEY" ]; then
     echo "Verificando formato da chave privada..."
     if [[ $GOOGLE_PRIVATE_KEY == *"BEGIN PRIVATE KEY"* ]]; then
       echo "Formato da chave privada parece correto (contém 'BEGIN PRIVATE KEY')"
     else
       echo "AVISO: Formato da chave privada pode estar incorreto (não contém 'BEGIN PRIVATE KEY')"
     fi
   fi

   # Atualizar o arquivo googleSheets.js com a versão corrigida
   cp src/googleSheets-fixed.js src/googleSheets.js

   # Garantir que o Node.js v18 seja usado
   echo "18.18.0" > .node-version

   # Definir a flag NODE_OPTIONS para compatibilidade com OpenSSL
   export NODE_OPTIONS="--openssl-legacy-provider"

   # Iniciar o servidor
   npm start
   ```

3. Faça o commit e push das alterações:

   ```bash
   git add render.yaml render-update.sh
   git commit -m "Reverter para o script render-update.sh existente e melhorar verificações"
   git push origin main
   ```

### 3. Solução Direta no Render

Você também pode modificar o comando de inicialização diretamente no painel do Render:

1. Acesse o painel do Render e vá para o serviço `repasselist-gdm-backend`.
2. Vá para a seção "Settings" > "Start Command".
3. Altere o comando de inicialização para `npm run update:render` (usando o script existente).
4. Clique em "Save Changes" e reimplante o serviço.

## Configuração das Variáveis de Ambiente no Render

Para resolver os problemas de autenticação do Google Sheets, é essencial configurar corretamente as variáveis de ambiente no Render:

1. Acesse o painel do Render e vá para o serviço `repasselist-gdm-backend`.
2. Vá para a seção "Environment" > "Environment Variables".
3. Adicione ou atualize as seguintes variáveis:

   - `GOOGLE_CLIENT_EMAIL`: O email da conta de serviço do Google (ex: `seu-projeto@seu-projeto.iam.gserviceaccount.com`)
   - `GOOGLE_PRIVATE_KEY`: A chave privada completa, incluindo as linhas `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`. Certifique-se de que as quebras de linha estejam representadas como `\n`.
   - `SPREADSHEET_ID`: O ID da planilha do Google Sheets que você está acessando.

4. Exemplo de formato correto para `GOOGLE_PRIVATE_KEY`:
   ```
   -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\n...linhas adicionais...\nAoGBAKwm5oL1h8xrJRTf6CJaChb4pKPKY5BEmNCUEP3+DjZ7wIgQRgMkJVQ9Yw30\ng9IfRFZwzQs/NfUO6D8j/d/4hjV5jUQCNsaJvMcYYgBtAkEA9WRq5PG/D4Aq5Zz2\n-----END PRIVATE KEY-----
   ```

5. Clique em "Save Changes" e reimplante o serviço.

## Verificação

Após aplicar as soluções acima, reimplante o serviço no Render e verifique os logs para confirmar que o deploy foi bem-sucedido. Preste atenção especial às mensagens de debug adicionadas ao script `render-update.sh`, que ajudarão a identificar problemas com as variáveis de ambiente.

## Prevenção de Problemas Futuros

1. **Sempre teste localmente antes de fazer deploy**: Execute o comando `npm run update:render` localmente para garantir que o script funciona.
2. **Verifique se todos os arquivos necessários estão no repositório**: Use `git status` para verificar se todos os arquivos necessários estão sendo rastreados pelo Git.
3. **Use scripts existentes quando possível**: Se você estiver criando um novo script, considere modificar um script existente em vez de criar um novo arquivo que pode não ser incluído no repositório.
4. **Mantenha as variáveis de ambiente atualizadas**: Sempre que regenerar as credenciais do Google, atualize as variáveis de ambiente no Render.