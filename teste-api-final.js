/**
 * Script para testar a adição de um registro via API e verificar a sincronização com o Supabase
 */

// Importar o módulo fetch para fazer requisições HTTP
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const SUPABASE_URL = 'https://rfpdyytbxrgrmzlektlr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcGR5eXRieHJncm16bGVrdGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc1NzExOCwiZXhwIjoyMDcwMzMzMTE4fQ.oEUt8-80DW96luyCdoWInWKE0NLE9jtMM8RlKeRnUVc';

// Inicializar cliente do Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// URL da API local
const API_URL = 'http://localhost:3000/api/registros';

// Gerar um ID único para o teste
const timestamp = Date.now();
const registroId = `TESTE-FINAL-SYNC-${timestamp}`;

// Dados do registro de teste
const novoRegistro = {
  id: registroId,
  produto: 'Produto Teste Sincronização',
  familia: 'Família Teste Sincronização',
  motivo: 'Teste de Sincronização',
  'quantidade 1': 50,
  'vendedor 1': 'Vendedor Teste Sincronização',
  status: 'Pendente',
  quantidadeSolicitada: 100,
  quantidadeRepassada: 50
};

/**
 * Adiciona um registro via API
 */
async function adicionarRegistroViaAPI() {
  try {
    console.log('Adicionando registro via API...');
    console.log('Dados do registro:', novoRegistro);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'teste@example.com' // Cabeçalho de autenticação
      },
      body: JSON.stringify(novoRegistro)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Registro adicionado com sucesso via API!');
      console.log('Resposta da API:', result);
      return true;
    } else {
      console.error('Erro ao adicionar registro via API:', result);
      return false;
    }
  } catch (error) {
    console.error('Erro ao fazer requisição para a API:', error);
    return false;
  }
}

/**
 * Verifica se o registro existe no Supabase
 */
async function verificarRegistroNoSupabase() {
  try {
    console.log(`\nVerificando registro com ID ${registroId} no Supabase...`);
    
    // Aguardar um pouco para dar tempo à sincronização
    console.log('Aguardando 3 segundos para a sincronização...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Buscar o registro específico
    const { data, error } = await supabase
      .from('Registros')
      .select('*')
      .eq('id', registroId)
      .maybeSingle();
    
    if (error) {
      console.error('Erro ao buscar registro no Supabase:', error);
      return false;
    }
    
    if (data) {
      console.log('Registro encontrado no Supabase:');
      console.log(JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log(`Registro com ID ${registroId} NÃO encontrado no Supabase.`);
      return false;
    }
  } catch (error) {
    console.error('Erro durante a verificação no Supabase:', error);
    return false;
  }
}

/**
 * Executa o teste completo
 */
async function executarTeste() {
  try {
    console.log('=== TESTE DE SINCRONIZAÇÃO API → SUPABASE ===');
    
    // Adicionar registro via API
    const adicionado = await adicionarRegistroViaAPI();
    if (!adicionado) {
      console.error('Teste falhou: Não foi possível adicionar o registro via API.');
      return;
    }
    
    // Verificar se o registro foi sincronizado com o Supabase
    const sincronizado = await verificarRegistroNoSupabase();
    
    if (sincronizado) {
      console.log('\n✅ TESTE PASSOU: O registro foi adicionado via API e sincronizado com o Supabase com sucesso!');
    } else {
      console.log('\n❌ TESTE FALHOU: O registro foi adicionado via API, mas não foi sincronizado com o Supabase.');
      
      // Verificar novamente após um tempo maior
      console.log('\nAguardando mais 5 segundos para uma nova verificação...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const sincronizadoRetry = await verificarRegistroNoSupabase();
      
      if (sincronizadoRetry) {
        console.log('\n✅ TESTE PASSOU (na segunda tentativa): O registro foi sincronizado com o Supabase!');
      } else {
        console.log('\n❌ TESTE FALHOU: O registro não foi sincronizado com o Supabase mesmo após espera adicional.');
      }
    }
  } catch (error) {
    console.error('Erro durante a execução do teste:', error);
  }
}

// Executar o teste
executarTeste().then(() => {
  console.log('\nTeste concluído.');
}).catch(error => {
  console.error('Erro fatal durante o teste:', error);
});