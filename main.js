// main.js - DERSO v7 (Com Score e Pressão Institucional)

import { CONFIG } from "./core/config.js";
import { STATE } from "./core/state.js";
import { DOM } from "./core/dom.js";
import { UI } from "./ui/manager.js";
import { registrarLog } from "./services/logger.js";
import { applyInstitutionalTheme, applyDarkModeStyles } from "./services/theme.js";
import { monitorarPrazos } from "./services/prazo.js";
import { setupEvents } from "./handlers/events.js";
import { updateFooter } from "./services/footer.js";
import { restaurarRascunho } from "./services/storage.js";
import { configurarAcessoAdmin } from "./features/adminAccess.js";
import { registrarDispositivo } from "./services/firebase.js";

window.__ADMIN_MODE__ = false;

// 🔥 expõe pra debug no console
window.registrarDispositivo = registrarDispositivo;

/* ====================================== */
/* 🔔 LIMPEZA VISUAL */
/* ====================================== */
function limparAlertasVisuais() {
    if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch((err) => {
            console.error('Erro ao limpar Badge:', err);
        });
    }
}

/* ====================================== */
/* 📲 PWA CHECK */
/* ====================================== */
function verificarInstalacao() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (!isStandalone) {
        setTimeout(() => {
            UI.modal.show(
                "INSTALAÇÃO RECOMENDADA",
                "As notificações, lembretes e alertas do DERSO são enviados exclusivamente pelo aplicativo oficial. Instale para evitar a perda de prazos.",
                isIOS ? "⎋" : "📲",
                "#1a3c6e"
            );
        }, 5000);
    }
}

/* ====================================== */
/* 🔔 PUSH */
/* ====================================== */
async function pedirPermissaoNotificacao() {
    if (!('Notification' in window)) return;

    let matricula = localStorage.getItem("matricula_usuario");

    // 🔥 fallback: tenta capturar do input se não existir
    if (!matricula) {
        const input = document.getElementById("matricula");
        matricula = input?.value?.trim();

        if (matricula) {
            localStorage.setItem("matricula_usuario", matricula);
        }
    }

    if (!matricula) {
        console.warn("⚠️ Matrícula não encontrada. Push ignorado.");
        return;
    }

    if (Notification.permission === 'granted') {
        registrarDispositivo(matricula);
        return;
    }

    if (Notification.permission === 'denied') return;

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
        registrarDispositivo(matricula);
    }
}

/* ====================================== */
/* 🚀 BOOTSTRAP */
/* ====================================== */
async function bootstrap() {
    limparAlertasVisuais();

    registrarLog("SISTEMA", "Iniciando motor DERSO v7...", "INFO");

    if (!DOM.loading || !DOM.formContent) {
        console.error("Falha Crítica: DOM incompleto.");
        return;
    }

    try {
        UI.loading.show("Sincronizando com o servidor...");
        applyDarkModeStyles();

        registrarLog("SISTEMA", "Buscando dados institucionais e Score...");

        const response = await fetch(`${CONFIG.API_URL}?action=get_initial_data`);
        if (!response.ok) throw new Error("Erro ao conectar com o servidor.");

        const result = await response.json();

        STATE.employeeList = result.lista || {};
        STATE.userScore = result.score || 0;

        const dData = result.datas;

        registrarLog("SISTEMA", `Dados carregados. Score: ${STATE.userScore}`, "SUCESSO");

        if (dData?.abertura && dData?.fechamento) {
            monitorarPrazos(dData.abertura, dData.fechamento);
        }

        applyInstitutionalTheme();
        updateFooter();
        setupEvents();

        configurarAcessoAdmin();
        restaurarRascunho();

        UI.loading.hide();
        registrarLog("SISTEMA", "Operacional.", "SUCESSO");

        verificarInstalacao();

        /* ======================================
           🔥 REGISTRO DE PUSH (ROBUSTO)
        ====================================== */
        let matricula = localStorage.getItem("matricula_usuario");

        // fallback extra
        if (!matricula) {
            const input = document.getElementById("matricula");
            matricula = input?.value?.trim();

            if (matricula) {
                localStorage.setItem("matricula_usuario", matricula);
            }
        }

        if (!matricula) {
            console.warn("⚠️ Push não ativado (sem matrícula)");
            return;
        }

        if (Notification.permission === 'default') {
            setTimeout(pedirPermissaoNotificacao, 3000);
        } else if (Notification.permission === 'granted') {
            registrarDispositivo(matricula);
        }

    } catch (error) {
        registrarLog("FALHA_CRITICA", error.message, "ERRO");

        UI.loading.hide();

        UI.modal.show(
            "ERRO DE CONEXÃO",
            "Não foi possível conectar ao banco de dados.",
            "📡",
            "red"
        );
    }
}

document.addEventListener("DOMContentLoaded", bootstrap);
