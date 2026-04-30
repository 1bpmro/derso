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

// 🔔 RECEBE PUSH EM BACKGROUND
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const { eventId, url } = payload.data || {};

  self.registration.showNotification(title, {
    body: body,
    icon: "/assets/icon-192.png",
    data: {
      eventId: eventId,
      url: url || "/"
    }
  });
});

// 🧠 CAPTURA CLIQUE NA NOTIFICAÇÃO
self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data;
  const eventId = data?.eventId;
  const url = data?.url || "/";

  event.notification.close();

  // 🚀 abre o app
  event.waitUntil(
    (async () => {
      // 1. abre ou foca aba
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });

      let appAberto = false;

      for (const client of allClients) {
        if (client.url.includes(url)) {
          appAberto = true;
          client.focus();
          break;
        }
      }

      if (!appAberto) {
        await clients.openWindow(url);
      }

      // 2. avisa o GAS que foi ABERTO 👀
      if (eventId) {
        fetch("https://script.google.com/macros/s/AKfycbySobQVE00uUwPdlJwvfWzVgfq9N822lBjnIYkp5tMq1-pGE1GzKJHhJKsiepIDZVvSow/exec?action=push_aberto", {
          method: "POST",
          body: new URLSearchParams({
            eventId: eventId
          })
        });
      }
    })()
  );
});
