/* ======================================
   🚀 DERSO PWA - SERVICE WORKER v8 (refinado)
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
   🔥 FIREBASE MESSAGING (background)
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
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(ASSETS_TO_CACHE);
      } catch (err) {
        console.warn("⚠️ Falha ao cachear assets iniciais:", err);
      }
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
      const keys = await caches.keys();

      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🗑️ Removendo cache:", key);
            return caches.delete(key);
          }
        })
      );

      await self.clients.claim();
    })()
  );
});

/* ======================================
   🌐 FETCH (network first + cache fallback)
====================================== */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 🚫 ignora APIs e externos pesados
  if (
    url.hostname.includes("google") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("firebase") ||
    url.pathname.includes("/exec")
  ) {
    return;
  }

  // 🚫 ignora não-GET
  if (req.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(req);

        if (
          networkResponse &&
          networkResponse.status === 200 &&
          url.origin === location.origin
        ) {
          const cache = await caches.open(CACHE_NAME);

          // evita cache de respostas inválidas
          cache.put(req, networkResponse.clone());
        }

        return networkResponse;

      } catch (err) {
        const cached = await caches.match(req);

        if (cached) return cached;

        // fallback SPA seguro
        if (req.mode === "navigate") {
          return caches.match("./index.html");
        }

        return new Response("Offline", {
          status: 503,
          statusText: "Offline"
        });
      }
    })()
  );
});

/* ======================================
   🔔 PUSH NOTIFICATION
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
   🖱️ NOTIFICATION CLICK
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
