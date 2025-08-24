const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rfpdyytbxrgrmzlektlr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmcGR5eXRieHJncm16bGVrdGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc1NzExOCwiZXhwIjoyMDcwMzMzMTE4fQ.oEUt8-80DW96luyCdoWInWKE0NLE9jtMM8RlKeRnUVc';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testarExportacao() {
  try {
    console.log('Verificando registros no Supabase...');
    const { data, error } = await supabase
      .from('Registros')
      .select('*')
      .order('id', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Erro ao buscar registros:', error);
    } else {
      console.log(`Total de registros encontrados: ${data.length}`);
      console.log('IDs dos registros:');
      data.forEach(registro => {
        console.log(`- ${registro.id} - ${registro.produto}`);
      });
    }
  } catch (error) {
    console.error('Erro ao conectar com o Supabase:', error);
  }
}

testarExportacao();