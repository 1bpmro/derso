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

/**
 * LIMPEZA DE NOTIFICAÇÕES E BADGES
 */
function limparAlertasVisuais() {
    if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch((err) => {
            console.error('Erro ao limpar Badge:', err);
        });
    }
}

/**
 * PRESSÃO PSICOLÓGICA: Verifica se o app está instalado (PWA Standalone)
 */
function verificarInstalacao() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (!isStandalone) {
        setTimeout(() => {
            UI.modal.show(
                "INSTALAÇÃO RECOMENDADA",
                "As notificações, lembretes e alertas do DERSO são enviados exclusivamente pelo aplicativo oficial. Instale para evitar a perda de prazos e acompanhar seu Score.",
                isIOS ? "⎋" : "📲", 
                "#1a3c6e"
            );
        }, 5000); // 5 segundos após o carregamento
    }
}

async function pedirPermissaoNotificacao() {
    if (!('Notification' in window)) {
        console.log('Este navegador não suporta notificações.');
        return;
    }

    if (Notification.permission === 'granted') {
        registrarDispositivo();
        return;
    }

    if (Notification.permission === 'denied') {
        console.log('❌ Permissão negada.');
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        console.log('🔔 Permissão concedida');
        registrarDispositivo();
    }
}

/**
 * PONTO DE ENTRADA ÚNICO (Bootstrap)
 */
async function bootstrap() {
    // 0. Limpa badges e alertas ao abrir
    limparAlertasVisuais();

    registrarLog("SISTEMA", "Iniciando motor DERSO v7...", "INFO");

    if (!DOM.loading || !DOM.formContent) {
        console.error("Falha Crítica: Elementos essenciais não encontrados.");
        return;
    }

    try {
        // 1. Estado Inicial
        UI.loading.show("Sincronizando com o servidor...");
        applyDarkModeStyles();

        // 2. Busca de Dados Unificada (Inclui Score agora)
        registrarLog("SISTEMA", "Buscando dados institucionais e Score...");
        
        const response = await fetch(`${CONFIG.API_URL}?action=get_initial_data`);
        if (!response.ok) throw new Error("Erro ao conectar com o servidor Google.");
        
        const result = await response.json();

        // 3. População do Estado (STATE)
        STATE.employeeList = result.lista || {}; 
        STATE.userScore = result.score || 0; // Armazena o Score vindo do servidor
        const dData = result.datas;

        registrarLog("SISTEMA", `Dados carregados. Seu Score: ${STATE.userScore}`, "SUCESSO");

        // 4. Ativação de Serviços: Monitora prazos
        if (dData?.abertura && dData?.fechamento) {
            monitorarPrazos(dData.abertura, dData.fechamento);
        }

        // 5. Configuração da Interface
        applyInstitutionalTheme();
        updateFooter();
        setupEvents(); // Ativa os listeners

        // 6. Segurança e Rascunho
        configurarAcessoAdmin();
        restaurarRascunho();

        // 7. Finalização do Loading
        UI.loading.hide();
        registrarLog("SISTEMA", "Operacional.", "SUCESSO");

        // 8. Verificação de PWA (Standalone)
        verificarInstalacao();

        // 9. Gestão de Notificações
        if (Notification.permission === 'default') {
            setTimeout(() => {
                pedirPermissaoNotificacao();
            }, 3000);
        } else if (Notification.permission === 'granted') {
            registrarDispositivo();
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

// Inicia o sistema
document.addEventListener("DOMContentLoaded", bootstrap);
