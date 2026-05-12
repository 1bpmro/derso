// main.js - DERSO v8 (Arquitetura Revisada e Blindada)

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

import {
    restaurarRascunho
} from "./services/storage.js";

import { registrarDispositivo } from "./services/firebase.js";

import { setupEvents } from "./handlers/events.js";

import {
    configurarAcessoAdmin
} from "./features/adminAccess.js";

/* ======================================
   🌐 MODO GLOBAL
====================================== */

window.__ADMIN_MODE__ = false;

/* ======================================
   🧪 DEBUG APENAS LOCALHOST
====================================== */

if (
    location.hostname === "localhost" ||
    location.hostname.includes("127.0.0.1")
) {
    window.registrarDispositivo =
        registrarDispositivo;
}

/* ======================================
   🔒 CONTROLE DE PUSH
====================================== */

let pushRegistrando = false;

/* ======================================
   🔔 LIMPEZA VISUAL
====================================== */

function limparAlertasVisuais() {

    if (!("clearAppBadge" in navigator)) return;

    navigator.clearAppBadge()
        .catch((err) => {

            console.error(
                "Erro ao limpar Badge:",
                err
            );
        });
}

/* ======================================
   📲 PWA CHECK
====================================== */

function verificarInstalacao() {

    const isStandalone =
        window.matchMedia(
            "(display-mode: standalone)"
        ).matches;

    const isIOS =
        /iPhone|iPad|iPod/.test(
            navigator.userAgent
        ) &&
        !window.MSStream;

    if (isStandalone) return;

    setTimeout(() => {

        UI.modal.show(
            "INSTALAÇÃO RECOMENDADA",

            "As notificações, lembretes e alertas do DERSO são enviados exclusivamente pelo aplicativo oficial. Instale para evitar a perda de prazos.",

            isIOS ? "⎋" : "📲",

            "#1a3c6e"
        );

    }, 5000);
}

/* ======================================
   🔔 PUSH
====================================== */

async function pedirPermissaoNotificacao() {

    if (pushRegistrando) return;

    let matricula =
        localStorage.getItem(
            "matricula_usuario"
        );

    /* ================================
       FALLBACK INPUT
    ================================ */

    if (!matricula) {

        matricula =
            DOM.matricula?.value?.trim();

        if (matricula) {

            localStorage.setItem(
                "matricula_usuario",
                matricula
            );
        }
    }

    /* ================================
       SEM MATRÍCULA
    ================================ */

    if (!matricula) {

        console.warn(
            "⚠️ Matrícula não encontrada."
        );

        return;
    }

    /* ================================
       REGISTRO PROTEGIDO
    ================================ */

    pushRegistrando = true;

    try {

        await registrarDispositivo(
            matricula
        );

    } catch (err) {

        console.error(
            "Erro ao registrar push:",
            err
        );

    } finally {

        pushRegistrando = false;
    }
}

/* ======================================
   ♻️ RESTAURA DRAFT
====================================== */

function restaurarCamposFormulario() {

    const draft = restaurarRascunho();

    if (!draft || !DOM.form) return;

    Object.entries(draft)
        .forEach(([key, value]) => {

            const campo =
                DOM.form.elements[key];

            if (!campo) return;

            /* ========================
               RADIO
            ======================== */

            if (campo.type === "radio") {

                const radio =
                    DOM.form.querySelector(
                        `input[name="${key}"][value="${value}"]`
                    );

                if (radio) {
                    radio.checked = true;
                }

                return;
            }

            /* ========================
               INPUT NORMAL
            ======================== */

            campo.value = value;
        });

    registrarLog(
        "RASCUNHO",
        "Rascunho restaurado",
        "INFO"
    );
}

/* ======================================
   🚀 BOOTSTRAP
====================================== */

async function bootstrap() {

    limparAlertasVisuais();

    registrarLog(
        "SISTEMA",
        "Iniciando motor DERSO v8...",
        "INFO"
    );

    /* ================================
       VALIDAÇÃO DOM
    ================================ */

    if (
        !DOM.loading ||
        !DOM.formContent
    ) {

        console.error(
            "Falha Crítica: DOM incompleto."
        );

        return;
    }

    try {

        UI.loading.show(
            "Sincronizando com o servidor..."
        );

        applyDarkModeStyles();

        registrarLog(
            "SISTEMA",
            "Buscando dados institucionais e score..."
        );

        /* ================================
           FETCH
        ================================ */

        const response = await fetch(
            `${CONFIG.API_URL}?action=get_initial_data`
        );

        if (!response.ok) {

            throw new Error(
                `Erro HTTP ${response.status}`
            );
        }

        /* ================================
           JSON SAFE
        ================================ */

        let result;

        try {

            result = await response.json();

        } catch {

            throw new Error(
                "Resposta inválida do servidor"
            );
        }

        /* ================================
           ESTADO GLOBAL
        ================================ */

        STATE.employeeList =
            result.lista || {};

        STATE.userScore =
            result.score || 0;

        registrarLog(
            "SISTEMA",
            `Dados carregados. Score: ${STATE.userScore}`,
            "SUCESSO"
        );

        /* ================================
           PRAZOS
        ================================ */

        const datas = result.datas;

        if (
            datas?.abertura &&
            datas?.fechamento
        ) {

            monitorarPrazos(
                datas.abertura,
                datas.fechamento
            );
        }

        /* ================================
           UI
        ================================ */

        applyInstitutionalTheme();

        updateFooter();

        setupEvents();

        configurarAcessoAdmin();

        restaurarCamposFormulario();

        UI.loading.hide();

        registrarLog(
            "SISTEMA",
            "Operacional.",
            "SUCESSO"
        );

        verificarInstalacao();

        /* ================================
           PUSH
        ================================ */

        const matricula =
            localStorage.getItem(
                "matricula_usuario"
            ) ||
            DOM.matricula?.value?.trim();

        if (!matricula) {

            console.warn(
                "⚠️ Push não ativado (sem matrícula)"
            );

            return;
        }

        setTimeout(() => {

            pedirPermissaoNotificacao();

        }, 3000);

    } catch (error) {

        registrarLog(
            "FALHA_CRITICA",
            error.message,
            "ERRO"
        );

        console.error(error);

        UI.loading.hide();

        UI.modal.show(
            "ERRO DE CONEXÃO",

            "Não foi possível conectar ao banco de dados.",

            "📡",

            "red"
        );
    }
}

/* ======================================
   🚀 START
====================================== */

document.addEventListener(
    "DOMContentLoaded",
    bootstrap
);
