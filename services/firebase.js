// services/firebase.js

import { registrarLog } from "./logger.js";
import { CONFIG } from "../core/config.js";
import { apiClient } from "../core/apiClient.js";

// 🔥 Firebase (ESM via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

/* ====================================== */
/* 🔐 CONFIG FIREBASE                     */
/* ====================================== */

const firebaseConfig = {
    apiKey: "AIzaSyDqAtLFEwpxN2Yhju8X8I0QeHWR66copLc",
    authDomain: "derso-8294b.firebaseapp.com",
    projectId: "derso-8294b",
    messagingSenderId: "1056159074696",
    appId: "1:1056159074696:web:90962abec6bf703c5d923d"
};

const VAPID_KEY = "BHGFjPdrcahFdPsIVDsA4RA04ArqgiVslZgoZXjwm49O-au9z4hN2TLNQfhYsWdRQnEkZ4khJCaSb-S09dSolkc";

/* ====================================== */
/* 🛠️ UTILITÁRIO: caminho do SW           */
/* ====================================== */

// Corrigido: calculado uma vez, usado em dois lugares
function getSwPath() {
    return location.hostname.includes("github.io")
        ? "/derso/sw.js"
        : "/sw.js";
}

/* ====================================== */
/* 🔥 INIT FIREBASE                       */
/* ====================================== */

const app = initializeApp(firebaseConfig);
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

        // Corrigido: nível de log explícito
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
        const swPath = getSwPath(); // Corrigido: usa utilitário

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

        const swPath = getSwPath(); // Corrigido: usa utilitário

        let registration = await navigator.serviceWorker.getRegistration(swPath);
        if (!registration) {
            registration = await registrarServiceWorker();
        }

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
           Corrigido: usa apiClient em vez de fetch manual
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
