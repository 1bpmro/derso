// main.js - DERSO v8 (refatorado)

import { CONFIG } from "./core/config.js";
import { STATE } from "./core/state.js";
import { DOM } from "./core/dom.js";

import { UI } from "./ui/manager.js";
import { registrarLog } from "./services/logger.js";

import {
    applyInstitutionalTheme,
    applyDarkModeStyles
} from "./services/theme.js";

import { monitorarPrazos } from "./services/prazo.js";
import { updateFooter } from "./services/footer.js";
import { restaurarRascunho } from "./services/storage.js";
import { registrarDispositivo } from "./services/firebase.js";
import { setupEvents } from "./handlers/events.js";
import { configurarAcessoAdmin } from "./features/adminAccess.js";

/* ======================================
   🌐 GLOBAL STATE FLAG
====================================== */
window.__ADMIN_MODE__ = false;

/* ======================================
   🧪 DEBUG LOCAL
====================================== */
if (isLocalhost()) {
    window.registrarDispositivo = registrarDispositivo;
}

function isLocalhost() {
    return (
        location.hostname === "localhost" ||
        location.hostname.includes("127.0.0.1")
    );
}

/* ======================================
   🔔 PUSH CONTROL
====================================== */
let pushRegistrando = false;

/* ======================================
   🧹 BADGE CLEANUP
====================================== */
function limparAlertasVisuais() {
    if (!("clearAppBadge" in navigator)) return;

    navigator.clearAppBadge().catch((err) => {
        console.error("Erro ao limpar badge:", err);
    });
}

/* ======================================
   📲 PWA INSTALL CHECK
====================================== */
function verificarInstalacao() {
    const isStandalone = window.matchMedia(
        "(display-mode: standalone)"
    ).matches;

    const isIOS =
        /iPhone|iPad|iPod/.test(navigator.userAgent) &&
        !window.MSStream;

    if (isStandalone) return;

    setTimeout(() => {
        UI.modal.show(
            "INSTALAÇÃO RECOMENDADA",
            "Instale o DERSO para receber alertas e evitar perda de prazos.",
            isIOS ? "⎋" : "📲",
            "#1a3c6e"
        );
    }, 5000);
}

/* ======================================
   🔔 PUSH REGISTRATION
====================================== */
async function pedirPermissaoNotificacao() {
    if (pushRegistrando) return;

    const matricula = obterMatricula();

    if (!matricula) {
        console.warn("⚠️ Matrícula não encontrada.");
        return;
    }

    pushRegistrando = true;

    try {
        await registrarDispositivo(matricula);
    } catch (err) {
        console.error("Erro push:", err);
    } finally {
        pushRegistrando = false;
    }
}

/* ======================================
   🔍 MATRICULA RESOLVER
====================================== */
function obterMatricula() {
    let mat = localStorage.getItem("matricula_usuario");

    if (!mat) {
        mat = DOM.matricula?.value?.trim();

        if (mat) {
            localStorage.setItem("matricula_usuario", mat);
        }
    }

    return mat;
}

/* ======================================
   🧾 RESTORE FORM
====================================== */
function restaurarCamposFormulario() {
    const draft = restaurarRascunho();
    if (!draft || !DOM.form) return;

    Object.entries(draft).forEach(([key, value]) => {
        const campo = DOM.form.elements[key];
        if (!campo) return;

        if (campo.type === "radio") {
            const radio = DOM.form.querySelector(
                `input[name="${key}"][value="${value}"]`
            );
            if (radio) radio.checked = true;
            return;
        }

        campo.value = value;
    });

    registrarLog("RASCUNHO", "Restaurado", "INFO");
}

/* ======================================
   🚀 BOOTSTRAP CORE
====================================== */
async function bootstrap() {
    limparAlertasVisuais();

    registrarLog("SISTEMA", "Boot v8 iniciado", "INFO");

    if (!DOM.loading || !DOM.formContent) {
        console.error("DOM incompleto");
        return;
    }

    try {
        UI.loading.show("Sincronizando...");

        applyDarkModeStyles();

        const result = await fetchInitialData();

        applyState(result);

        processarDadosIniciais(result);

        finalizarInicializacao(result);

    } catch (error) {
        tratarErroFatal(error);
    }
}

/* ======================================
   🌐 FETCH INITIAL DATA
====================================== */
async function fetchInitialData() {
    const res = await fetch(
        `${CONFIG.API_URL}?action=get_initial_data`
    );

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    try {
        return await res.json();
    } catch {
        throw new Error("JSON inválido do servidor");
    }
}

/* ======================================
   🧠 STATE APPLY
====================================== */
function applyState(result) {
    STATE.employeeList = result.lista || {};
    STATE.userScore = result.score || 0;
}

/* ======================================
   ⚙️ PROCESS DATA
====================================== */
function processarDadosIniciais(result) {
    registrarLog(
        "SISTEMA",
        `Score: ${STATE.userScore}`,
        "SUCESSO"
    );

    if (result.datas?.abertura && result.datas?.fechamento) {
        monitorarPrazos(
            result.datas.abertura,
            result.datas.fechamento
        );
    }
}

/* ======================================
   🎯 FINAL UI INIT
====================================== */
function finalizarInicializacao(result) {
    applyInstitutionalTheme();
    updateFooter();
    setupEvents();
    configurarAcessoAdmin();
    restaurarCamposFormulario();

    UI.loading.hide();

    registrarLog("SISTEMA", "Operacional", "SUCESSO");

    verificarInstalacao();

    iniciarPush();
}

/* ======================================
   🔔 PUSH FLOW
====================================== */
function iniciarPush() {
    const mat = obterMatricula();

    if (!mat) {
        console.warn("Push desativado (sem matrícula)");
        return;
    }

    setTimeout(() => {
        pedirPermissaoNotificacao();
    }, 3000);
}

/* ======================================
   ❌ ERROR HANDLER
====================================== */
function tratarErroFatal(error) {
    registrarLog("FALHA_CRITICA", error.message, "ERRO");
    console.error(error);

    UI.loading.hide();

    UI.modal.show(
        "ERRO DE CONEXÃO",
        "Falha ao sincronizar com servidor.",
        "📡",
        "red"
    );
}

/* ======================================
   🚀 START
====================================== */
document.addEventListener("DOMContentLoaded", bootstrap);
