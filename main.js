// main.js
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

window.__ADMIN_MODE__ = false;

/**
 * PONTO DE ENTRADA ÚNICO (Bootstrap)
 */
async function bootstrap() {
    registrarLog("SISTEMA", "Iniciando motor DERSO v5...", "INFO");

    if (!DOM.loading || !DOM.formContent) {
        console.error("Falha Crítica: Elementos essenciais não encontrados.");
        return;
    }

    try {
        // 1. Estado Inicial
        UI.loading.show("Sincronizando com o servidor...");
        applyDarkModeStyles();

        // 2. Busca de Dados Unificada (Conecta com doGet action=get_initial_data)
        registrarLog("SISTEMA", "Buscando dados institucionais...");
        
        const response = await fetch(`${CONFIG.API_URL}?action=get_initial_data`);
        if (!response.ok) throw new Error("Erro ao conectar com o servidor Google.");
        
        const result = await response.json();

        // 3. População do Estado (STATE) - Limpo e Direto
        // O seu Código.gs retorna 'datas' e 'lista'
        STATE.employeeList = result.lista || {}; 
        const dData = result.datas;

        registrarLog("SISTEMA", "Dados e Efetivo carregados.", "SUCESSO");

        // 4. Ativação de Serviços: Monitora prazos
        if (dData?.abertura && dData?.fechamento) {
            monitorarPrazos(dData.abertura, dData.fechamento);
        }

        // 5. Configuração da Interface
        applyInstitutionalTheme();
        updateFooter();
        setupEvents(); // Ativa os listeners de blur e submit

        // 6. Segurança
        configurarAcessoAdmin();

        // 7. Verificação de Rascunho
        restaurarRascunho();

        // 8. Finalização
        UI.loading.hide();
        registrarLog("SISTEMA", "Sistema pronto para operações.", "SUCESSO");

    } catch (error) {
        registrarLog("FALHA_CRITICA", error.message, "ERRO");
        UI.loading.hide();
        
        UI.modal.show(
            "ERRO DE CONEXÃO",
            "Não foi possível conectar ao banco de dados. Verifique sua internet.",
            "📡",
            "red"
        );
    }
}

// Inicia o sistema
document.addEventListener("DOMContentLoaded", bootstrap);
