#!/bin/bash

# Script para atualizar o projeto e resolver o erro ERR_OSSL_UNSUPPORTED no Render

# Atualizar o arquivo googleSheets.js com a versão corrigida
cp src/googleSheets-fixed.js src/googleSheets.js

# Garantir que o Node.js v18 seja usado
echo "18.18.0" > .node-version

# Definir a flag NODE_OPTIONS para compatibilidade com OpenSSL
export NODE_OPTIONS="--openssl-legacy-provider"

# Iniciar o servidor
npm start