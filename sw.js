const CACHE_NAME = 'derso-v5-final';

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
      console.log('PWA: Cacheando arquivos operacionais...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Limpeza de caches antigos (importante para não travar versões velhas)
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

// 3. ESTRATÉGIA TURBO: Cache First, then Network
self.addEventListener('fetch', (event) => {
  // Não cacheia chamadas da API do Google
  if (event.request.url.includes('google.com') || event.request.url.includes('exec')) {
    return;
  }

event.respondWith(
  caches.match(event.request).then((cachedResponse) => {
    if (cachedResponse) {
      // Atualiza em background (sem quebrar se falhar)
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        })
        .catch(() => {
          // Falhou? ignora silenciosamente
        });

      return cachedResponse;
    }

    // Se não tem cache, tenta rede
    return fetch(event.request).catch(() => {
      return caches.match('index.html');
    });
  })
);


// 4. Receber PUSH e exibir notificação
self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'DERSO',
      body: 'Você tem uma pendência.'
    };
  }

  const title = data.title || 'DERSO';
  const options = {
    body: data.body || 'Você ainda não preencheu o mês atual.',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    data: {
      url: data.url || '/'
    }
  };

event.waitUntil(
  (async () => {
    await self.registration.showNotification(title, options);

    // 🔴 ativa badge real
    if ('setAppBadge' in self.navigator) {
      await self.navigator.setAppBadge(1);
    }
  })()
);
});

// 5. Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
