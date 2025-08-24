const express = require('express');
const path = require('path');
require('dotenv').config(); // Carregar variáveis de ambiente
const sheets = require('./googleSheets');
const supabase = require('./supabase'); // Importar o módulo do Supabase
const bcrypt = require('bcrypt');
const googleAuth = require('./googleAuth');
const { agendarSincronizacao } = require('./sincronizacao'); // Importar o módulo de sincronização

const app = express();
const port = process.env.PORT || 10000;
const saltRounds = 10;

// Middleware para servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));

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
        res.status(201).json({ message: 'Usuário cadastrado com sucesso' });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({
            error: 'Erro ao cadastrar usuário',
            details: error?.message || String(error)
        });
    }
});

// Inicia OAuth com Google
app.get('/api/auth/google', (req, res) => {
  try {
    const url = googleAuth.getAuthUrl();
    return res.redirect(url);
  } catch (e) {
    console.error('Erro ao gerar URL do Google OAuth:', e);
    return res.status(500).send('Erro ao iniciar Google OAuth');
  }
});

// Callback do Google
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Código ausente');

    const profile = await googleAuth.getUserFromCode(code);
    let user = await supabase.getUserByEmail(profile.email);

    if (!user) {
      // Cria usuário com senha aleatória (hash), tipo padrão 'operacao'
      const randomPass = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const hashedSenha = await bcrypt.hash(randomPass, saltRounds);
      user = await supabase.createUser({
        usuario: profile.usuario,
        email: profile.email,
        senha: hashedSenha,
        tipo: 'operacao'
      });
    }

    const { senha, ...userData } = user;

    // Envia o usuário de volta ao opener e fecha a janela
    return res.send(`
<html><body>
<script>
  (function() {
    if (window.opener) {
      window.opener.postMessage({ source: 'repasse-auth', status: 'success', user: ${JSON.stringify(userData)} }, '*');
      window.close();
    } else {
      document.write('Autenticado. Pode fechar esta janela.');
    }
  })();
</script>
</body></html>
    `);
  } catch (e) {
    console.error('Erro no callback Google OAuth:', e);
    return res.status(500).send(`
<html><body>
<script>
  (function() {
    if (window.opener) {
      window.opener.postMessage({ source: 'repasse-auth', status: 'error', error: ${JSON.stringify(e?.message || 'Erro ao autenticar com Google')} }, '*');
      window.close();
    } else {
      document.write('Falha na autenticação.');
    }
  })();
</script>
</body></html>
    `);
  }
});

// Rota para buscar todos os registros
app.get('/api/registros', async (req, res) => {
    try {
        // Buscar registros do Google Sheets
        const registros = await sheets.getRegistros();
        
        // Também buscar do Supabase (mas priorizar os do Sheets para a resposta)
        try {
            await supabase.getRegistros(); // Apenas para manter o Supabase atualizado
        } catch (supabaseError) {
            console.error('Erro ao buscar registros do Supabase (não crítico):', supabaseError);
        }
        
        res.json(registros);
    } catch (error) {
        console.error('Erro ao buscar registros:', error);
        res.status(500).json({
            error: 'Erro ao buscar registros',
            details: error?.message || String(error)
        });
    }
});

// Rota para adicionar um novo registro
app.post('/api/registros', async (req, res) => {
    try {
        const novoRegistro = req.body;
        
        // Adicionar ao Google Sheets
        const registroAdicionado = await sheets.addRegistro(novoRegistro);
        
        // Também adicionar ao Supabase
        try {
            await supabase.addRegistro(novoRegistro);
        } catch (supabaseError) {
            console.error('Erro ao adicionar registro ao Supabase (não crítico):', supabaseError);
        }
        
        res.status(201).json(registroAdicionado);
    } catch (error) {
        console.error('Erro ao adicionar registro:', error);
        res.status(500).json({
            error: 'Erro ao adicionar registro',
            details: error?.message || String(error)
        });
    }
});

// Rota para atualizar um registro existente
app.put('/api/registros/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dadosAtualizados = req.body;
        
        // Atualizar no Google Sheets
        const registroAtualizado = await sheets.updateRegistro(id, dadosAtualizados);
        
        if (!registroAtualizado) {
            return res.status(404).json({ error: 'Registro não encontrado' });
        }
        
        // Também atualizar no Supabase
        try {
            await supabase.updateRegistro(id, dadosAtualizados);
        } catch (supabaseError) {
            console.error('Erro ao atualizar registro no Supabase (não crítico):', supabaseError);
        }
        
        res.json(registroAtualizado);
    } catch (error) {
        console.error('Erro ao atualizar registro:', error);
        res.status(500).json({
            error: 'Erro ao atualizar registro',
            details: error?.message || String(error)
        });
    }
});

// Rota para excluir um registro
app.delete('/api/registros/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Excluir do Google Sheets
        const resultado = await sheets.deleteRegistro(id);
        
        if (!resultado) {
            return res.status(404).json({ error: 'Registro não encontrado' });
        }
        
        // Também excluir do Supabase
        try {
            await supabase.deleteRegistro(id);
        } catch (supabaseError) {
            console.error('Erro ao excluir registro do Supabase (não crítico):', supabaseError);
        }
        
        res.json({ message: 'Registro excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir registro:', error);
        res.status(500).json({
            error: 'Erro ao excluir registro',
            details: error?.message || String(error)
        });
    }
});

// Inicializar conexão com Google Sheets
async function inicializarSheets() {
    try {
        await sheets.initialize();
        console.log('Conectado ao Google Sheets com sucesso!');
    } catch (error) {
        console.error('Erro ao conectar ao Google Sheets:', error);
    }
}

// Inicializar conexão com Supabase
async function inicializarSupabase() {
    try {
        console.log('Tentando conectar ao Supabase...');
        await supabase.initialize();
        console.log('Conectado ao Supabase com sucesso!');
    } catch (error) {
        console.error('Erro ao conectar ao Supabase:', error);
    }
}

// Iniciar o servidor
async function iniciarServidor() {
    try {
        // Inicializar conexões
        await inicializarSupabase();
        await inicializarSheets();
        
        // Agendar sincronização
        agendarSincronizacao();
        
        // Iniciar o servidor
        app.listen(port, () => {
            console.log(`Servidor rodando em http://localhost:${port}`);
            console.log('Sincronização automática entre Google Sheets e Supabase ativada');
        });
    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error);
    }
}

iniciarServidor();