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
   📲 INSTALL HINT (Otimizado)
====================================== */
function showInstallHint() {
    // Se já estiver em modo standalone ou já mostrou o modal, aborta.
    if (window.matchMedia("(display-mode: standalone)").matches || APP.modalShown) return;

    // Aguarda o sistema estabilizar (3 segundos)
    setTimeout(() => {
        // SEGURANÇA: Se o loading ainda estiver visível, não tenta mostrar o modal agora
        const loadingAtivo = !DOM.loading.classList.contains("is-hidden");
        if (loadingAtivo) {
            registrarLog("SISTEMA", "Install Hint adiado: Loading ainda ativo", "WARN");
            return;
        }

        try {
            registrarLog("SISTEMA", "Chamando modal de instalação...", "INFO");
            UI.modal.show(
                "DERSO NO CELULAR 📲",
                "Instale o app para receber alertas de escala e não perder os prazos de folga.",
                "📲",
                "#1a3c6e"
            );
            APP.modalShown = true;
        } catch (e) {
            console.error("Falha ao exibir hint:", e);
        }
    }, 3000); 
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
    // 1. Limpa o estado atual sem quebrar o Object.seal
    for (let prop in STATE.employeeList) {
        delete STATE.employeeList[prop];
    }

    const fonte = data.lista || {};

    // 2. Se a fonte for um OBJETO (formato atual do seu GAS)
    if (fonte && typeof fonte === "object" && !Array.isArray(fonte)) {
        
        Object.entries(fonte).forEach(([matricula, dados]) => {
            // Injetamos a matrícula dentro do objeto para o events.js encontrar fácil
            STATE.employeeList[matricula] = {
                matricula: matricula,
                nome: dados.nome || "",
                niver: dados.niver || ""
            };
        });

        const total = Object.keys(STATE.employeeList).length;
        registrarLog("SISTEMA", `Lista hidratada: ${total} militares (Dicionário)`, "INFO");
    } 
    
    // 3. Se a fonte for um ARRAY (fallback de segurança)
    else if (Array.isArray(fonte)) {
        fonte.forEach(militar => {
            const m = militar.matricula || militar.MATRICULA;
            if (m) {
                STATE.employeeList[m] = militar;
            }
        });
        registrarLog("SISTEMA", `Lista hidratada: ${fonte.length} militares (Array)`, "INFO");
    }

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

    setTimeout(showInstallHint, 2000); // Aguarda 2s após o sistema ficar operacional

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
    registrarLog("SISTEMA", "Boot v9 iniciado", "INFO");

    // 🧯 fallback global anti-tela preta
    const safetyUnlock = setTimeout(() => {
        console.warn("⚠️ SAFETY UNLOCK acionado");

        UI.loading?.hide?.();

        if (DOM.formContent) {
            DOM.formContent.classList.remove("is-hidden");
        }

        document.body.style.overflow = "auto";
    }, 10000);

    try {

        // ⚠️ DOM parcial não pode matar app inteiro
        if (!DOM?.formContent) {
            throw new Error("formContent não encontrado");
        }

        // 🔵 mostra loading (mas não bloqueia render)
        UI.loading?.show?.("Sincronizando sistema...");

        // 🧠 força browser renderizar UI antes do fetch
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);

        let data;

        try {
            data = await loadInitialData();
        } catch (apiError) {
            console.warn("API falhou, continuando offline fallback:", apiError);
            data = {}; // fallback seguro
        }

        hydrateState(data);
        processBusinessRules(data);

        finalizeInit();

    } catch (error) {

        console.error("BOOT ERROR:", error);

        UI.loading?.hide?.();

        if (DOM?.formContent) {
            DOM.formContent.classList.remove("is-hidden");
        }

        handleFatal(error);

    } finally {
        clearTimeout(safetyUnlock);
    }
}
/* ======================================
   🚀 START
====================================== */
document.addEventListener("DOMContentLoaded", bootstrap);


// EXPOSIÇÃO TEMPORÁRIA PARA DEBUG
window.STATE = STATE;
window.apiClient = apiClient;
