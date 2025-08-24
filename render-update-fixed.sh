#!/bin/bash

# Script atualizado para resolver o erro ERR_OSSL_UNSUPPORTED no Render

# Exibir informações de debug
echo "=== Iniciando script de atualização ==="
echo "NODE_VERSION: $(node -v)"
echo "NODE_OPTIONS: $NODE_OPTIONS"

# Verificar se as variáveis de ambiente necessárias estão definidas
if [ -z "$GOOGLE_CLIENT_EMAIL" ]; then
  echo "ERRO: Variável de ambiente GOOGLE_CLIENT_EMAIL não está definida"
  exit 1
fi

if [ -z "$GOOGLE_PRIVATE_KEY" ]; then
  echo "ERRO: Variável de ambiente GOOGLE_PRIVATE_KEY não está definida"
  exit 1
fi

# Verificar formato da chave privada
echo "Verificando formato da chave privada..."
if [[ $GOOGLE_PRIVATE_KEY == *"BEGIN PRIVATE KEY"* ]]; then
  echo "Formato da chave privada parece correto (contém 'BEGIN PRIVATE KEY')"
else
  echo "AVISO: Formato da chave privada pode estar incorreto (não contém 'BEGIN PRIVATE KEY')"
fi

# Criar arquivo googleSheets-debug.js com logs adicionais
cat > src/googleSheets-debug.js << 'EOL'
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Usar variável de ambiente para o ID da planilha
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!SPREADSHEET_ID) {
    console.error('Erro: Variável de ambiente SPREADSHEET_ID deve ser definida no arquivo .env');
    process.exit(1);
}

// Função para formatar corretamente a chave privada
function formatPrivateKey(key) {
    if (!key) return null;
    
    // Remover aspas extras no início e fim se existirem
    let formattedKey = key.replace(/^"(.*)"$/g, '$1');
    
    // Verificar se a chave já tem o formato correto
    if (!formattedKey.includes('BEGIN PRIVATE KEY')) {
        console.error('ERRO: A chave privada não parece estar no formato correto. Deve começar com "-----BEGIN PRIVATE KEY-----"');
    }
    
    // Substituir \n por quebras de linha reais
    formattedKey = formattedKey.replace(/\\n/g, '\n');
    
    return formattedKey;
}

// Carregar credenciais do arquivo ou variáveis de ambiente
let creds;
try {
    const credsPath = path.join(__dirname, 'credentials.json');
    if (fs.existsSync(credsPath)) {
        console.log('Usando credenciais do arquivo credentials.json');
        creds = require('./credentials.json');
    } else {
        // Alternativa: usar variáveis de ambiente se o arquivo não existir
        console.log('Arquivo credentials.json não encontrado, usando variáveis de ambiente');
        
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);
        
        creds = {
            client_email: clientEmail,
            private_key: privateKey
        };
        
        // Verificar se as credenciais estão presentes
        if (!creds.client_email) {
            console.error('Erro: GOOGLE_CLIENT_EMAIL não está definido');
            process.exit(1);
        }
        
        if (!creds.private_key) {
            console.error('Erro: GOOGLE_PRIVATE_KEY não está definido ou está em formato inválido');
            process.exit(1);
        }
        
        // Log para debug
        console.log('Usando credenciais das variáveis de ambiente:');
        console.log('- Client email:', creds.client_email);
        console.log('- Private key (primeiros 30 caracteres):', creds.private_key.substring(0, 30) + '...');
        console.log('- Private key (últimos 30 caracteres): ...' + creds.private_key.substring(creds.private_key.length - 30));
        console.log('- Private key contém "BEGIN PRIVATE KEY":', creds.private_key.includes('BEGIN PRIVATE KEY'));
        console.log('- Private key contém "END PRIVATE KEY":', creds.private_key.includes('END PRIVATE KEY'));
    }
} catch (error) {
    console.error('Erro ao carregar credenciais do Google:', error);
    process.exit(1);
}

// Configura a autenticação JWT com opções adicionais para compatibilidade
const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

async function initialize() {
    try {
        console.log('Tentando conectar ao Google Sheets...');
        await doc.loadInfo(); 
        console.log(`Conectado à planilha: ${doc.title}`);
        return true;
    } catch (error) {
        console.error('Erro ao conectar com a planilha:', error);
        if (error.code === 'ERR_OSSL_UNSUPPORTED') {
            console.error('Este é um erro de OpenSSL. Verifique se NODE_OPTIONS="--openssl-legacy-provider" está definido.');
        }
        throw error;
    }
}

async function getRegistros() {
    try {
        await doc.loadInfo(); // Garante que a planilha está carregada
        const sheet = doc.sheetsByTitle['Registros']; 
        if (!sheet) {
            console.error("Aba 'Registros' não encontrada!");
            return [];
        }
        const rows = await sheet.getRows();
        console.log(`Obtidos ${rows.length} registros da planilha`);
        // Converte cada linha para um objeto simples (cabeçalho: valor)
        return rows.map(row => row.toObject());
    } catch (error) {
        console.error('Erro ao obter registros da planilha:', error);
        return [];
    }
}

async function addRegistro(data) {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Registros'];
        if (!sheet) {
            console.error("Aba 'Registros' não encontrada!");
            return null;
        }
        const newRow = await sheet.addRow(data);
        return newRow.toObject(); // Retorna a linha adicionada como um objeto
    } catch (error) {
        console.error('Erro ao adicionar registro na planilha:', error);
        return null;
    }
}

async function deleteRegistro(id) {
    try {
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Registros'];
        if (!sheet) throw new Error("Aba 'Registros' não encontrada!");

        const rows = await sheet.getRows();
        const rowToDelete = rows.find(row => row.get('id') === id);

        if (!rowToDelete) {
            console.warn(`Registro com ID ${id} não encontrado para exclusão.`);
            return null; // Indica que não encontrou
        }

        await rowToDelete.delete();
        console.log(`Registro com ID ${id} foi excluído.`);
        return { id: id }; // Retorna o ID do registro excluído
    } catch (error) {
        console.error('Erro ao excluir registro da planilha:', error);
        return null;
    }
}

async function updateRegistro(id, data) {
    try {
        console.log(`[GoogleSheets] Tentando atualizar registro com ID: ${id}`);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle['Registros'];
        if (!sheet) throw new Error("Aba 'Registros' não encontrada!");

        const rows = await sheet.getRows();
        const rowToUpdate = rows.find(row => row.get('id') === id);

        if (!rowToUpdate) {
            console.warn(`[GoogleSheets] Registro com ID ${id} não encontrado para atualização.`);
            return null; // Indica que não encontrou
        }

        // Atualizar cada campo do registro
        Object.keys(data).forEach(key => {
            if (key !== 'id') { // Não atualizar o ID
                rowToUpdate.set(key, data[key]);
            }
        });

        await rowToUpdate.save();
        console.log(`[GoogleSheets] Registro com ID ${id} foi atualizado.`);
        return rowToUpdate.toObject(); // Retorna o registro atualizado
    } catch (error) {
        console.error('[GoogleSheets] Erro ao atualizar registro:', error);
        return null;
    }
}

module.exports = {
    initialize,
    getRegistros,
    addRegistro,
    deleteRegistro,
    updateRegistro
};
EOL

# Copiar o arquivo de debug para googleSheets.js
cp src/googleSheets-debug.js src/googleSheets.js
echo "Arquivo googleSheets.js atualizado com versão de debug"

# Garantir que o Node.js v18 seja usado
echo "18.18.0" > .node-version
echo "Node.js v18.18.0 configurado"

# Definir a flag NODE_OPTIONS para compatibilidade com OpenSSL
export NODE_OPTIONS="--openssl-legacy-provider"
echo "NODE_OPTIONS definido como --openssl-legacy-provider"

# Criar um arquivo temporário para testar a conexão com o Google Sheets
cat > test-sheets-connection.js << 'EOL'
const { initialize } = require('./src/googleSheets');

async function testConnection() {
  try {
    console.log('Testando conexão com o Google Sheets...');
    await initialize();
    console.log('Conexão com o Google Sheets bem-sucedida!');
    process.exit(0);
  } catch (error) {
    console.error('Falha na conexão com o Google Sheets:', error);
    process.exit(1);
  }
}

testConnection();
EOL

# Testar a conexão com o Google Sheets
echo "Testando conexão com o Google Sheets..."
node test-sheets-connection.js || echo "Aviso: Teste de conexão falhou, mas continuando com a inicialização do servidor"

# Modificar o arquivo sincronizacao.js para adicionar tratamento de erro
cat > src/sincronizacao-fixed.js << 'EOL'
/**
 * Módulo de sincronização entre Google Sheets e Supabase
 */

const { getRegistros: getRegistrosFromSheets } = require('./googleSheets');
const { getRegistros: getRegistrosFromSupabase, addRegistro, updateRegistro } = require('./supabase');

/**
 * Sincroniza todos os registros do Google Sheets com o Supabase
 * @returns {Promise<{inserted: number, updated: number, errors: number}>} Estatísticas da sincronização
 */
async function sincronizarRegistros() {
  try {
    console.log('[Sincronização] Iniciando sincronização de registros...');
    
    // Buscar registros do Google Sheets
    let sheetsRegistros = [];
    try {
      sheetsRegistros = await getRegistrosFromSheets();
      console.log(`[Sincronização] Total de registros no Google Sheets: ${sheetsRegistros.length}`);
    } catch (error) {
      console.error('[Sincronização] Erro ao obter registros do Google Sheets:', error);
      return { inserted: 0, updated: 0, errors: 1, message: 'Erro ao obter registros do Google Sheets' };
    }
    
    // Se não conseguiu obter registros do Google Sheets, encerra a sincronização
    if (!sheetsRegistros || sheetsRegistros.length === 0) {
      console.warn('[Sincronização] Nenhum registro obtido do Google Sheets, sincronização cancelada');
      return { inserted: 0, updated: 0, errors: 0, message: 'Nenhum registro obtido do Google Sheets' };
    }
    
    // Buscar registros do Supabase para comparação
    let supabaseRegistros = [];
    try {
      supabaseRegistros = await getRegistrosFromSupabase();
      console.log(`[Sincronização] Total de registros no Supabase: ${supabaseRegistros.length}`);
    } catch (error) {
      console.error('[Sincronização] Erro ao obter registros do Supabase:', error);
      return { inserted: 0, updated: 0, errors: 1, message: 'Erro ao obter registros do Supabase' };
    }
    
    // Mapear IDs dos registros do Supabase para verificação rápida
    const supabaseIds = new Set(supabaseRegistros.map(r => r.id));
    
    // Contador de operações
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    // Processar cada registro do Google Sheets
    for (const registro of sheetsRegistros) {
      if (!registro.id) {
        console.warn('[Sincronização] Registro sem ID encontrado, ignorando:', registro);
        continue;
      }
      
      try {
        // Garantir que o registro é um objeto válido com propriedades
        if (typeof registro === 'object' && registro !== null) {
          // Criar uma cópia do registro para evitar problemas de referência
          const registroCopy = { ...registro };
          
          if (supabaseIds.has(registro.id)) {
            // Atualizar registro existente
            await updateRegistro(registroCopy);
            updated++;
          } else {
            // Inserir novo registro
            await addRegistro(registroCopy);
            inserted++;
          }
        }
      } catch (error) {
        console.error(`[Sincronização] Erro ao processar registro ${registro.id}:`, error);
        errors++;
      }
    }
    
    console.log(`[Sincronização] Concluída: ${inserted} inseridos, ${updated} atualizados, ${errors} erros`);
    return { inserted, updated, errors };
  } catch (error) {
    console.error('[Sincronização] Erro durante a sincronização:', error);
    return { inserted: 0, updated: 0, errors: 1, message: error.message };
  }
}

module.exports = {
  sincronizarRegistros
};
EOL

# Copiar o arquivo de sincronização corrigido
cp src/sincronizacao-fixed.js src/sincronizacao.js
echo "Arquivo sincronizacao.js atualizado com melhor tratamento de erros"

# Iniciar o servidor
echo "=== Iniciando o servidor ==="
npm start