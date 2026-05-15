// main.js - DERSO v9.2 CORE ENGINE 🧠⚙️ (HYBRID SAFE BUILD)

import { CONFIG } from "./core/config.js";
import { STATE } from "./core/state.js";
import { DOM } from "./core/dom.js";

import { UI } from "./ui/manager.js";
import { registrarLog } from "./services/logger.js";

import { applyInstitutionalTheme } from "./services/theme.js";

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

/* ======================================
   🧯 EMERGENCY UI UNLOCK
====================================== */
function forceUnlockUI() {

    setTimeout(() => {

        // se já carregou, ignora
        if (APP.uiReady) return;

        try {

            UI.loading?.hide?.();

            if (DOM.formContent) {
                DOM.formContent.classList.remove("is-hidden");
            }

            document.body.style.overflow = "auto";

            document.querySelectorAll(".modal").forEach(modal => {
                modal.classList.add("is-hidden");
            });

            registrarLog(
                "SISTEMA",
                "UI unlock emergencial executado",
                "WARN"
            );

        } catch (e) {

            console.error("UI unlock fail:", e);

        }

    }, 8000);

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

    if (input) {
        localStorage.setItem("matricula_usuario", input);
    }

    return input;

}

/* ======================================
   🧹 HELPERS
====================================== */
function clearBadge() {

    if (!("clearAppBadge" in navigator)) return;

    navigator.clearAppBadge().catch(() => {});

}

/* ======================================
   📲 INSTALL HINT
====================================== */
function showInstallHint() {

    // já instalado
    if (
        window.matchMedia("(display-mode: standalone)").matches
    ) return;

    // evita duplicidade
    if (APP.modalShown) return;

    // UI ainda não pronta
    if (!APP.uiReady) return;

    // modal indisponível
    if (!UI?.modal?.show) return;

    try {

        registrarLog(
            "SISTEMA",
            "Exibindo hint de instalação",
            "INFO"
        );

        UI.modal.show(
            "DERSO NO CELULAR 📲",
            "Instale o DERSO para receber notificações e evitar perda de prazos.",
            "📲",
            "#1a3c6e"
        );

        APP.modalShown = true;

    } catch (e) {

        console.error("Install hint fail:", e);

    }

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

    try {

        // limpa sem quebrar referência
        Object.keys(STATE.employeeList).forEach(key => {
            delete STATE.employeeList[key];
        });

        const fonte = data.lista || {};

        // formato objeto
        if (
            fonte &&
            typeof fonte === "object" &&
            !Array.isArray(fonte)
        ) {

            Object.entries(fonte).forEach(([matricula, dados]) => {

                STATE.employeeList[matricula] = {
                    matricula: matricula,
                    nome: dados.nome || "",
                    niver: dados.niver || ""
                };

            });

            registrarLog(
                "SISTEMA",
                `Lista hidratada: ${Object.keys(STATE.employeeList).length} militares`,
                "INFO"
            );

        }

        // fallback array
        else if (Array.isArray(fonte)) {

            fonte.forEach(militar => {

                const mat =
                    militar.matricula ||
                    militar.MATRICULA;

                if (!mat) return;

                STATE.employeeList[mat] = militar;

            });

            registrarLog(
                "SISTEMA",
                `Lista hidratada via array: ${fonte.length}`,
                "INFO"
            );

        }

        STATE.userScore = data.score || 0;

    } catch (e) {

        registrarLog(
            "SISTEMA",
            "Falha ao hidratar estado",
            "ERRO"
        );

        console.error(e);

    }

}

/* ======================================
   📋 BUSINESS RULES
====================================== */
function processBusinessRules(data = {}) {

    registrarLog(
        "SISTEMA",
        `Score: ${STATE.userScore}`,
        "INFO"
    );

    const datas = data.datas;

    if (
        datas?.abertura &&
        datas?.fechamento
    ) {

        monitorarPrazos(
            datas.abertura,
            datas.fechamento
        );

    }

}

/* ======================================
   🧾 RESTORE FORM
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

            if (radio) {
                radio.checked = true;
            }

        } else {

            field.value = value;

        }

    }

    registrarLog(
        "RASCUNHO",
        "Restaurado",
        "INFO"
    );

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

        console.error("Push registration fail:", err);

    } finally {

        APP.pushLocked = false;

    }

}

function startPushFlow() {

    const mat = getMatricula();

    if (!mat) return;

    setTimeout(registerPushIfPossible, 2500);

}

/* ======================================
   🔐 ADMIN
====================================== */
function initAdmin() {

    if (!hasAdminSession()) return;

    try {

        configurarAdminPage();

    } catch (e) {

        console.error("Admin init fail:", e);

    }

}

/* ======================================
   🎯 FINAL INIT
====================================== */
function finalizeInit() {

    // 🔓 libera UI IMEDIATAMENTE
    UI.loading?.hide?.();

    if (DOM.formContent) {
        DOM.formContent.classList.remove("is-hidden");
    }

    document.body.style.overflow = "auto";

    APP.uiReady = true;

    // 🎨 tema
    applyInstitutionalTheme();
    applyDarkModeStyles();

    // 📎 footer
    updateFooter();

    // 🎛️ handlers
    setupEvents();

    // 🧾 draft
    restoreForm();

    // 🧹 badge
    clearBadge();

    registrarLog(
        "SISTEMA",
        "Interface operacional",
        "SUCESSO"
    );

    // 🔐 admin
    initAdmin();

    // 🔔 push
    startPushFlow();

    // 📲 instalação
    setTimeout(showInstallHint, 4000);

    APP.initialized = true;

}

/* ======================================
   ❌ FATAL
====================================== */
function handleFatal(error) {

    APP.error = error;

    registrarLog(
        "FALHA_CRITICA",
        error?.message || "Erro desconhecido",
        "ERRO"
    );

    console.error(error);

    try {

        UI.loading?.hide?.();

    } catch {}

    if (DOM.formContent) {
        DOM.formContent.classList.remove("is-hidden");
    }

    // evita crash duplo
    if (UI?.modal?.show) {

        UI.modal.show(
            "AVISO DE SISTEMA",
            "O sistema apresentou instabilidade na conexão.",
            "📡",
            "#f39c12"
        );

    }

}

/* ======================================
   🚀 BOOT
====================================== */
async function bootstrap() {

    APP.bootstrapTime = Date.now();

    clearBadge();

    registrarLog(
        "SISTEMA",
        "Boot v9.2 iniciado",
        "INFO"
    );

    // 🧯 fallback anti tela preta
    forceUnlockUI();

    try {

        // ⚠️ DOM parcial não mata app
        if (!DOM?.formContent) {
            throw new Error("formContent não encontrado");
        }

        // 🔵 loading
        UI.loading?.show?.(
            "Sincronizando sistema..."
        );

        // 🧠 força render do loading
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);

        // 🌐 API
        let data = {};

        try {

            data = await loadInitialData();

        } catch (apiError) {

            registrarLog(
                "SISTEMA",
                "Modo offline/fallback ativado",
                "WARN"
            );

            console.warn(
                "API FAIL:",
                apiError
            );

        }

        // 🧠 hidratação
        hydrateState(data);

        // 📋 regras
        processBusinessRules(data);

        // 🎯 finalização
        finalizeInit();

    } catch (error) {

        console.error(
            "BOOT ERROR:",
            error
        );

        handleFatal(error);

    }

}

/* ======================================
   🚀 START
====================================== */
document.addEventListener(
    "DOMContentLoaded",
    bootstrap
);

/* ======================================
   🧪 DEBUG
====================================== */
if (CONFIG.DEBUG) {
    window.STATE = STATE;
    window.apiClient = apiClient;
    window.DERSO_STATE = STATE;
}
