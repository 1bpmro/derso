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
    })
  );
});

// 3. ESTRATÉGIA TURBO: Cache First, then Network
self.addEventListener('fetch', (event) => {
  // Não cacheia chamadas da API do Google (queremos dados sempre reais)
  if (event.request.url.includes('google.com') || event.request.url.includes('exec')) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retorna o cache e tenta atualizar em background
        fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
        });
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
