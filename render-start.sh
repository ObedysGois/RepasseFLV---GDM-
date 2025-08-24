#!/bin/bash

# Define a flag NODE_OPTIONS para compatibilidade com OpenSSL
export NODE_OPTIONS="--openssl-legacy-provider"

# Inicia o servidor
npm start