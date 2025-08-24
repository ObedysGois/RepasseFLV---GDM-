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
        // Corrigir o formato da chave privada para evitar problemas de decodificação
        const privateKey = process.env.GOOGLE_PRIVATE_KEY;
        let formattedPrivateKey;
        
        if (privateKey) {
            // Remover aspas extras no início e fim se existirem
            formattedPrivateKey = privateKey
                .replace(/^"|"$/g, '') // Remove aspas no início e fim
                .replace(/\\n/g, '\n'); // Substitui \n por \n literal
        }
        
        creds = {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: formattedPrivateKey
        };
        
        if (!creds.client_email || !creds.private_key) {
            console.error('Erro: Credenciais do Google não encontradas. Configure o arquivo credentials.json ou as variáveis de ambiente GOOGLE_CLIENT_EMAIL e GOOGLE_PRIVATE_KEY');
            process.exit(1);
        }
        
        // Log para debug (remover em produção)
        console.log('Usando credenciais das variáveis de ambiente');
        console.log('Client email:', creds.client_email);
        console.log('Private key format check:', 
            creds.private_key ? 
            `Começa com: ${creds.private_key.substring(0, 27)}... Termina com: ...${creds.private_key.substring(creds.private_key.length - 25)}` : 
            'Chave privada não definida');
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
    if (!sheet) throw new Error("Aba 'Registros' não encontrada!");

    const rows = await sheet.getRows();
    const rowToUpdate = rows.find(row => row.get('id') === id);

    if (!rowToUpdate) {
        console.warn(`Registro com ID ${id} não encontrado para atualização.`);
        return null; // Indica que não encontrou
    }

    // Atualiza cada campo do registro
    Object.keys(data).forEach(key => {
        if (key !== 'id') { // Não atualiza o ID
            rowToUpdate.set(key, data[key]);
        }
    });

    await rowToUpdate.save();
    console.log(`Registro com ID ${id} foi atualizado.`);
    return rowToUpdate.toObject(); // Retorna o registro atualizado
}

module.exports = {
    initialize,
    getRegistros,
    addRegistro,
    deleteRegistro,
    updateRegistro
};