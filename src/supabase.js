const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

// Usar variáveis de ambiente para as credenciais do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Erro: Variáveis de ambiente SUPABASE_URL e SUPABASE_KEY devem ser definidas no arquivo .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Função auxiliar para obter o mapeamento de colunas do Supabase
function getColumnMapping() {
    // Mapear explicitamente todas as colunas esperadas pelo Supabase
    const columnMapping = {
        'id': 'id',
        'datarepasse': 'dataRepasse',
        'dataRepasse': 'dataRepasse',
        'usuariooperacoes': 'usuarioOperacoes',
        'usuarioOperacoes': 'usuarioOperacoes',
        'produto': 'produto',
        'familia': 'familia',
        'família': 'familia',
        'motivo': 'motivo',
        'datarecebimento': 'dataRecebimento',
        'dataRecebimento': 'dataRecebimento',
        'tempodias': 'tempo(dias)',
        'tempo(dias)': 'tempo(dias)',
        'observacao': 'observacao',
        'observação': 'observacao',
        'quantidadesolicitada': 'quantidadeSolicitada',
        'quantidadeSolicitada': 'quantidadeSolicitada',
        'quantidaderepassada': 'quantidadeRepassada',
        'quantidadeRepassada': 'quantidadeRepassada',
        'status': 'status',
        'usuariocomercial': 'usuarioComercial',
        'usuarioComercial': 'usuarioComercial'
    };
    
    // Adicionar mapeamento para quantidade 1-5 e vendedor 1-5
    for (let i = 1; i <= 5; i++) {
        columnMapping[`quantidade${i}`] = `quantidade ${i}`;
        columnMapping[`quantidade ${i}`] = `quantidade ${i}`;
        columnMapping[`vendedor${i}`] = `vendedor ${i}`;
        columnMapping[`vendedor ${i}`] = `vendedor ${i}`;
    }
    
    return columnMapping;
}

// Função auxiliar para normalizar dados antes de enviar ao Supabase
function normalizeData(data) {
    // Verificar se data é um objeto válido
    if (!data || typeof data !== 'object') {
        console.error('[Supabase] Dados inválidos para normalização:', data);
        return {};
    }
    
    const normalizedData = {};
    const columnMapping = getColumnMapping();
    
    // Se tiver ID, garantir que seja incluído
    if (data.id) {
        normalizedData.id = data.id;
    }
    
    console.log(`[Supabase] Normalizando dados:`, JSON.stringify(data));
    
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            // Normalizar nomes de campos usando o mapeamento
            let normalizedKey = key;
            const keyLower = key.toLowerCase();
            
            // Verificar se existe no mapeamento
            if (columnMapping[key]) {
                normalizedKey = columnMapping[key];
                console.log(`[Supabase] Mapeando campo '${key}' para '${normalizedKey}'`);
            } else if (columnMapping[keyLower]) {
                normalizedKey = columnMapping[keyLower];
                console.log(`[Supabase] Mapeando campo '${key}' (lowercase) para '${normalizedKey}'`);
            } 
            // Verificar padrões de quantidade e vendedor
            else if (key.match(/quantidade\s*\d+/i)) {
                const num = key.match(/\d+/)[0];
                normalizedKey = `quantidade ${num}`;
                console.log(`[Supabase] Mapeando campo de quantidade '${key}' para '${normalizedKey}'`);
            } else if (key.match(/vendedor\s*\d+/i)) {
                const num = key.match(/\d+/)[0];
                normalizedKey = `vendedor ${num}`;
                console.log(`[Supabase] Mapeando campo de vendedor '${key}' para '${normalizedKey}'`);
            } else {
                console.log(`[Supabase] Campo '${key}' não encontrado no mapeamento, mantendo original`);
            }
            
            // Tratar valores vazios para campos numéricos
            if (normalizedKey.includes('quantidade') && (data[key] === '' || data[key] === undefined)) {
                normalizedData[normalizedKey] = null;
                console.log(`[Supabase] Campo numérico '${normalizedKey}' vazio, definindo como null`);
            } 
            // Tratar valores vazios para campos de data
            else if ((normalizedKey.includes('data') || normalizedKey.includes('Data')) && data[key] === '') {
                normalizedData[normalizedKey] = null;
                console.log(`[Supabase] Campo de data '${normalizedKey}' vazio, definindo como null`);
            }
            // Manter outros valores como estão, exceto undefined
            else if (data[key] !== undefined) {
                normalizedData[normalizedKey] = data[key];
                console.log(`[Supabase] Definindo '${normalizedKey}' = ${JSON.stringify(data[key])}`);
            }
        }
    }
    
    // Garantir que família seja convertido para familia (sem acento)
    if (normalizedData['família'] && !normalizedData.familia) {
        normalizedData.familia = normalizedData['família'];
        delete normalizedData['família'];
        console.log(`[Supabase] Convertendo 'família' para 'familia'`);
    }
    
    return normalizedData;
}

async function initialize() {
    try {
        // Teste básico de conexão
        console.log('Tentando conectar ao Supabase...');
        
        // Primeiro, tente uma consulta simples para verificar a conexão
        const { data: healthCheck, error: healthError } = await supabase
            .from('_pgsodium_key_id_seq')
            .select('*', { count: 'exact', head: true });
        
        if (healthError) {
            console.log('Erro na verificação básica de conexão:', healthError);
            // Não interromper a execução, tentar continuar com outras verificações
        } else {
            console.log('Conexão básica com Supabase estabelecida');
        }
        
        // Agora tente acessar a tabela Registros
        const { data, error } = await supabase
            .from('Registros')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.log('Erro ao acessar tabela Registros:', error);
            // Não interromper a execução, pode ser que a tabela não exista ainda
            // ou que haja um problema temporário
        } else {
            console.log('Tabela Registros acessada com sucesso');
        }
        
        // Verificar se a tabela historico existe, se não existir, criar
        await createHistoricoTableIfNotExists();
        
        // Verificar a estrutura da tabela Registros
        const tableStructure = await getRegistrosTableStructure();
        console.log('Estrutura da tabela Registros:', tableStructure);
        
        console.log('Conectado ao Supabase com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao conectar com o Supabase:', error);
        return false;
    }
}

// Adiciona uma função para verificar a estrutura da tabela Registros
async function getRegistrosTableStructure() {
  try {
    console.log('[Supabase] Obtendo estrutura da tabela Registros...');
    
    // Primeiro, verificar se a tabela existe listando as tabelas
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('[Supabase] Erro ao listar tabelas:', tablesError);
      throw tablesError;
    }
    
    const registrosTableExists = tables.some(table => table.table_name === 'Registros');
    if (!registrosTableExists) {
      console.warn('[Supabase] Tabela Registros não encontrada');
      return { exists: false, message: 'Tabela Registros não encontrada' };
    }
    
    // Obter a estrutura das colunas
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'Registros')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    if (columnsError) {
      console.error('[Supabase] Erro ao obter colunas da tabela Registros:', columnsError);
      throw columnsError;
    }
    
    console.log('[Supabase] Estrutura da tabela Registros obtida com sucesso');
    return { exists: true, columns };
  } catch (error) {
    console.error('[Supabase] Erro ao verificar estrutura da tabela Registros:', error);
    return { exists: false, error: error.message };
  }
}
async function createHistoricoTableIfNotExists() {
    try {
        // Verificar se a tabela historico existe tentando fazer uma consulta simples
        const { data, error } = await supabase
            .from('historico')
            .select('count', { count: 'exact', head: true })
            .limit(1);
        
        // Se houver erro, pode ser porque a tabela não existe
        if (error) {
            console.log('Tabela historico não encontrada. Será necessário criá-la manualmente no Supabase.');
            console.log('Use o script em src/migrations/create_historico_table.sql para criar a tabela.');
        } else {
            console.log('Tabela historico já existe.');
        }
    } catch (error) {
        console.error('Erro ao verificar existência da tabela historico:', error);
    }
}

async function getRegistros() {
    try {
        const { data, error } = await supabase
            .from('Registros')
            .select('*');
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar registros do Supabase:', error);
        return [];
    }
}

async function addRegistro(data) {
    try {
        console.log(`[Supabase] Tentando adicionar novo registro:`, data);
        
        // Verificar se já existe um ID
        if (data.id) {
            console.log(`[Supabase] Registro já possui ID ${data.id}, verificando se existe no Supabase`);
            
            // Verificar se o registro existe no Supabase
            const { data: existingData, error: checkError } = await supabase
                .from('Registros')
                .select('id')
                .eq('id', data.id)
                .maybeSingle();
                
            if (checkError) {
                console.error(`[Supabase] Erro ao verificar existência do registro:`, checkError);
            }
            
            // Se o registro não existir, inserir em vez de atualizar
            if (!existingData) {
                console.log(`[Supabase] Registro com ID ${data.id} não existe no Supabase, inserindo novo registro`);
                // Continuar com a inserção
            } else {
                console.log(`[Supabase] Registro com ID ${data.id} existe no Supabase, atualizando`);
                return await updateRegistro(data.id, data);
            }
        }
        
        // Limpar dados antes de inserir
        const normalizedData = normalizeData(data);
        
        // Gerar um UUID para o ID se não existir
        if (!normalizedData.id) {
            normalizedData.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
            console.log(`[Supabase] Gerando novo ID para o registro: ${normalizedData.id}`);
        }
        
        // Garantir que os campos estejam no formato correto para o Supabase
        // Converter família para familia (sem acento)
        if (normalizedData['família'] && !normalizedData.familia) {
            normalizedData.familia = normalizedData['família'];
            delete normalizedData['família'];
        }
        
        // Garantir que campos numéricos vazios sejam null
        for (const key in normalizedData) {
            if (normalizedData.hasOwnProperty(key)) {
                if ((key.includes('quantidade') || key.includes('tempo')) && 
                    (normalizedData[key] === '' || normalizedData[key] === undefined)) {
                    normalizedData[key] = null;
                }
                // Converter campos de data vazios para null
                else if ((key.includes('data') || key.includes('Data')) && normalizedData[key] === '') {
                    normalizedData[key] = null;
                }
            }
        }
        
        console.log(`[Supabase] Dados normalizados para inserção:`, normalizedData);
        
        // Verificar se há dados para inserir
        if (Object.keys(normalizedData).length === 0) {
            console.error(`[Supabase] Erro: Nenhum dado válido para inserir após normalização`);
            throw new Error('Nenhum dado válido para inserir após normalização');
        }
        
        // Verificar campos obrigatórios
        const requiredFields = ['produto', 'familia', 'motivo'];
        const missingFields = requiredFields.filter(field => !normalizedData[field]);
        
        if (missingFields.length > 0) {
            console.warn(`[Supabase] Aviso: Campos obrigatórios ausentes: ${missingFields.join(', ')}`);
            // Continuar mesmo com campos ausentes, apenas logar o aviso
        }
        
        console.log(`[Supabase] Enviando dados para inserção:`, JSON.stringify(normalizedData));
        
        const { data: insertedData, error } = await supabase
            .from('Registros')
            .insert([normalizedData])
            .select();
        
        if (error) {
            console.error(`[Supabase] Erro ao adicionar registro:`, error);
            // Logar mais detalhes sobre o erro
            console.error(`[Supabase] Detalhes do erro:`, {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }
        
        console.log(`[Supabase] Registro adicionado com sucesso:`, insertedData[0]);
        return insertedData[0];
    } catch (error) {
        console.error(`[Supabase] Erro ao adicionar registro:`, error);
        throw error;
    }
}

async function deleteRegistro(id) {
    try {
        const { data, error } = await supabase
            .from('Registros')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return { id };
    } catch (error) {
        console.error(`Erro ao deletar registro ${id} no Supabase:`, error);
        throw error;
    }
}

async function updateRegistro(data) {
    try {
        // Verificar se data é um objeto e se tem id
        if (!data || typeof data !== 'object') {
            console.error('[Supabase] Dados inválidos para atualização:', data);
            return null;
        }
        
        const id = data.id;
        if (!id) {
            console.error('[Supabase] ID não fornecido para atualização');
            return null;
        }
        
        console.log(`[Supabase] Tentando atualizar registro com ID: ${id}`);
        console.log(`[Supabase] Dados recebidos para atualização:`, JSON.stringify(data));
        
        // Normalizar dados antes de atualizar usando a função normalizeData
        const normalizedData = normalizeData(data);
        
        // Garantir que o ID seja mantido
        normalizedData.id = id;
        
        console.log(`[Supabase] Dados normalizados para atualização:`, JSON.stringify(normalizedData));
        
        // Verificar se há dados para atualizar
        if (Object.keys(normalizedData).length <= 1) { // Apenas o ID
            console.error(`[Supabase] Erro: Nenhum dado válido para atualizar após normalização`);
            throw new Error('Nenhum dado válido para atualizar após normalização');
        }
        
        // Remover campos que podem causar problemas na atualização
        const cleanedData = { ...normalizedData };
        delete cleanedData.created_at;
        delete cleanedData.updated_at;
        
        console.log(`[Supabase] Enviando dados para atualização:`, JSON.stringify(cleanedData));
        
        console.log(`[Supabase] Executando query de atualização para ID ${id}`);
        console.log(`[Supabase] URL da API Supabase: ${supabase.supabaseUrl}`);
        const { data: updatedData, error } = await supabase
            .from('Registros')
            .update(cleanedData)
            .eq('id', id)
            .select();
        
        console.log(`[Supabase] Resultado da query:`, { data: updatedData, error });
        
        if (error) {
            console.error(`[Supabase] Erro ao atualizar registro ${id}:`, error);
            throw error;
        }
        
        // Se não houver dados retornados, o registro pode não existir no Supabase
        // Nesse caso, tente inserir o registro
        if (!updatedData || updatedData.length === 0) {
            console.log(`[Supabase] Registro com ID ${id} não encontrado para atualização no Supabase, tentando inserir`);
            // Inserir o registro
            const { data: insertedData, error: insertError } = await supabase
                .from('Registros')
                .insert([normalizedData])
                .select();
                
            if (insertError) {
                console.error(`[Supabase] Erro ao inserir registro ${id}:`, insertError);
                throw insertError;
            }
            
            console.log(`[Supabase] Registro inserido com sucesso:`, insertedData[0]);
            return insertedData[0];
        }
        
        console.log(`[Supabase] Registro atualizado com sucesso:`, updatedData[0]);
        return updatedData[0];
    } catch (error) {
        console.error(`[Supabase] Erro ao atualizar registro ${id}:`, error);
        throw error;
    }
}

// Funções de autenticação
async function getUserByEmail(email) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle(); // evita erro quando 0 linhas

        if (error) throw error;
        return data; // null quando não encontrado
    } catch (error) {
        console.error('Erro ao buscar usuário por email:', error);
        return null;
    }
}

async function createUser(userData) {
    try {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        // Contorna PostgREST schema cache quando a coluna 'tipo' não é encontrada
        if (error?.code === 'PGRST204' && String(error?.message || '').includes("'tipo'")) {
            try {
                const { usuario, email, senha } = userData;
                const { data, error: retryError } = await supabase
                    .from('users')
                    .insert([{ usuario, email, senha }]) // sem 'tipo'
                    .select();
                if (retryError) throw retryError;
                return data[0];
            } catch (retryErr) {
                console.error('Erro ao criar usuário (fallback sem tipo):', retryErr);
                throw retryErr;
            }
        }
        console.error('Erro ao criar usuário:', error);
        throw error;
    }
}

async function updateUserPassword(userId, hashedSenha) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ senha: hashedSenha })
            .eq('id', userId)
            .select();
        if (error) throw error;
        return data?.[0];
    } catch (error) {
        console.error('Erro ao atualizar senha do usuário:', error);
        throw error;
    }
}

async function health() {
  try {
    const { error } = await supabase
      .from('users')
      .select('id', { head: true, count: 'exact' });
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    console.error('Health check Supabase falhou:', error);
    return { ok: false, error: error.message || String(error) };
  }
}

// src/supabase.js (acréscimos)
async function listUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, usuario, email, tipo, senha') // removido created_at
      .order('usuario', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return [];
  }
}

async function updateUserType(id, tipo) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ tipo })
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('Erro ao atualizar tipo de usuário:', error);
    throw error;
  }
}

async function deleteUserById(id) {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { id };
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    throw error;
  }
}

// Atualização genérica (usuario, email, tipo, senha já deve vir hash)
async function updateUserGeneral(id, changes) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(changes)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    throw error;
  }
}

// Funções para Histórico de Edição
async function addHistorico(data) {
    try {
        // Verificar se a tabela 'historico' existe e tem a estrutura correta
        const { data: historicoData, error } = await supabase
            .from('historico')
            .insert([data])
            .select();
        
        if (error) {
            // Se a tabela não existir, vamos retornar null para indicar que não foi possível salvar
            if (error.message && (error.message.includes('relation "historico" does not exist') || error.message.includes('table "historico" does not exist'))) {
                console.log('Tabela historico não encontrada. Não foi possível salvar o histórico.');
                return null;
            }
            throw error;
        }
        return historicoData[0];
    } catch (error) {
        console.error('Erro ao adicionar histórico no Supabase:', error);
        throw error;
    }
}

async function getHistorico(limit = 100) {
    try {
        const { data, error } = await supabase
            .from('historico')
            .select('*')
            .order('data', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar histórico do Supabase:', error);
        return [];
    }
}

async function getHistoricoByDateRange(startDate, endDate) {
    try {
        const { data, error } = await supabase
            .from('historico')
            .select('*')
            .gte('data', startDate)
            .lte('data', endDate)
            .order('data', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar histórico por período:', error);
        return [];
    }
}

// Inicializa a conexão ao carregar o módulo
initialize();

module.exports = {
    getRegistros,
    addRegistro,
    deleteRegistro,
    updateRegistro,
    getUserByEmail,
    createUser,
    updateUserPassword,
    listUsers,
    updateUserType,
    deleteUserById,
    updateUserGeneral,
    addHistorico,
    getHistorico,
    getHistoricoByDateRange,
    getRegistrosTableStructure
};