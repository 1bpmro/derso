/* ======================================
   🚀 DERSO PWA - SERVICE WORKER v8
====================================== */

const CACHE_NAME = "derso-v8";

/* ======================================
   📦 ARQUIVOS ESSENCIAIS
====================================== */
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./main.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
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
self.addEventListener("install", (event) => {
  console.log("📦 Instalando SW v8...");

  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

/* ======================================
   ♻️ ACTIVATE
====================================== */
self.addEventListener("activate", (event) => {
  console.log("♻️ Ativando SW v8...");

  event.waitUntil(
    (async () => {

      // 🔥 remove caches antigos
      const keys = await caches.keys();

      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🗑️ Removendo cache:", key);
            return caches.delete(key);
          }
        })
      );

      // 🔥 força controle imediato
      await self.clients.claim();

    })()
  );
});

/* ======================================
   🌐 FETCH
====================================== */
self.addEventListener("fetch", (event) => {

  const req = event.request;
  const url = new URL(req.url);

  // 🚫 IGNORA APIs
  if (
    url.hostname.includes("google") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("firebase") ||
    url.pathname.includes("/exec")
  ) {
    return;
  }

  // 🚫 IGNORA POST
  if (req.method !== "GET") {
    return;
  }

  event.respondWith(
    (async () => {

      try {

        // 🔥 NETWORK FIRST
        const networkResponse = await fetch(req);

        // 🔥 salva cache apenas assets locais
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          url.origin === location.origin
        ) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, networkResponse.clone());
        }

        return networkResponse;

      } catch (err) {

        // 🔥 fallback cache
        const cached = await caches.match(req);

        if (cached) {
          return cached;
        }

        // 🔥 fallback navegação
        if (req.mode === "navigate") {
          return caches.match("./index.html");
        }

      }

    })()
  );
});

/* ======================================
   🔔 PUSH
====================================== */
messaging.onBackgroundMessage((payload) => {

  console.log("📩 PUSH RECEBIDO:", payload);

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || "DERSO";

  const options = {
    body: notification.body || "Nova atualização disponível.",
    icon: "./assets/icon-192.png",
    badge: "./assets/icon-192.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "./",
      eventId: data.eventId || null
    }
  };

  self.registration.showNotification(title, options);

});

/* ======================================
   🖱️ CLICK NOTIFICAÇÃO
====================================== */
self.addEventListener("notificationclick", (event) => {

  event.notification.close();

  const data = event.notification.data || {};
  const destino = data.url || "./";

  event.waitUntil(
    (async () => {

      const clientsList = await clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      for (const client of clientsList) {

        if (client.url.includes(destino)) {
          await client.focus();
          return;
        }
      }

      await clients.openWindow(destino);

    })()
  );

});
