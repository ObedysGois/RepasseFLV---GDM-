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
    const sheetsRegistros = await getRegistrosFromSheets();
    console.log(`[Sincronização] Total de registros no Google Sheets: ${sheetsRegistros.length}`);
    
    // Buscar registros do Supabase para comparação
    const supabaseRegistros = await getRegistrosFromSupabase();
    console.log(`[Sincronização] Total de registros no Supabase: ${supabaseRegistros.length}`);
    
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
        } else {
          console.error(`[Sincronização] Registro inválido encontrado:`, registro);
          errors++;
        }
      } catch (error) {
        console.error(`[Sincronização] Erro ao processar registro ${registro?.id || 'desconhecido'}:`, error);
        errors++;
      }
    }
    
    console.log('[Sincronização] Sincronização concluída!');
    console.log(`[Sincronização] Registros inseridos: ${inserted}`);
    console.log(`[Sincronização] Registros atualizados: ${updated}`);
    console.log(`[Sincronização] Erros: ${errors}`);
    
    return { inserted, updated, errors };
  } catch (error) {
    console.error('[Sincronização] Erro durante a sincronização:', error);
    throw error;
  }
}

/**
 * Agenda a sincronização para ser executada periodicamente
 * @param {number} intervaloMinutos Intervalo em minutos entre sincronizações
 */
function agendarSincronizacao(intervaloMinutos = 60) {
  console.log(`[Sincronização] Agendando sincronização a cada ${intervaloMinutos} minutos`);
  
  // Executar imediatamente na inicialização
  sincronizarRegistros().catch(error => {
    console.error('[Sincronização] Erro na sincronização inicial:', error);
  });
  
  // Agendar execuções periódicas
  const intervaloMs = intervaloMinutos * 60 * 1000;
  setInterval(() => {
    sincronizarRegistros().catch(error => {
      console.error('[Sincronização] Erro na sincronização agendada:', error);
    });
  }, intervaloMs);
}

module.exports = {
  sincronizarRegistros,
  agendarSincronizacao
};