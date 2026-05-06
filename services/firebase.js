// services/firebase.js

import { registrarLog } from "./logger.js";
import { CONFIG } from "../core/config.js";

// 🔥 Firebase (ESM via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

/* ====================================== */
/* 🔐 CONFIG FIREBASE */
/* ====================================== */
const firebaseConfig = {
  apiKey: "AIzaSyDqAtLFEwpxN2Yhju8X8I0QeHWR66copLc",
  authDomain: "derso-8294b.firebaseapp.com",
  projectId: "derso-8294b",
  messagingSenderId: "1056159074696",
  appId: "1:1056159074696:web:90962abec6bf703c5d923d"
};

/* ====================================== */
/* 🔑 VAPID KEY */
/* ====================================== */
const VAPID_KEY = "BHGFjPdrcahFdPsIVDsA4RA04ArqgiVslZgoZXjwm49O-au9z4hN2TLNQfhYsWdRQnEkZ4khJCaSb-S09dSolkc";

/* ====================================== */
/* 🔥 INIT FIREBASE */
/* ====================================== */
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/* ====================================== */
/* 🔔 PERMISSÃO */
/* ====================================== */
export async function solicitarPermissaoNotificacao() {
  try {
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

    registrarLog("PUSH", "Permissão: " + permission);

    return permission === "granted";

  } catch (err) {
    registrarLog("PUSH", "Erro ao pedir permissão: " + err.message, "ERRO");
    return false;
  }
}

/* ====================================== */
/* 🧠 SERVICE WORKER (CORRIGIDO) */
/* ====================================== */
async function registrarServiceWorker() {
  try {

    // 🔥 DETECÇÃO CORRETA DE PATH
    const swPath = location.hostname.includes("github.io")
      ? "/derso/sw.js"
      : "/sw.js";

    const registration = await navigator.serviceWorker.register(swPath);

    console.log("📡 SW REGISTRADO EM:", swPath);
    registrarLog("PUSH", "Service Worker registrado", "SUCESSO");

    return registration;

  } catch (error) {
    console.error("🔥 ERRO SW:", error);
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

    console.log("📲 Iniciando registro de dispositivo...");

    /* ================================
       🔔 PERMISSÃO
    ================================ */
    const permitido = await solicitarPermissaoNotificacao();

    if (!permitido) {
      registrarLog("PUSH", "Permissão negada", "ERRO");
      return;
    }

    /* ================================
       🧠 SERVICE WORKER
    ================================ */
    const registration = await registrarServiceWorker();

    /* ================================
       🔑 TOKEN FIREBASE
    ================================ */
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      registrarLog("PUSH", "Token não gerado", "ERRO");
      console.warn("⚠️ Token veio vazio");
      return;
    }

    console.log("🔥 TOKEN FIREBASE:", token);
    registrarLog("PUSH", "Token gerado", "SUCESSO");

    /* ================================
       📡 ENVIO PARA GAS
    ================================ */
    const resp = await fetch(CONFIG.API_URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "salvar_token",
        matricula: matricula,
        token: token
      })
    });

    const text = await resp.text();

    console.log("📡 RESPOSTA GAS:", text);

    let result;

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
        "Erro ao salvar: " + (result.message || "Erro desconhecido"),
        "ERRO"
      );
    }

  } catch (error) {
    console.error("🔥 ERRO PUSH:", error);
    registrarLog("PUSH", error.message, "ERRO");
  }
}
