// main.js - DERSO v9.1 CORE ENGINE 🧠⚙️ (SAFE UI BUILD)

import { CONFIG } from "./core/config.js";
import { STATE } from "./core/state.js";
import { DOM } from "./core/dom.js";

import { UI } from "./ui/manager.js";
import { registrarLog } from "./services/logger.js";

import { applyInstitutionalTheme, applyDarkModeStyles } from "./services/theme.js";
import { monitorarPrazos } from "./services/prazo.js";
import { updateFooter } from "./services/footer.js";
import { restaurarRascunho } from "./services/storage.js";
import { registrarDispositivo } from "./services/firebase.js";
import { setupEvents } from "./handlers/events.js";
import { configurarAdminPage } from "./features/adminAccess.js";

import { apiClient } from "./core/apiClient.js";

/* ======================================
   🧠 APP CORE STATE
====================================== */
const APP = {
    initialized: false,
    bootstrapTime: null,
    pushLocked: false,
    error: null,
    uiReady: false,
    modalShown: false
};

window.__ADMIN_MODE__ = false;

/* ======================================
   🧯 EMERGENCY UI UNLOCK (ANTI TELA PRETA)
====================================== */
function forceUnlockUI() {
    setTimeout(() => {
        try {
            UI.loading?.hide?.();

            document.querySelectorAll(".modal").forEach(m => {
                m.classList.add("is-hidden");
            });

            document.body.style.overflow = "auto";

            registrarLog("SISTEMA", "UI unlock automático executado", "INFO");
        } catch (e) {
            console.error("UI unlock fail:", e);
        }
    }, 12000); // 12s safety net
}

/* ======================================
   🔐 GUARDS
====================================== */
function hasAdminSession() {
    const token = localStorage.getItem("adminToken");
    return Boolean(token && token.length > 10);
}

function getMatricula() {
    const cached = localStorage.getItem("matricula_usuario");
    if (cached) return cached;

    const input = DOM.matricula?.value?.trim();
    if (input) localStorage.setItem("matricula_usuario", input);

    return input;
}

/* ======================================
   🧹 UI HELPERS
====================================== */
function clearBadge() {
    if (!("clearAppBadge" in navigator)) return;
    navigator.clearAppBadge().catch(() => {});
}

/* ======================================
   📲 INSTALL HINT (SAFE MODE)
====================================== */
function showInstallHint() {

    const standalone = window.matchMedia("(display-mode: standalone)").matches;

    if (standalone) return;
    if (!APP.uiReady) return; // 🔥 evita travar loading

    if (APP.modalShown) return;

    setTimeout(() => {

        try {
            UI.modal.show(
                "INSTALAÇÃO RECOMENDADA",
                "Instale o DERSO para melhorar notificações e evitar perda de prazos.",
                "📲",
                "#1a3c6e"
            );

            APP.modalShown = true;

        } catch (err) {
            console.warn("Modal install falhou:", err);
        }

    }, 5000);
}

/* ======================================
   🌐 API
====================================== */
async function loadInitialData() {
    return await apiClient.get("get_initial_data");
}

/* ======================================
   🧠 STATE
====================================== */
function hydrateState(data = {}) {
    STATE.employeeList = data.lista || {};
    STATE.userScore = data.score || 0;
}

function processBusinessRules(data = {}) {
    registrarLog("SISTEMA", `Score: ${STATE.userScore}`, "INFO");

    const datas = data.datas;

    if (datas?.abertura && datas?.fechamento) {
        monitorarPrazos(datas.abertura, datas.fechamento);
    }
}

/* ======================================
   🧾 FORM RESTORE
====================================== */
function restoreForm() {
    const draft = restaurarRascunho();
    if (!draft || !DOM.form) return;

    for (const [key, value] of Object.entries(draft)) {
        const field = DOM.form.elements[key];
        if (!field) continue;

        if (field.type === "radio") {
            const radio = DOM.form.querySelector(
                `input[name="${key}"][value="${value}"]`
            );
            if (radio) radio.checked = true;
        } else {
            field.value = value;
        }
    }

    registrarLog("RASCUNHO", "Restaurado", "INFO");
}

/* ======================================
   🔔 PUSH
====================================== */
async function registerPushIfPossible() {
    if (APP.pushLocked) return;

    const matricula = getMatricula();
    if (!matricula) return;

    APP.pushLocked = true;

    try {
        await registrarDispositivo(matricula);
    } catch (err) {
        console.error("Push error:", err);
    } finally {
        APP.pushLocked = false;
    }
}

/* ======================================
   🔐 ADMIN
====================================== */
function initAdmin() {
    if (!hasAdminSession()) return;
    configurarAdminPage();
}

/* ======================================
   🎯 FINAL INIT
====================================== */
function finalizeInit() {

    applyInstitutionalTheme();
    applyDarkModeStyles();

    updateFooter();

    setupEvents();
    restoreForm();

    clearBadge();

    UI.loading.hide();

    registrarLog("SISTEMA", "Operacional", "SUCESSO");

    APP.uiReady = true; // 🔥 UI liberada

    initAdmin();
    startPushFlow();

    showInstallHint();

    APP.initialized = true;

    forceUnlockUI(); // 🧯 fallback anti tela preta
}

/* ======================================
   🔔 PUSH START
====================================== */
function startPushFlow() {
    const mat = getMatricula();
    if (!mat) return;

    setTimeout(registerPushIfPossible, 3000);
}

/* ======================================
   ❌ ERROR
====================================== */
function handleFatal(error) {

    APP.error = error;

    registrarLog("FALHA_CRITICA", error.message, "ERRO");
    console.error(error);

    try {
        UI.loading.hide();
    } catch {}

    UI.modal.show(
        "ERRO DE CONEXÃO",
        "Falha ao sincronizar com servidor.",
        "📡",
        "red"
    );

    forceUnlockUI(); // 🔥 garante que não fica preso
}

/* ======================================
   🚀 BOOT
====================================== */
async function bootstrap() {

    APP.bootstrapTime = Date.now();

    clearBadge();

    registrarLog("SISTEMA", "Boot v9.1 iniciado", "INFO");

    if (!DOM.loading || !DOM.formContent) {
        console.error("DOM incompleto");
        return;
    }

    try {
        UI.loading.show("Sincronizando sistema...");

        const data = await loadInitialData();

        hydrateState(data);
        processBusinessRules(data);

        finalizeInit();

    } catch (error) {
        handleFatal(error);
    }
}

/* ======================================
   🚀 START
====================================== */
document.addEventListener("DOMContentLoaded", bootstrap);
