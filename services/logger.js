// services/logger.js

import { STATE } from "../core/state.js";

const MAX_LOGS = 300;

export function registrarLog(
    acao,
    detalhes,
    tipo = "INFO"
) {

    const agora = new Date();

    const log = {
        data: agora.toLocaleString("pt-BR"),
        acao,
        detalhes,
        tipo
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
        AVISO: "🟡",
        ERRO: "🔴",
        SISTEMA: "⚙️"
    };

    const prefixo =
        `${cores[tipo] || "⚪"} ` +
        `[${log.data}] ${acao}:`;

    /* ================================
       🧠 CONSOLE ADEQUADO
    ================================ */

    switch (tipo) {

        case "ERRO":
            console.error(prefixo, detalhes);
            break;

        case "AVISO":
            console.warn(prefixo, detalhes);
            break;

        case "SUCESSO":
            console.info(prefixo, detalhes);
            break;

        default:
            console.log(prefixo, detalhes);
    }
}
