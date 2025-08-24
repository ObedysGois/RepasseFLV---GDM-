/**
 * Script para sincronizar registros do Google Sheets com o Supabase
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Carregar credenciais do arquivo ou variáveis de ambiente
let creds;
try {
    const credsPath = path.join(__dirname, 'src', 'credentials.json');
    if (fs.existsSync(credsPath)) {
        creds = require('./src/credentials.json');
    } else {
        // Alternativa: usar variáveis de ambiente se o arquivo não existir
        creds = {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        };
        
        if (!creds.client_email || !creds.private_key) {
            console.error('Erro: Credenciais do Google não encontradas. Configure o arquivo credentials.json ou as variáveis de ambiente GOOGLE_CLIENT_EMAIL e GOOGLE_PRIVATE_KEY');
            process.exit(1);
        }
    }
} catch (error) {
    console.error('Erro ao carregar credenciais do Google:', error);
    process.exit(1);
}

// Configuração do Google Sheets
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Verificar se as variáveis de ambiente estão definidas
if (!SPREADSHEET_ID || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Erro: Variáveis de ambiente SPREADSHEET_ID, SUPABASE_URL e SUPABASE_KEY devem ser definidas no arquivo .env');
    process.exit(1);
}

// Inicializar clientes
const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Normaliza os dados para o formato do Supabase
 */
function normalizeData(data) {
  const normalizedData = { ...data };
  
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
  
  return normalizedData;
}

/**
 * Busca todos os registros do Google Sheets
 */
async function getRegistrosFromSheets() {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Registros'];
    if (!sheet) {
      console.error("Aba 'Registros' não encontrada!");
      return [];
    }
    const rows = await sheet.getRows();
    return rows.map(row => row.toObject());
  } catch (error) {
    console.error('Erro ao buscar registros do Google Sheets:', error);
    return [];
  }
}

/**
 * Busca todos os registros do Supabase
 */
async function getRegistrosFromSupabase() {
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

/**
 * Adiciona ou atualiza um registro no Supabase
 */
async function upsertRegistroToSupabase(registro) {
  try {
    const normalizedData = normalizeData(registro);
    
    // Verificar se o registro já existe no Supabase
    const { data: existingData, error: checkError } = await supabase
      .from('Registros')
      .select('id')
      .eq('id', normalizedData.id)
      .maybeSingle();
      
    if (checkError) {
      console.error(`Erro ao verificar existência do registro:`, checkError);
      return null;
    }
    
    if (!existingData) {
      // Inserir novo registro
      console.log(`Inserindo registro com ID ${normalizedData.id} no Supabase`);
      const { data: insertedData, error: insertError } = await supabase
        .from('Registros')
        .insert([normalizedData])
        .select();
      
      if (insertError) {
        console.error(`Erro ao inserir registro:`, insertError);
        return null;
      }
      
      return insertedData[0];
    } else {
      // Atualizar registro existente
      console.log(`Atualizando registro com ID ${normalizedData.id} no Supabase`);
      const { data: updatedData, error: updateError } = await supabase
        .from('Registros')
        .update(normalizedData)
        .eq('id', normalizedData.id)
        .select();
      
      if (updateError) {
        console.error(`Erro ao atualizar registro:`, updateError);
        return null;
      }
      
      return updatedData[0];
    }
  } catch (error) {
    console.error(`Erro ao adicionar/atualizar registro:`, error);
    return null;
  }
}

/**
 * Sincroniza todos os registros do Google Sheets com o Supabase
 */
async function sincronizarRegistros() {
  try {
    console.log('Iniciando sincronização de registros...');
    
    // Buscar registros do Google Sheets
    const sheetsRegistros = await getRegistrosFromSheets();
    console.log(`Total de registros no Google Sheets: ${sheetsRegistros.length}`);
    
    // Buscar registros do Supabase para comparação
    const supabaseRegistros = await getRegistrosFromSupabase();
    console.log(`Total de registros no Supabase: ${supabaseRegistros.length}`);
    
    // Mapear IDs dos registros do Supabase para verificação rápida
    const supabaseIds = new Set(supabaseRegistros.map(r => r.id));
    
    // Contador de operações
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    // Processar cada registro do Google Sheets
    for (const registro of sheetsRegistros) {
      if (!registro.id) {
        console.warn('Registro sem ID encontrado, ignorando:', registro);
        continue;
      }
      
      const result = await upsertRegistroToSupabase(registro);
      
      if (result) {
        if (supabaseIds.has(registro.id)) {
          updated++;
        } else {
          inserted++;
        }
      } else {
        errors++;
      }
    }
    
    console.log('Sincronização concluída!');
    console.log(`Registros inseridos: ${inserted}`);
    console.log(`Registros atualizados: ${updated}`);
    console.log(`Erros: ${errors}`);
    
  } catch (error) {
    console.error('Erro durante a sincronização:', error);
  }
}

// Executar a sincronização
sincronizarRegistros().then(() => {
  console.log('Processo de sincronização finalizado.');
}).catch(error => {
  console.error('Erro fatal durante a sincronização:', error);
});