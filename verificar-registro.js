/**
 * Script para verificar se um registro específico existe no Supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const SUPABASE_URL = 'https://rfpdyytbxrgrmzlektlr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcGR5eXRieHJncm16bGVrdGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc1NzExOCwiZXhwIjoyMDcwMzMzMTE4fQ.oEUt8-80DW96luyCdoWInWKE0NLE9jtMM8RlKeRnUVc';

// Inicializar cliente do Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ID do registro a ser verificado
const registroId = 'TESTE-FINAL-1755969172929';

async function verificarRegistro() {
  try {
    console.log(`Verificando registro com ID: ${registroId}`);
    
    // Buscar o registro específico
    const { data, error } = await supabase
      .from('Registros')
      .select('*')
      .eq('id', registroId)
      .maybeSingle();
    
    if (error) {
      console.error('Erro ao buscar registro:', error);
      return;
    }
    
    if (data) {
      console.log('Registro encontrado:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`Registro com ID ${registroId} não encontrado no Supabase.`);
    }
    
    // Buscar total de registros para confirmar a sincronização
    const { data: allData, error: countError } = await supabase
      .from('Registros')
      .select('id, produto')
      .limit(10);
    
    if (countError) {
      console.error('Erro ao buscar total de registros:', countError);
      return;
    }
    
    console.log(`\nTotal de registros no Supabase: ${allData.length}`);
    console.log('Registros encontrados:');
    allData.forEach(reg => {
      console.log(`- ${reg.id}: ${reg.produto}`);
    });
    
  } catch (error) {
    console.error('Erro durante a verificação:', error);
  }
}

// Executar a verificação
verificarRegistro().then(() => {
  console.log('Verificação concluída.');
}).catch(error => {
  console.error('Erro fatal durante a verificação:', error);
});