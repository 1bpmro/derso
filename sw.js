const CACHE_NAME = 'derso-v6-final'; // Incrementei a versão para forçar atualização

// Arquivos que o app precisa para abrir mesmo sem sinal
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'styles.css',
  'main.js',
  'manifest.json',
  'assets/icon-192.png',
  'assets/icon-512.png'
];

// 1. Instalação e Cache Inicial
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA DERSO: Cacheando arquivos operacionais...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
                  .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. ESTRATÉGIA: Cache First, then Network
self.addEventListener('fetch', (event) => {
  // Não cacheia chamadas da API do Google ou Google Scripts
  if (event.request.url.includes('google.com') || event.request.url.includes('exec')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Atualiza o cache em background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
          })
          .catch(() => {}); // Falhou? Ignora.

        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        // Se falhar a rede e não tiver cache, tenta o index
        if (event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
      });
    })
  );
});

// 4. Receber PUSH e exibir notificação (Compatível com Firebase V1)
self.addEventListener('push', (event) => {
  let data = {};
  
  if (event.data) {
    try {
      const rawData = event.data.json();
      // A API V1 do Firebase coloca os campos dentro de 'data' ou 'notification'
      // Ajustamos para ler o payload que você definiu no Apps Script
      data = rawData.notification || rawData.data || rawData;
      
      // Se vier do Firebase V1 diretamente, os dados customizados ficam em data.data
      if (rawData.data) {
        data.type = rawData.data.type || data.type;
        data.url = rawData.data.url || data.url;
      }
    } catch (e) {
      console.error("Erro ao processar JSON do Push:", e);
    }
  }

  const title = data.title || 'DERSO';
  const body = data.body || 'Você tem uma nova atualização no sistema.';
  const type = data.type || 'default';

  const options = {
    body: body,
    icon: 'assets/icon-192.png',
    badge: 'assets/icon-192.png', // Ícone da barra de status
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // 🔴 Xeque-mate: Ativa a bolinha se for pendência
      (async () => {
        if (type === 'pendente' && 'setAppBadge' in navigator) {
          try {
            await navigator.setAppBadge(1);
          } catch (err) {
            console.error("Erro ao definir badge:", err);
          }
        }
      })()
    ])
  );
});

// 5. Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se o app já estiver aberto, foca nele
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Senão, abre uma nova aba/janela do PWA
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
