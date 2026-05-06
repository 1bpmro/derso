// services/firebase.js

import { registrarLog } from "./logger.js";
import { CONFIG } from "../core/config.js";

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

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/* ====================================== */
/* 🔔 PERMISSÃO */
/* ====================================== */
export async function solicitarPermissaoNotificacao() {
  if (!("Notification" in window)) {
    registrarLog("PUSH", "Navegador não suporta notificações", "ERRO");
    return false;
  }

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") {
    registrarLog("PUSH", "Permissão já negada", "ERRO");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/* ====================================== */
/* 🧠 SERVICE WORKER */
/* ====================================== */
async function registrarServiceWorker() {
  try {
    // 🔥 Corrige GitHub Pages + fallback automático
    let swPath = "/sw.js";

if (location.hostname.includes("github.io")) {
  swPath = "/derso/sw.js";
}

    if (location.hostname.includes("github.io")) {
      swPath = "/derso/firebase-messaging-sw.js";
    }

    const registration = await navigator.serviceWorker.register(swPath);

    registrarLog("PUSH", "Service Worker registrado", "SUCESSO");
    console.log("📡 SW PATH:", swPath);

    return registration;
  } catch (error) {
    registrarLog("PUSH", "Erro SW: " + error.message, "ERRO");
    throw error;
  }
}

/* ====================================== */
/* 📡 REGISTRAR DISPOSITIVO */
/* ====================================== */
export async function registrarDispositivo(matricula) {
  try {
    if (!matricula) {
      registrarLog("PUSH", "Matrícula não informada", "ERRO");
      return;
    }

    const permitido = await solicitarPermissaoNotificacao();
    if (!permitido) {
      registrarLog("PUSH", "Permissão negada", "ERRO");
      return;
    }

    const registration = await registrarServiceWorker();

    // 🔑 TOKEN FIREBASE
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      registrarLog("PUSH", "Token vazio", "ERRO");
      return;
    }

    registrarLog("PUSH", "Token gerado", "SUCESSO");
    console.log("🔥 TOKEN FIREBASE:", token);

    /* ======================================
       📡 ENVIO PARA GAS (VERSÃO ROBUSTA)
    ====================================== */
    const resp = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "salvar_token",
        matricula: matricula,
        token: token
      })
    });

    const text = await resp.text();

    console.log("📡 RESPOSTA BRUTA GAS:", text);

    let result = {};
    try {
      result = JSON.parse(text);
    } catch (e) {
      registrarLog("PUSH", "Resposta inválida do servidor", "ERRO");
      return;
    }

    if (result.success) {
      registrarLog("PUSH", "Dispositivo registrado no servidor", "SUCESSO");
    } else {
      registrarLog(
        "PUSH",
        "Falha ao salvar: " + (result.message || "Erro desconhecido"),
        "ERRO"
      );
    }

  } catch (error) {
    console.error("🔥 ERRO PUSH:", error);
    registrarLog("PUSH", error.message, "ERRO");
  }
}
