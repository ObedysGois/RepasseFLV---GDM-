// PWA Registration and Management
class PWA {
  constructor() {
    this.isOnline = navigator.onLine;
    this.init();
  }

  async init() {
    await this.registerServiceWorker();
    this.setupEventListeners();
    this.checkForUpdates();
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registrado com sucesso:', registration);
        
        // Verificar atualizações
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification();
            }
          });
        });

        return registration;
      } catch (error) {
        console.error('Erro ao registrar Service Worker:', error);
      }
    } else {
      console.log('Service Worker não suportado');
    }
  }

  setupEventListeners() {
    // Monitorar status online/offline
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showNotification('Conexão restaurada', 'Você está online novamente', 'success');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showNotification('Sem conexão', 'Você está offline. Algumas funcionalidades podem estar limitadas.', 'warning');
    });

    // Interceptar erros de rede
    window.addEventListener('error', (event) => {
      if (event.target.tagName === 'IMG' || event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK') {
        console.log('Recurso não carregado:', event.target.src || event.target.href);
      }
    });
  }

  async checkForUpdates() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        await navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
      } catch (error) {
        console.error('Erro ao verificar atualizações:', error);
      }
    }
  }

  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
      <div class="pwa-update-content">
        <i class="fa-solid fa-download"></i>
        <span>Nova versão disponível</span>
        <button onclick="pwa.updateApp()" class="pwa-update-btn">Atualizar</button>
        <button onclick="this.parentElement.parentElement.remove()" class="pwa-close-btn">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover após 10 segundos
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  async updateApp() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        await navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      } catch (error) {
        console.error('Erro ao atualizar app:', error);
      }
    }
  }

  showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `pwa-notification pwa-notification-${type}`;
    notification.innerHTML = `
      <div class="pwa-notification-content">
        <i class="fa-solid ${this.getIconForType(type)}"></i>
        <div class="pwa-notification-text">
          <strong>${title}</strong>
          <span>${message}</span>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="pwa-notification-close">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  getIconForType(type) {
    switch (type) {
      case 'success': return 'fa-check-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'error': return 'fa-times-circle';
      default: return 'fa-info-circle';
    }
  }

  // Solicitar permissão para notificações
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Permissão para notificações concedida');
        return true;
      } else {
        console.log('Permissão para notificações negada');
        return false;
      }
    }
    return false;
  }

  // Enviar notificação local
  sendLocalNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
             const defaultOptions = {
         icon: '/logopwa.png',
         badge: '/logopwa.png',
         vibrate: [100, 50, 100],
         ...options
       };
      
      new Notification(title, defaultOptions);
    }
  }

  // Verificar se é instalável
  isInstallable() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
  }

  // Mostrar prompt de instalação
  showInstallPrompt() {
    if (!this.isInstallable()) {
      const notification = document.createElement('div');
      notification.className = 'pwa-install-prompt';
      notification.innerHTML = `
        <div class="pwa-install-content">
          <i class="fa-solid fa-download"></i>
          <div class="pwa-install-text">
            <strong>Instalar App</strong>
            <span>Adicione RepasseFLV à sua tela inicial para acesso rápido</span>
          </div>
          <button onclick="pwa.installApp()" class="pwa-install-btn">Instalar</button>
          <button onclick="this.parentElement.parentElement.remove()" class="pwa-install-close">
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
      `;
      
      document.body.appendChild(notification);
    }
  }

  installApp() {
    // Esta função seria chamada quando o usuário clicar em "Instalar"
    // O navegador mostrará o prompt de instalação automaticamente
    console.log('Solicitando instalação do app...');
  }
}

// Inicializar PWA quando o DOM estiver carregado
let pwa;
document.addEventListener('DOMContentLoaded', () => {
  pwa = new PWA();
  
  // Mostrar prompt de instalação após 5 segundos
  setTimeout(() => {
    pwa.showInstallPrompt();
  }, 5000);
});

// Expor globalmente para uso em outros scripts
window.pwa = pwa;
