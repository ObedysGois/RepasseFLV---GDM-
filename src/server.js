const express = require('express');
const path = require('path');
require('dotenv').config(); // Carregar variáveis de ambiente
const sheets = require('./googleSheets');
const supabase = require('./supabase'); // Importar o módulo do Supabase
const bcrypt = require('bcrypt');
const googleAuth = require('./googleAuth');
const { agendarSincronizacao } = require('./sincronizacao'); // Importar o módulo de sincronização

const app = express();
const port = process.env.PORT || 3000;
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

// Rota de teste
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
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
    console.log('Recebido callback do Google:', req.query);
    const { code } = req.query;
    if (!code) return res.status(400).send('Código ausente');

    const profile = await googleAuth.getUserFromCode(code);
    console.log('Perfil do usuário obtido:', profile);
    let user = await supabase.getUserByEmail(profile.email);

    if (!user) {
      console.log('Criando novo usuário para:', profile.email);
      // Cria usuário com senha aleatória (hash), tipo padrão 'operacao'
      const randomPass = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const hashedSenha = await bcrypt.hash(randomPass, saltRounds);
      user = await supabase.createUser({
        usuario: profile.name || profile.email.split('@')[0],
        email: profile.email,
        senha: hashedSenha,
        tipo: 'operacao'
      });
    }

    const { senha, ...userData } = user;

    // Envia o usuário de volta ao opener e fecha a janela
    console.log('Enviando dados do usuário para a janela principal:', userData);
    return res.send(`
<html><body>
<script>
  (function() {
    console.log('Executando script de callback');
    if (window.opener) {
      console.log('Janela opener encontrada, enviando mensagem');
      window.opener.postMessage({ source: 'repasse-auth', status: 'success', user: ${JSON.stringify(userData)} }, '*');
      console.log('Mensagem enviada, fechando janela');
      setTimeout(function() { window.close(); }, 1000);
    } else {
      console.log('Janela opener não encontrada');
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
        res.status(500).send('Erro no servidor');
    }
});

// Rota para adicionar um novo registro
app.post('/api/registros', async (req, res) => {
    try {
        const novoRegistro = req.body;
        
        // Adicionar ao Google Sheets
        const rowAdicionada = await sheets.addRegistro(novoRegistro);
        
        // Também adicionar ao Supabase
        try {
            console.log('[Server] Tentando adicionar registro no Supabase:', JSON.stringify(novoRegistro));
            const supabaseResult = await supabase.addRegistro(novoRegistro);
            console.log('[Server] Registro adicionado com sucesso no Supabase:', supabaseResult);
        } catch (supabaseError) {
            console.error('[Server] Erro ao adicionar registro no Supabase (não crítico):', supabaseError);
            console.error('[Server] Detalhes do erro:', {
                message: supabaseError.message,
                details: supabaseError.details,
                hint: supabaseError.hint,
                code: supabaseError.code
            });
        }
        
        res.status(201).json(rowAdicionada);
    } catch (error) {
        console.error('Erro detalhado ao adicionar registro:', error);
        res.status(500).json({ message: 'Erro no servidor ao adicionar registro.', error: error.message });
    }
});

// Rota para deletar um registro
app.delete('/api/registros/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Deletar do Google Sheets
        const resultado = await sheets.deleteRegistro(id);
        
        // Também deletar do Supabase
        try {
            await supabase.deleteRegistro(id);
        } catch (supabaseError) {
            console.error(`Erro ao deletar registro ${id} no Supabase (não crítico):`, supabaseError);
        }
        
        if (!resultado) {
            return res.status(404).json({ message: `Registro com ID ${id} não encontrado.` });
        }
        res.status(200).json({ message: `Registro ${id} excluído com sucesso.` });
    } catch (error) {
        console.error(`Erro ao deletar registro ${req.params.id}:`, error);
        res.status(500).json({ message: 'Erro no servidor ao deletar registro.', error: error.message });
    }
});

// Rota para atualizar um registro existente
app.put('/api/registros/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dadosAtualizados = req.body;
        
        console.log(`[Server] Recebida requisição para atualizar registro ${id}`);
        console.log(`[Server] Dados recebidos:`, JSON.stringify(dadosAtualizados));
        
        // Atualizar no Google Sheets
        console.log(`[Server] Tentando atualizar no Google Sheets...`);
        const registroAtualizado = await sheets.updateRegistro(id, dadosAtualizados);
        console.log(`[Server] Resultado da atualização no Google Sheets:`, JSON.stringify(registroAtualizado));
        
        // Também atualizar no Supabase
        console.log(`[Server] Tentando atualizar no Supabase...`);
        try {
            console.log('[Server] Tentando atualizar registro no Supabase:', JSON.stringify(dadosAtualizados));
            // Garantir que o ID esteja no objeto de dados
            const dadosComId = { ...dadosAtualizados, id };
            
            // Garantir que os campos numéricos sejam convertidos para números
            if (dadosComId.quantidadeSolicitada) {
                dadosComId.quantidadeSolicitada = parseFloat(dadosComId.quantidadeSolicitada);
            }
            if (dadosComId.quantidadeRepassada) {
                dadosComId.quantidadeRepassada = parseFloat(dadosComId.quantidadeRepassada);
            }
            // Verificar campos de quantidade numerados
            for (let i = 1; i <= 5; i++) {
                const campo = `quantidade ${i}`;
                if (dadosComId[campo]) {
                    dadosComId[campo] = parseFloat(dadosComId[campo]);
                }
            }
            
            console.log('[Server] Dados com ID para Supabase (após conversão):', JSON.stringify(dadosComId));
            const supabaseResult = await supabase.updateRegistro(dadosComId);
            console.log('[Server] Registro atualizado com sucesso no Supabase:', JSON.stringify(supabaseResult));
        } catch (supabaseError) {
            console.error(`[Server] Erro ao atualizar registro ${id} no Supabase (não crítico):`, supabaseError);
            console.error('[Server] Detalhes do erro:', {
                message: supabaseError.message,
                details: supabaseError.details,
                hint: supabaseError.hint,
                code: supabaseError.code
            });
            // Continuar mesmo com erro no Supabase
        }
        
        if (!registroAtualizado) {
            console.warn(`[Server] Registro com ID ${id} não encontrado para atualização.`);
            return res.status(404).json({ message: `Registro com ID ${id} não encontrado para atualização.` });
        }
        
        console.log(`[Server] Registro atualizado com sucesso:`, registroAtualizado);
        res.status(200).json(registroAtualizado);
    } catch (error) {
        console.error(`[Server] Erro ao atualizar registro ${req.params.id}:`, error);
        res.status(500).json({ message: 'Erro no servidor ao atualizar registro.', error: error.message });
    }
});

// Diagnóstico simples
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.supabaseClient // usando o módulo supabase existente
    res.json({ api: 'ok' });
  } catch (e) {
    res.status(500).json({ api: 'error', error: e?.message || String(e) });
  }
});

// Endpoint de diagnóstico para verificar a estrutura da tabela Registros
app.get('/api/diagnostic/registros-structure', async (req, res) => {
  try {
    console.log('[Server] Recebida requisição para verificar estrutura da tabela Registros');
    
    const structure = await supabase.getRegistrosTableStructure();
    
    if (structure.error) {
      console.error('[Server] Erro ao obter estrutura da tabela:', structure.error);
      return res.status(500).json({ 
        error: 'Erro ao obter estrutura da tabela', 
        details: structure.error 
      });
    }
    
    res.json({ 
      message: 'Estrutura da tabela Registros obtida com sucesso',
      structure: structure
    });
  } catch (e) {
    console.error('[Server] Erro no endpoint de diagnóstico:', e);
    res.status(500).json({ error: 'Erro no servidor', details: e?.message || String(e) });
  }
});

// Endpoint de teste para atualização de registro
app.post('/api/test/update-registro/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const testData = {
      quantidadeSolicitada: 999,
      vendedor: 'Teste Vendedor',
      status: 'Teste Status'
    };
    
    console.log(`[Server] Testando atualização do registro ${id} com dados:`, testData);
    
    // Testar atualização no Supabase
    try {
      const result = await supabase.updateRegistro(id, testData);
      console.log(`[Server] Resultado da atualização no Supabase:`, result);
      
      res.json({ 
        success: true, 
        message: 'Teste de atualização realizado com sucesso',
        result: result
      });
    } catch (supabaseError) {
      console.error(`[Server] Erro ao atualizar registro ${id} no Supabase:`, supabaseError);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao atualizar registro no Supabase', 
        details: supabaseError.message 
      });
    }
  } catch (e) {
    console.error('[Server] Erro no endpoint de teste:', e);
    res.status(500).json({ error: 'Erro no servidor', details: e?.message || String(e) });
  }
});

// Endpoint para testar a estrutura da tabela
app.get('/api/test/registros-structure', async (req, res) => {
  try {
    console.log('[Server] Testando estrutura da tabela Registros');
    
    // Obter alguns registros para verificar a estrutura
    const { data, error } = await supabase.supabaseClient
      .from('Registros')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('[Server] Erro ao obter registros:', error);
      return res.status(500).json({ error: 'Erro ao obter registros', details: error.message });
    }
    
    // Obter informações sobre as colunas
    const { data: columns, error: columnsError } = await supabase.supabaseClient
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'Registros')
      .order('ordinal_position');
    
    if (columnsError) {
      console.error('[Server] Erro ao obter colunas:', columnsError);
      return res.status(500).json({ error: 'Erro ao obter colunas', details: columnsError.message });
    }
    
    res.json({ 
      message: 'Estrutura da tabela Registros obtida com sucesso',
      sampleData: data,
      columns: columns
    });
  } catch (e) {
    console.error('[Server] Erro no endpoint de teste de estrutura:', e);
    res.status(500).json({ error: 'Erro no servidor', details: e?.message || String(e) });
  }
});

// Endpoint para criar a tabela historico (apenas em ambiente de desenvolvimento)
app.post('/api/dev/create-historico-table', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Este endpoint serve apenas como referência
    // A criação real da tabela deve ser feita no Supabase diretamente
    res.json({ 
      message: 'Para criar a tabela historico, execute o script SQL em src/migrations/create_historico_table.sql no seu painel do Supabase.',
      scriptPath: 'src/migrations/create_historico_table.sql'
    });
  } catch (e) {
    res.status(500).json({ error: 'Falha ao processar requisição', details: e?.message || String(e) });
  }
});

// Criar usuário de teste (somente DEV)
app.post('/api/dev/seed-user', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { usuario = 'Admin', email = 'admin@example.com', senha = '123456', tipo = 'administrador' } = req.body || {};

    const existing = await supabase.getUserByEmail(email);
    if (existing) {
      return res.status(200).json({ message: 'Usuário já existe', email });
    }

    const hashed = await bcrypt.hash(senha, saltRounds);
    await supabase.createUser({ usuario, email, senha: hashed, tipo });
    res.json({ message: 'Usuário criado', email });
  } catch (e) {
    res.status(500).json({ error: 'Falha ao seed user', details: e?.message || String(e) });
  }
});

// Middleware de verificação de administrador
async function requireAdmin(req, res, next) {
  try {
    const authEmail = req.header('x-user-email');
    if (!authEmail) return res.status(401).json({ error: 'Não autenticado' });
    const u = await supabase.getUserByEmail(authEmail);
    if (!u || (u.tipo || '').toLowerCase() !== 'administrador') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    return next();
  } catch (e) {
    console.error('Erro no requireAdmin:', e);
    return res.status(500).json({ error: 'Erro de autorização' });
  }
}

// Novas rotas de administração de usuários
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await supabase.listUsers();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { usuario, email, senha } = req.body || {};
    if (!usuario || !email || !senha) return res.status(400).json({ error: 'Dados incompletos' });
    const existing = await supabase.getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'Email já cadastrado' });

    const hashed = await bcrypt.hash(senha, saltRounds);
    await supabase.createUser({ usuario, email, senha: hashed, tipo: 'operacao' }); // força 'operacao'
    res.status(201).json({ message: 'Usuário criado' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao criar usuário', details: e?.message || String(e) });
  }
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo } = req.body || {};
    const allowed = ['administrador', 'operacao', 'comercial', 'gerencia'];
    if (!allowed.includes((tipo || '').toLowerCase())) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }
    const updated = await supabase.updateUserType(id, tipo);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao atualizar tipo', details: e?.message || String(e) });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.deleteUserById(id);
    res.json({ message: 'Usuário excluído', id });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir usuário', details: e?.message || String(e) });
  }
});

// Rotas para Histórico de Edição
app.post('/api/historico', async (req, res) => {
    try {
        const authEmail = req.header('x-user-email');
        if (!authEmail) return res.status(401).json({ error: 'Não autenticado' });
        
        const { acao, detalhes } = req.body;
        if (!acao || !detalhes) {
            return res.status(400).json({ error: 'Ação e detalhes são obrigatórios' });
        }
        
        const historicoData = {
            data: new Date().toISOString(),
            usuario: authEmail,
            acao,
            detalhes
        };
        
        const resultado = await supabase.addHistorico(historicoData);
        
        // Se o resultado for null, significa que houve um problema com a tabela
        if (resultado === null) {
            return res.status(200).json({ message: 'Histórico não registrado devido a problema com a tabela' });
        }
        
        res.status(201).json(resultado);
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
        // Verificar se o erro é relacionado à tabela não existir
        if (error.message && (error.message.includes('relation "historico" does not exist') || error.message.includes('table "historico" does not exist'))) {
            return res.status(200).json({ message: 'Histórico não registrado devido a tabela não existir' });
        }
        res.status(500).json({ error: 'Erro ao salvar histórico' });
    }
});

app.get('/api/historico', async (req, res) => {
    try {
        const { startDate, endDate, limit } = req.query;
        
        let historico;
        if (startDate && endDate) {
            historico = await supabase.getHistoricoByDateRange(startDate, endDate);
        } else {
            historico = await supabase.getHistorico(limit ? parseInt(limit) : 100);
        }
        
        res.json(historico);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
});

// Agendar sincronização a cada 30 minutos
agendarSincronizacao(30);

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log('Sincronização automática entre Google Sheets e Supabase ativada');
});