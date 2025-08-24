/**
 * Script para configurar a sincronização automática entre Google Sheets e Supabase
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Detectar o sistema operacional
const isWindows = os.platform() === 'win32';
const isLinux = os.platform() === 'linux';
const isMac = os.platform() === 'darwin';

// Caminho absoluto para o diretório do projeto
const projectDir = __dirname;

// Caminho absoluto para o script de sincronização
const syncScriptPath = path.join(projectDir, 'sincronizar-supabase.js');

// Verificar se o arquivo .env existe
if (!fs.existsSync(path.join(projectDir, '.env'))) {
    console.error('Erro: Arquivo .env não encontrado. Crie o arquivo .env com as variáveis necessárias.');
    process.exit(1);
}

// Verificar se o script de sincronização existe
if (!fs.existsSync(syncScriptPath)) {
    console.error(`Erro: Script de sincronização não encontrado em ${syncScriptPath}`);
    process.exit(1);
}

// Função para configurar a sincronização no Windows usando Task Scheduler
function setupWindowsSync() {
    console.log('Configurando sincronização automática no Windows...');
    
    // Caminho para o Node.js
    const nodePath = process.execPath;
    
    // Criar um arquivo batch para executar o script
    const batchFilePath = path.join(projectDir, 'run-sync.bat');
    const batchContent = `@echo off\r\ncd /d "${projectDir}"\r\n"${nodePath}" "${syncScriptPath}" >> "${projectDir}\\logs\\sincronizacao.log" 2>&1\r\n`;
    
    // Criar diretório de logs se não existir
    if (!fs.existsSync(path.join(projectDir, 'logs'))) {
        fs.mkdirSync(path.join(projectDir, 'logs'));
    }
    
    // Escrever o arquivo batch
    fs.writeFileSync(batchFilePath, batchContent);
    console.log(`Arquivo batch criado em: ${batchFilePath}`);
    
    // Criar a tarefa agendada usando schtasks
    const taskName = 'SincronizacaoRepasseGoogleSheetsSupabase';
    const command = `schtasks /create /tn "${taskName}" /tr "${batchFilePath}" /sc HOURLY /mo 1 /f`;
    
    try {
        execSync(command);
        console.log('Tarefa agendada criada com sucesso! A sincronização será executada a cada hora.');
        console.log('Para modificar a frequência, use o Task Scheduler do Windows.');
    } catch (error) {
        console.error('Erro ao criar a tarefa agendada:', error.message);
        console.log('Você pode criar a tarefa manualmente usando o Task Scheduler do Windows.');
        console.log(`Comando para executar: ${nodePath} ${syncScriptPath}`);
    }
}

// Função para configurar a sincronização no Linux/Mac usando cron
function setupUnixSync() {
    console.log(`Configurando sincronização automática no ${isMac ? 'macOS' : 'Linux'}...`);
    
    // Caminho para o Node.js
    const nodePath = process.execPath;
    
    // Criar diretório de logs se não existir
    if (!fs.existsSync(path.join(projectDir, 'logs'))) {
        fs.mkdirSync(path.join(projectDir, 'logs'));
    }
    
    // Criar um arquivo shell script para executar o script
    const shellScriptPath = path.join(projectDir, 'run-sync.sh');
    const shellContent = `#!/bin/bash\ncd "${projectDir}"\n"${nodePath}" "${syncScriptPath}" >> "${projectDir}/logs/sincronizacao.log" 2>&1\n`;
    
    // Escrever o arquivo shell script
    fs.writeFileSync(shellScriptPath, shellContent);
    fs.chmodSync(shellScriptPath, '755'); // Tornar o script executável
    console.log(`Script shell criado em: ${shellScriptPath}`);
    
    // Criar a entrada cron
    const cronEntry = `0 * * * * ${shellScriptPath}\n`;
    const tempCronPath = path.join(projectDir, 'temp-cron');
    
    try {
        // Exportar cron atual
        execSync(`crontab -l > ${tempCronPath} 2>/dev/null || true`);
        
        // Verificar se a entrada já existe
        const currentCron = fs.readFileSync(tempCronPath, 'utf8');
        if (currentCron.includes(shellScriptPath)) {
            console.log('A tarefa cron já existe.');
        } else {
            // Adicionar nova entrada
            fs.appendFileSync(tempCronPath, cronEntry);
            execSync(`crontab ${tempCronPath}`);
            console.log('Tarefa cron adicionada com sucesso! A sincronização será executada a cada hora.');
        }
        
        // Limpar arquivo temporário
        fs.unlinkSync(tempCronPath);
    } catch (error) {
        console.error('Erro ao configurar cron:', error.message);
        console.log('Você pode adicionar manualmente a seguinte linha ao seu crontab (crontab -e):');
        console.log(cronEntry);
    }
}

// Executar a configuração apropriada com base no sistema operacional
if (isWindows) {
    setupWindowsSync();
} else if (isLinux || isMac) {
    setupUnixSync();
} else {
    console.log('Sistema operacional não suportado para configuração automática.');
    console.log('Você pode configurar manualmente a sincronização seguindo as instruções no README-sincronizacao.md');
}

console.log('\nInstruções para verificar o funcionamento:');
console.log('1. Aguarde o horário agendado para a primeira execução');
console.log('2. Verifique o arquivo de log em logs/sincronizacao.log');
console.log('3. Para executar manualmente a sincronização, use: node sincronizar-supabase.js');