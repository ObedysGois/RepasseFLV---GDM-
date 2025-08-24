// netlify/functions/api.js
const express = require('express');
const serverless = require('serverless-http');
const path = require('path');
require('dotenv').config();
const sheets = require('../../src/googleSheets');
const supabase = require('../../src/supabase');
const bcrypt = require('bcrypt');
const googleAuth = require('../../src/googleAuth');

const app = express();
const saltRounds = 10;

// Middleware para permitir que o frontend acesse a API
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-user-email');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Middleware para interpretar o corpo das requisições como JSON
app.use(express.json());

// Rotas de autenticação
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        const user = await supabase.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Detecta se a senha armazenada é hash bcrypt
        const isHash = typeof user.senha === 'string' && user.senha.startsWith('$2');
        let match = false;

        if (isHash) {
            match = await bcrypt.compare(senha, user.senha);
        } else {
            // tentativa única com texto puro
            match = senha === user.senha;
            if (match) {
                // upgrade: grava hash no banco
                try {
                    const hashed = await bcrypt.hash(senha, saltRounds);
                    await supabase.updateUserPassword(user.id, hashed);
                } catch (e) {
                    console.error('Falha ao atualizar hash de senha:', e);
                }
            }
        }

        if (!match) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const { senha: _, ...userData } = user;
        res.json({ user: userData });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

app.post('/api/signup', async (req, res) => {
    try {
        const { usuario, email, senha, tipo } = req.body;
        
        // Verificar se o email já existe
        const existingUser = await supabase.getUserByEmail(email);
        
        if (existingUser) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        
        // Hash da senha
        const hashedSenha = await bcrypt.hash(senha, saltRounds);
        
        // Criar usuário
        const newUser = await supabase.createUser({
            usuario,
            email,
            senha: hashedSenha,
            tipo: 'operacao' // força 'operacao'
        });
        
        // Retornar sucesso
        res.status(201).json({ message: 'Usuário criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// Rota para sincronização via HTTP
app.get('/api/sincronizar', async (req, res) => {
  try {
    const { sincronizarRegistros } = require('../../src/sincronizacao');
    const resultado = await sincronizarRegistros();
    res.json({ success: true, ...resultado });
  } catch (error) {
    console.error('Erro na sincronização:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Exportar a aplicação como uma função serverless
module.exports.handler = serverless(app);