// services/firebase.js

import { registrarLog } from "./logger.js";

// 🔥 Firebase (ESM via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

// 🔐 CONFIG DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDqAtLFEwpxN2Yhju8X8I0QeHWR66copLc",
  authDomain: "derso-8294b.firebaseapp.com",
  projectId: "derso-8294b",
  messagingSenderId: "1056159074696",
  appId: "1:1056159074696:web:90962abec6bf703c5d923d"
};

// 🔑 VAPID KEY
const VAPID_KEY = "BHGFjPdrcahFdPsIVDsA4RA04ArqgiVslZgoZXjwm49O-au9z4hN2TLNQfhYsWdRQnEkZ4khJCaSb-S09dSolkc";

// 🌐 URL DO GAS
const GAS_URL = "https://script.google.com/macros/s/AKfycbySobQVE00uUwPdlJwvfWzVgfq9N822lBjnIYkp5tMq1-pGE1GzKJHhJKsiepIDZVvSow/exec";

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/**
 * Solicita permissão do usuário
 */
export async function solicitarPermissaoNotificacao() {
  if (!("Notification" in window)) {
    registrarLog("PUSH", "Navegador não suporta notificações", "ERRO");
    return false;
  }

  if (Notification.permission === "granted") {
    registrarLog("PUSH", "Permissão já concedida", "INFO");
    return true;
  }

  if (Notification.permission === "denied") {
    registrarLog("PUSH", "Permissão negada pelo usuário", "ERRO");
    return false;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    registrarLog("PUSH", "Permissão concedida", "SUCESSO");
    return true;
  } else {
    registrarLog("PUSH", "Usuário recusou notificações", "ERRO");
    return false;
  }
}

/**
 * Registra o Service Worker corretamente (GitHub Pages = subpasta!)
 */
async function registrarServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register("/derso/firebase-messaging-sw.js");
    registrarLog("PUSH", "Service Worker registrado com sucesso", "SUCESSO");
    return registration;
  } catch (error) {
    registrarLog("PUSH", "Erro ao registrar Service Worker: " + error.message, "ERRO");
    throw error;
  }
}

/**
 * Gera token e envia para o GAS
 */
export async function registrarDispositivo(matricula) {
  try {
    if (!matricula) {
      registrarLog("PUSH", "Matrícula não informada", "ERRO");
      return;
    }

    const permitido = await solicitarPermissaoNotificacao();
    if (!permitido) return;

    // 🧠 registra SW no caminho correto
    const registration = await registrarServiceWorker();

    // 🔑 gera token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      registrarLog("PUSH", "Token não gerado", "ERRO");
      return;
    }

    registrarLog("PUSH", "Token gerado com sucesso", "SUCESSO");

    // 🔄 envia pro GAS
    const resp = await fetch(`${GAS_URL}?action=salvar_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        matricula,
        token
      })
    });

    const result = await resp.json().catch(() => ({}));

    if (result.success) {
      registrarLog("PUSH", "Dispositivo registrado no servidor", "SUCESSO");
    } else {
      registrarLog("PUSH", "Falha ao salvar no servidor", "ERRO");
    }

  } catch (error) {
    registrarLog("PUSH", "Erro ao registrar dispositivo: " + error.message, "ERRO");
  }
}
