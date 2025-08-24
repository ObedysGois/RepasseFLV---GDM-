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