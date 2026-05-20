/* ==========================================================================
   🚀 DERSO PWA - SERVICE WORKER v8 (refatorado)
   ========================================================================== */

// 1. Importa as configurações de versão dinamicamente antes de gerar o cache!
importScripts("./version.js");

// 2. O nome do seu cache agora muda AUTOMATICAMENTE quando você atualiza o version.js!
const CACHE_NAME = `derso-v${self.VERSION_CONTROL.SISTEMA}`;

/* ==========================================================================
   📦 ASSETS ESSENCIAIS
   ========================================================================== */
const ASSETS_TO_CACHE = [
"./",
  "./index.html",
  "./styles.css",
  "./main.js",
  "./version.js", // 👈 Adicione o arquivo de versão na lista de cache!
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

/* ==========================================================================
   🔥 FIREBASE (background messaging)
   ========================================================================== */
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

/* ==========================================================================
   🧠 HELPERS
   ========================================================================== */
const log = (...args) => console.log("📦 SW:", ...args);

const isExternalRequest = (url) =>
  url.hostname.includes("google") ||
  url.hostname.includes("gstatic") ||
  url.hostname.includes("firebase") ||
  url.pathname.includes("/exec");

/* ==========================================================================
   📥 INSTALL
   ========================================================================== */
self.addEventListener("install", (event) => {
  log("Instalando...");

  self.skipWaiting();

  event.waitUntil(cacheAssets());
});

async function cacheAssets() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS_TO_CACHE);
    log("Assets cacheados");
  } catch (err) {
    console.warn("⚠️ Erro ao cachear assets:", err);
  }
}

/* ==========================================================================
   ♻️ ACTIVATE
   ========================================================================== */
self.addEventListener("activate", (event) => {
  log("Ativando...");

  event.waitUntil(cleanOldCaches());
});

async function cleanOldCaches() {
  const keys = await caches.keys();

  await Promise.all(
    keys.map((key) => {
      if (key !== CACHE_NAME) {
        log("Removendo cache antigo:", key);
        return caches.delete(key);
      }
    })
  );

  await self.clients.claim();
}

/* ==========================================================================
   🌐 FETCH STRATEGY
   ========================================================================== */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (shouldIgnoreRequest(req, url)) return;

  event.respondWith(networkFirst(req, url));
});

function shouldIgnoreRequest(req, url) {
  if (req.method !== "GET") return true;
  if (isExternalRequest(url)) return true;
  return false;
}

async function networkFirst(req, url) {
  try {
    const network = await fetch(req);

    if (isCacheable(network, url)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, network.clone());
    }

    return network;
  } catch (err) {
    return fallbackResponse(req);
  }
}

function isCacheable(response, url) {
  return (
    response &&
    response.status === 200 &&
    url.origin === location.origin
  );
}

async function fallbackResponse(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  if (req.mode === "navigate") {
    return caches.match("./index.html");
  }

  return new Response("Offline", {
    status: 503,
    statusText: "Offline"
  });
}

/* ==========================================================================
   🔔 PUSH NOTIFICATIONS
   ========================================================================== */
messaging.onBackgroundMessage((payload) => {
  log("Push recebido", payload);

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || "DERSO";

  // Captura chaves adicionais enviadas pelo servidor se houver
  const options = {
    body: notification.body || "Nova atualização disponível.",
    icon: "./assets/icon-192.png",
    badge: "./assets/icon-192.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "./",
      eventId: data.eventId || "push_geral",
      // Tenta capturar a matrícula se o backend enviar diretamente no push
      matricula: data.matricula || null 
    }
  };

  self.registration.showNotification(title, options);
});

/* ==========================================================================
   鼠标 ️ NOTIFICATION CLICK (CORRIGIDO - CONTABILIZANDO CLIQUES)
   ========================================================================== */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // 1. Recupera os metadados anexados à notificação
  const notificationData = event.notification?.data || {};
  const destino = notificationData.url || "./";
  const eventId = notificationData.eventId || "sem_id";
  
  // 2. Tenta recuperar a matrícula salva localmente no PWA caso o push não traga
  // Como o SW não acessa localStorage diretamente, faremos o Apps Script linkar pelo eventId,
  // mas se o push trouxe a matrícula, nós já enviamos direto.
  const matricula = notificationData.matricula || "pwa_user";

  // 3. Monta a URL de auditoria para o seu Google Apps Script (a mesma URL do config.js)
  const baseApiUrl = "https://script.google.com/macros/s/AKfycbyRZe-Dsc-aKFRwkfRuGPWnstsC-yr7jRfrZGPwunmScbcu_7psRE4lErC-n3GhMN_weg/exec";
  const urlMetrica = `${baseApiUrl}?action=contabilizarClique&eventId=${encodeURIComponent(eventId)}&matricula=${encodeURIComponent(matricula)}&t=${Date.now()}`;

  // 4. Executa a contabilização em background sem travar a abertura da tela do militar
  const promessaContabilizacao = fetch(urlMetrica, {
    method: "GET",
    mode: "no-cors" // Essencial para evitar bloqueios de CORS dentro do Service Worker
  })
  .then(() => log("Clique enviado com sucesso para a API do GAS."))
  .catch((err) => console.error("⚠️ Falha ao registrar métrica de clique:", err));

  // 5. Executa o redirecionamento ou foco da janela
  const promessaNavegacao = focusOrOpen(destino);

  // Mantém o worker ativo até que o log no servidor e a abertura da aba terminem
  event.waitUntil(Promise.all([promessaContabilizacao, promessaNavegacao]));
});

async function focusOrOpen(destino) {
  const clientsList = await clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });

  for (const client of clientsList) {
    if (client.url.includes(destino)) {
      if ("focus" in client) return client.focus();
    }
  }

  return clients.openWindow(destino);
}
