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

// Carregar credenciais do arquivo ou variáveis de ambiente
let creds;
try {
    const credsPath = path.join(__dirname, 'credentials.json');
    if (fs.existsSync(credsPath)) {
        creds = require('./credentials.json');
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

// Configura a autenticação JWT
const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

async function initialize() {
    try {
        await doc.loadInfo(); 
        console.log(`Conectado à planilha: ${doc.title}`);
    } catch (error) {
        console.error("Erro ao conectar com a planilha:", error);
        throw error; // Propaga o erro para o server.js
    }
}

async function getRegistros() {
    await doc.loadInfo(); // Garante que a planilha está carregada
    const sheet = doc.sheetsByTitle['Registros']; 
    if (!sheet) {
        console.error("Aba 'Registros' não encontrada!");
        return [];
    }
    const rows = await sheet.getRows();
    // Converte cada linha para um objeto simples (cabeçalho: valor)
    return rows.map(row => row.toObject());
}

async function addRegistro(data) {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Registros'];
    if (!sheet) {
        console.error("Aba 'Registros' não encontrada!");
        return null;
    }
    const newRow = await sheet.addRow(data);
    return newRow.toObject(); // Retorna a linha adicionada como um objeto
}

async function deleteRegistro(id) {
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
}

async function updateRegistro(id, data) {
    console.log(`[GoogleSheets] Tentando atualizar registro com ID: ${id}`);
    console.log(`[GoogleSheets] Dados recebidos para atualização:`, data);

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Registros'];
    if (!sheet) {
        console.error("[GoogleSheets] Aba 'Registros' não encontrada!");
        throw new Error("Aba 'Registros' não encontrada!");
    }

    const rows = await sheet.getRows();
    console.log(`[GoogleSheets] Total de linhas na planilha: ${rows.length}`);
    const rowToUpdate = rows.find(row => {
        const rowId = row.get('id');
        console.log(`[GoogleSheets] Comparando: ${rowId} === ${id}`);
        return rowId === id;
    });

    if (!rowToUpdate) {
        console.warn(`[GoogleSheets] Registro com ID ${id} não encontrado para atualização.`);
        return null;
    }

    console.log(`[GoogleSheets] Registro encontrado para atualização:`, rowToUpdate.toObject());

    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            // Tratar campos com nomes especiais
            let sheetKey = key;
            if (key === 'tempo(dias)') {
                sheetKey = 'tempo(dias)';
            }
            
            // Tratar valores vazios
            const value = data[key] === undefined ? '' : data[key];
            
            console.log(`[GoogleSheets] Atualizando campo ${sheetKey}: ${rowToUpdate.get(sheetKey)} -> ${value}`);
            rowToUpdate.set(sheetKey, value);
        }
    }
    await rowToUpdate.save();
    console.log(`[GoogleSheets] Registro com ID ${id} foi atualizado e salvo.`);
    return rowToUpdate.toObject();
}

// Inicializa a conexão ao carregar o módulo
initialize();

module.exports = {
    getRegistros,
    addRegistro,
    deleteRegistro,
    updateRegistro
};