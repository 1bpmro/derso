// services/firebase.js
// 🔐 SECURITY UPDATED: Reading from centralized hybrid CONFIG

import { registrarLog } from "./logger.js";
import { CONFIG } from "../core/config.js";
import { apiClient } from "../core/apiClient.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

/* ====================================== */
/* 🔐 CONFIG FIREBASE (Lendo da Config)   */
/* ====================================== */

const firebaseConfig = CONFIG.FIREBASE; // ✅ Ajustado para ler da nossa central híbrida

const validateFirebaseConfig = (config) => {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'];
    const missing = config ? requiredFields.filter(field => !config[field]) : requiredFields;
    
    if (missing.length > 0) {
        console.error(`🔴 Firebase config missing: ${missing.join(', ')}`);
        registrarLog("FIREBASE", `Config incompleto: ${missing.join(', ')}`, "ERRO");
        return false;
    }
    return true;
};

if (!validateFirebaseConfig(firebaseConfig)) {
    console.error("🔴 Firebase initialization failed: Check your core/config.js file");
}

const VAPID_KEY = CONFIG.VAPID_KEY; // ✅ Ajustado para ler da nossa central híbrida

if (!VAPID_KEY) {
    console.warn("🟡 Firebase VAPID_KEY not configured. Push notifications will not work.");
    registrarLog("FIREBASE", "VAPID_KEY não configurado", "AVISO");
}

function getSwPath() {
    return location.hostname.includes("github.io")
        ? "/derso/sw.js"
        : "/sw.js";
}

let app;
let messaging;

try {
    if (validateFirebaseConfig(firebaseConfig)) {
        app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);
    }
} catch (error) {
    console.error("🔴 Firebase initialization error:", error);
    registrarLog("FIREBASE", `Erro ao inicializar: ${error.message}`, "ERRO");
}

/* ====================================== */
/* 🔔 PERMISSÃO                           */
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

        registrarLog(
            "PUSH",
            `Permissão: ${permission}`,
            permission === "granted" ? "SUCESSO" : "AVISO"
        );

        return permission === "granted";

    } catch (err) {
        registrarLog("PUSH", `Erro ao pedir permissão: ${err.message}`, "ERRO");
        return false;
    }
}

/* ====================================== */
/* 🧠 SERVICE WORKER                      */
/* ====================================== */

async function registrarServiceWorker() {
    try {
        const swPath = getSwPath();

        const registration = await navigator.serviceWorker.register(
            swPath,
            { scope: "./" }
        );

        console.log("📡 SW REGISTRADO EM:", swPath);
        registrarLog("PUSH", "Service Worker registrado", "SUCESSO");

        return registration;

    } catch (error) {
        console.error("🔥 ERRO SW:", error);
        registrarLog("PUSH", `Erro SW: ${error.message}`, "ERRO");
        throw error;
    }
}

/* ====================================== */
/* 📡 REGISTRAR DISPOSITIVO               */
/* ====================================== */

export async function registrarDispositivo(matricula) {
    try {
        if (!matricula) {
            registrarLog("PUSH", "Matrícula não informada", "ERRO");
            return;
        }

        if (!/^\d{4,}$/.test(matricula.trim())) {
            registrarLog("PUSH", "Formato de matrícula inválido", "ERRO");
            return;
        }

        console.log("📲 Iniciando registro de dispositivo...");

        const permitido = await solicitarPermissaoNotificacao();
        if (!permitido) {
            registrarLog("PUSH", "Permissão negada", "ERRO");
            return;
        }

        const swPath = getSwPath();

        let registration = await navigator.serviceWorker.getRegistration(swPath);
        if (!registration) {
            registration = await registrarServiceWorker();
        }

        if (!messaging) {
            registrarLog("PUSH", "Firebase não inicializado", "ERRO");
            return;
        }

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (!token) {
            registrarLog("PUSH", "Token não gerado", "ERRO");
            console.warn("⚠️ Token veio vazio");
            return;
        }

        console.log("🔥 TOKEN FIREBASE: [REDACTED]");
        registrarLog("PUSH", "Token gerado", "SUCESSO");

        const ultimoToken = sessionStorage.getItem("firebase_token");
        const ultimaMatricula = sessionStorage.getItem("firebase_matricula");

        if (ultimoToken === token && ultimaMatricula === matricula) {
            registrarLog("PUSH", "Token já registrado na sessão", "INFO");
            return;
        }

        const result = await apiClient.post("salvar_token", { matricula, token });

        if (result?.success) {
            sessionStorage.setItem("firebase_token", token);
            sessionStorage.setItem("firebase_matricula", matricula);
            registrarLog("PUSH", "Dispositivo registrado no servidor", "SUCESSO");
        } else {
            registrarLog(
                "PUSH",
                `Erro ao salvar: ${result?.message || "Erro desconhecido"}`,
                "ERRO"
            );
        }

    } catch (error) {
        console.error("🔥 ERRO PUSH:", error);
        registrarLog("PUSH", error.message, "ERRO");
    }
}
