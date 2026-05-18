// services/logger.js

import { STATE } from "../core/state.js";

const MAX_LOGS = 300;

export function registrarLog(
    acao,
    detalhes,
    tipo = "INFO"
) {
    // 🎨 [HARDENING GPT - MODELO 2]: Normaliza e limpa a string de tipo
    let tipoNormalizado = String(tipo).toUpperCase().trim();
    if (tipoNormalizado === "WARN") tipoNormalizado = "AVISO";

    const agora = new Date();

    const log = {
        data: agora.toLocaleString("pt-BR"),
        acao,
        detalhes,
        tipo: tipoNormalizado // Armazena o tipo já tratado na memória de sessão
    };

    /* ================================
       💾 MEMÓRIA DE SESSÃO
    ================================ */

    if (STATE?.sessionLogs) {

        STATE.sessionLogs.push(log);

        // evita crescimento infinito
        if (STATE.sessionLogs.length > MAX_LOGS) {
            STATE.sessionLogs.shift();
        }
    }

    /* ================================
       🎨 ESTILO VISUAL
    ================================ */

    const cores = {
        INFO: "🔵",
        SUCESSO: "🟢",
        AVISO: "🟡", // ✅ Mapeado tanto para chamadas "AVISO" quanto antigas "WARN"
        ERRO: "🔴",
        SISTEMA: "⚙️"
    };

    const prefixo =
        `${cores[tipoNormalizado] || "⚪"} ` +
        `[${log.data}] ${acao}:`;

    /* ================================
       🧠 CONSOLE ADEQUADO
    ================================ */

    switch (tipoNormalizado) {

        case "ERRO":
            console.error(prefixo, detalhes);
            break;

        case "AVISO":
            console.warn(prefixo, detalhes); // ✅ Ativa o alerta amarelo nativo do DevTools
            break;

        case "SUCESSO":
            console.info(prefixo, detalhes);
            break;

        default:
            console.log(prefixo, detalhes);
    }
}
