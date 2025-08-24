// Script para limpar cache e forçar atualização do Service Worker
async function clearCacheAndReload() {
  if ('serviceWorker' in navigator) {
    try {
      // Obter todas as caches
      const cacheNames = await caches.keys();
      console.log('Caches encontradas:', cacheNames);
      
      // Deletar todas as caches
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('Deletando cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
      
      console.log('Todas as caches foram deletadas');
      
      // Desregistrar Service Worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
      
      console.log('Service Workers desregistrados');
      
      // Recarregar a página
      window.location.reload();
      
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }
}

// Função para verificar status do Service Worker
async function checkServiceWorkerStatus() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('Service Workers registrados:', registrations.length);
    
    registrations.forEach((registration, index) => {
      console.log(`SW ${index + 1}:`, {
        scope: registration.scope,
        state: registration.active ? registration.active.state : 'inactive',
        waiting: registration.waiting ? registration.waiting.state : 'none',
        installing: registration.installing ? registration.installing.state : 'none'
      });
    });
    
    return registrations;
  }
  return [];
}

// Função para forçar atualização
async function forceUpdate() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      await navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      console.log('Atualização forçada enviada');
      window.location.reload();
    } catch (error) {
      console.error('Erro ao forçar atualização:', error);
    }
  }
}

// Expor funções globalmente
window.clearCacheAndReload = clearCacheAndReload;
window.checkServiceWorkerStatus = checkServiceWorkerStatus;
window.forceUpdate = forceUpdate;

// Auto-executar verificação de status
document.addEventListener('DOMContentLoaded', () => {
  console.log('=== Status do Service Worker ===');
  checkServiceWorkerStatus();
  
  // Adicionar botão de debug se estiver em desenvolvimento
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const debugDiv = document.createElement('div');
    debugDiv.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 10000;
    `;
    debugDiv.innerHTML = `
      <div>PWA Debug</div>
      <button onclick="clearCacheAndReload()" style="margin: 2px; padding: 2px 4px;">Limpar Cache</button>
      <button onclick="forceUpdate()" style="margin: 2px; padding: 2px 4px;">Forçar Update</button>
      <button onclick="checkServiceWorkerStatus()" style="margin: 2px; padding: 2px 4px;">Verificar SW</button>
    `;
    document.body.appendChild(debugDiv);
  }
});
