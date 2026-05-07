/* ======================================
   🚀 DERSO PWA - SERVICE WORKER v8
====================================== */

const CACHE_NAME = 'derso-v8';

/* ======================================
   📦 ARQUIVOS ESSENCIAIS
====================================== */
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './main.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

/* ======================================
   🔥 FIREBASE
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

  console.log("📦 Instalando SW v8...");

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );

});

/* ======================================
   ♻️ ACTIVATE
====================================== */
self.addEventListener('activate', (event) => {

  console.log("♻️ Ativando SW v8...");

  event.waitUntil(
    caches.keys().then(keys => {

      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log("🗑️ Removendo cache antigo:", key);
            return caches.delete(key);
          })
      );

    }).then(() => self.clients.claim())
  );

});

/* ======================================
   🌐 FETCH
====================================== */
self.addEventListener('fetch', (event) => {

  // 🚫 ignora métodos não GET
  if (event.request.method !== "GET") return;

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

    caches.match(event.request).then((cachedResponse) => {

      // ✅ retorna cache imediatamente
      if (cachedResponse) {
        return cachedResponse;
      }

      // 🌐 busca rede
      return fetch(event.request)
        .then((networkResponse) => {

          // 🚫 não cacheia resposta inválida
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          // 📦 clona e salva cache
          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;

        })
        .catch(() => {

          // 📄 fallback navegação offline
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }

        });

    })

  );

});

/* ======================================
   🔔 PUSH BACKGROUND
====================================== */
messaging.onBackgroundMessage((payload) => {

  console.log("📩 PUSH RECEBIDO:", payload);

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || "DERSO";
  const body = notification.body || "Nova atualização disponível.";

  const options = {
    body,
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
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

      for (const client of clientsList) {

        if (client.url.includes(url)) {
          await client.focus();
          return;
        }

      }

      await clients.openWindow(url);

      // 📡 informa GAS
      if (data.eventId) {

        fetch(
          "https://script.google.com/macros/s/AKfycbySobQVE00uUwPdlJwvfWzVgfq9N822lBjnIYkp5tMq1-pGE1GzKJHhJKsiepIDZVvSow/exec?action=push_aberto",
          {
            method: "POST",
            body: new URLSearchParams({
              eventId: data.eventId
            })
          }
        ).catch(() => {});

      }

    })()

  );

});
