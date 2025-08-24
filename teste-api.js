// Importar node-fetch versão 3 (ESM)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testarAPI() {
  try {
    console.log('Testando adição de registro via API...');
    
    const novoRegistro = {
      id: `TESTE-API-${Date.now()}`,
      produto: 'Produto Teste API',
      familia: 'Família Teste API',
      motivo: 'Teste de API',
      'quantidade 1': 30,
      'vendedor 1': 'Vendedor Teste API'
    };
    
    console.log('Enviando registro:', novoRegistro);
    
    const response = await fetch('http://localhost:3000/api/registros', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(novoRegistro)
    });
    
    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
    }
    
    const resultado = await response.json();
    console.log('Resposta da API:', resultado);
    console.log('Registro adicionado com sucesso via API!');
    
    // Verificar se o registro foi adicionado no Supabase
    console.log('\nVerificando se o registro foi adicionado no Supabase...');
    setTimeout(async () => {
      const { createClient } = require('@supabase/supabase-js');
      const SUPABASE_URL = 'https://rfpdyytbxrgrmzlektlr.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcGR5eXRieHJncm16bGVrdGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc1NzExOCwiZXhwIjoyMDcwMzMzMTE4fQ.oEUt8-80DW96luyCdoWInWKE0NLE9jtMM8RlKeRnUVc';
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      
      const { data, error } = await supabase
        .from('Registros')
        .select('*')
        .eq('id', novoRegistro.id);
      
      if (error) {
        console.error('Erro ao verificar registro no Supabase:', error);
      } else if (data.length === 0) {
        console.log('Registro NÃO encontrado no Supabase!');
      } else {
        console.log('Registro encontrado no Supabase:', data[0]);
      }
    }, 2000); // Aguardar 2 segundos para garantir que o registro tenha tempo de ser exportado
    
  } catch (error) {
    console.error('Erro ao testar API:', error);
  }
}

testarAPI();