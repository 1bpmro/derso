// services/logger.js

// ✅ Corrigido: saindo de services (../) para entrar em core
import { STATE } from "../core/state.js";

export function registrarLog(acao, detalhes, tipo = "INFO") {
    const agora = new Date().toLocaleString("pt-BR");
    
    // Armazena no estado global para depuração futura se necessário
    if (STATE && STATE.sessionLogs) {
        STATE.sessionLogs.push({ data: agora, acao, detalhes, tipo });
    }

    const cores = { 
        INFO: "🔵", 
        SUCESSO: "🟢", 
        AVISO: "🟡", 
        ERRO: "🔴",
        SISTEMA: "⚙️" 
    };

    console.log(`${cores[tipo] || "⚪"} [${agora}] ${acao}:`, detalhes);
}
