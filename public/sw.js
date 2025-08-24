const CACHE_NAME = 'repasselfv-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/pwa.css',
  '/pwa.js',
  '/clear-cache.js',
  '/manifest.json',
  '/browserconfig.xml',
  '/logopwa.png',
  '/logogrupodocemel.png',
  '/temaclaro.png',
  '/temaescuro.png',
  '/produtos.json',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        // Adicionar recursos um por vez para evitar falhas
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(error => {
              console.warn(`Falha ao cachear ${url}:`, error);
              return null;
            })
          )
        );
      })
      .catch((error) => {
        console.error('Erro ao instalar cache:', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  // Estratégia: Network First para APIs, Cache First para recursos estáticos
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) {
    // Para APIs, tenta network primeiro, depois cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Se a requisição foi bem-sucedida, retorna a resposta
          return response;
        })
        .catch(() => {
          // Se falhou, tenta buscar do cache
          return caches.match(event.request);
        })
    );
  } else {
    // Para recursos estáticos, tenta cache primeiro, depois network
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
    );
  }
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Sincronização em background iniciada');
    event.waitUntil(doBackgroundSync());
  }
});

// Função para sincronização em background
async function doBackgroundSync() {
  try {
    // Aqui você pode implementar sincronização de dados offline
    console.log('Sincronizando dados em background...');
  } catch (error) {
    console.error('Erro na sincronização em background:', error);
  }
}

// Notificações push
self.addEventListener('push', (event) => {
  console.log('Push notification recebida');
  
  const options = {
    body: event.data ? event.data.text() : 'Nova atualização disponível',
    icon: '/logopwa.png',
    badge: '/logopwa.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
          actions: [
        {
          action: 'explore',
          title: 'Abrir App',
          icon: '/logopwa.png'
        },
        {
          action: 'close',
          title: 'Fechar',
          icon: '/logopwa.png'
        }
      ]
  };

  event.waitUntil(
    self.registration.showNotification('RepasseFLV - GDM', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  console.log('Notificação clicada');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
