#!/bin/bash

# Script para iniciar o servidor apenas com a API, com suporte a arquivos estáticos

# Atualizar o arquivo googleSheets.js com a versão corrigida
cp src/googleSheets-fixed.js src/googleSheets.js

# Garantir que o Node.js v18 seja usado
echo "18.18.0" > .node-version

# Definir a flag NODE_OPTIONS para compatibilidade com OpenSSL
export NODE_OPTIONS="--openssl-legacy-provider"

# Iniciar o servidor API-only com suporte a arquivos estáticos
node src/server-api-only.js