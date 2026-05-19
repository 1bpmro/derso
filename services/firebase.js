// services/firebase.js (Refatorado - Lendo dados da Central de Config)

import { registrarLog } from "./logger.js";
import { CONFIG } from "../core/config.js";
import { apiClient } from "../core/apiClient.js";

// 🔥 Firebase (ESM via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

/* ====================================== */
/* 🛠️ UTILITÁRIO: caminho do SW           */
/* ====================================== */

function getSwPath() {
    return location.hostname.includes("github.io")
        ? "/derso/sw.js"
        : "/sw.js";
}

/* ====================================== */
/* 🔥 INIT FIREBASE (Lendo da Config)     */
/* ====================================== */

const app = initializeApp(CONFIG.FIREBASE); // ✅ Protegido via centralização
const messaging = getMessaging(app);

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

        const swPath = getSwPath();

        let registration = await navigator.serviceWorker.getRegistration(swPath);
        if (!registration) {
            registration = await registrarServiceWorker();
        }

        /* ================================
            🔑 TOKEN FIREBASE
        ================================ */

        const token = await getToken(messaging, {
            vapidKey: CONFIG.VAPID_KEY, // ✅ Protegido via centralização
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
            🚫 EVITA REENVIO DESNECESSÁRIO
        ================================ */

        const ultimoToken = localStorage.getItem("firebase_token");
        const ultimaMatricula = localStorage.getItem("firebase_matricula");

        if (ultimoToken === token && ultimaMatricula === matricula) {
            registrarLog("PUSH", "Token já registrado anteriormente", "INFO");
            return;
        }

        /* ================================
            📡 ENVIO PARA GAS
        ================================ */

        const result = await apiClient.post("salvar_token", { matricula, token });

        if (result?.success) {
            localStorage.setItem("firebase_token", token);
            localStorage.setItem("firebase_matricula", matricula);
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
