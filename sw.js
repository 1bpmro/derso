/* ======================================
   🚀 DERSO PWA - SERVICE WORKER v7 FINAL
====================================== */

const CACHE_NAME = 'derso-v7';

// Arquivos essenciais offline
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'styles.css',
  'main.js',
  'manifest.json', 
  'assets/icon-192.png',
  'assets/icon-512.png'
];

/* ======================================
   🔥 FIREBASE (UNIFICADO)
====================================== */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDqAtLFEwpxN2Yhju8X8I0QeHWR66copLc",
  authDomain: "derso-8294b.firebaseapp.com",
  projectId: "derso-8294b",
  messagingSenderId: "1056159074696",
  appId: "1:1056159074696:web:90962abec6bf703c5d923d"
});

const messaging = firebase.messaging();

/* ======================================
   📦 INSTALL
====================================== */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 Cacheando assets essenciais...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

/* ======================================
   ♻️ ACTIVATE
====================================== */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ======================================
   🌐 FETCH (ANTI-BUG PWA)
====================================== */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 🚫 NÃO INTERCEPTAR APIs EXTERNAS
  if (
    url.hostname.includes("google.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("firebase") ||
    url.pathname.includes("/exec")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {

      if (cached) {
        // 🔄 atualiza em background
        fetch(event.request).then(network => {
          if (network && network.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, network.clone());
            });
          }
        }).catch(() => {});

        return cached;
      }

      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('index.html');
        }
      });
    })
  );
});

/* ======================================
   🔔 PUSH (FIREBASE BACKGROUND)
====================================== */
messaging.onBackgroundMessage((payload) => {
  console.log("📩 PUSH RECEBIDO:", payload);

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || "DERSO";
  const body = notification.body || "Nova atualização disponível.";

  const options = {
    body,
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      eventId: data.eventId || null
    }
  };

  self.registration.showNotification(title, options);
});

/* ======================================
   🖱️ CLICK NA NOTIFICAÇÃO
====================================== */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = new URL(data.url || '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientsList = await clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      let encontrou = false;

      for (const client of clientsList) {
        if (client.url.includes(url)) {
          encontrou = true;
          client.focus();
          break;
        }
      }

      if (!encontrou) {
        await clients.openWindow(url);
      }

      // 📡 Notifica o GAS (push aberto)
      if (data.eventId) {
        fetch("https://script.google.com/macros/s/AKfycbySobQVE00uUwPdlJwvfWzVgfq9N822lBjnIYkp5tMq1-pGE1GzKJHhJKsiepIDZVvSow/exec?action=push_aberto", {
          method: "POST",
          body: new URLSearchParams({
            eventId: data.eventId
          })
        }).catch(() => {});
      }
    })()
  );
});
