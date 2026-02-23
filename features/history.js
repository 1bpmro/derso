// features/history.js

// ✅ Importações corrigidas: voltando um nível (../)
import { CONFIG } from "../core/config.js";
import { DOM } from "../core/dom.js";
import { registrarLog } from "../services/logger.js";
import { UI } from "../ui/manager.js"; // Usando o gerenciador de interface padrão

export async function fetchHistory(mat) {

    if (!mat) {
        registrarLog("PESQUISA", "Tentativa de consulta sem matrícula", "AVISO");

        return UI.modal.show(
            "AVISO",
            "Insira a matrícula para consultar.",
            "📂",
            "#FFD700"
        );
    }

    registrarLog("PESQUISA", `Buscando histórico para: ${mat}`, "INFO");

    UI.modal.show(
        "CONSULTANDO",
        "Buscando seus registros...",
        "⏳",
        "#1A3C6E"
    );

    try {
        const response = await fetch(
            `${CONFIG.API_URL}?action=historico&matricula=${encodeURIComponent(mat)}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const r = await response.json();

        // Verifica se existem dados no retorno da sua API
        if (r?.dados?.length > 0) {
            registrarLog("PESQUISA", `${r.dados.length} registros encontrados`, "SUCESSO");

            if (DOM.historyContent) {
                DOM.historyContent.innerHTML = r.dados
                    .map(i => `
                        <div class="historico-item" style="padding: 8px; border-bottom: 1px solid #eee;">
                            <span>📅 ${i.data}</span> - 
                            <b>${i.folga || i.tipo || "Registro"}</b>
                        </div>
                    `)
                    .join("");
            }

            UI.modal.show(
                r.nome || "REGISTROS",
                "Solicitações encontradas:",
                "📋",
                "#1A3C6E",
                true // Parâmetro para indicar que deve exibir o conteúdo do historyContent
            );

        } else {
            registrarLog("PESQUISA", `Nenhum registro para ${mat}`, "INFO");

            UI.modal.show(
                "NADA ENCONTRADO",
                "Não há registros para esta matrícula.",
                "🔎",
                "#777"
            );
        }

    } catch (e) {
        registrarLog("PESQUISA_FALHA", e.message, "ERRO");

        UI.modal.show(
            "ERRO",
            "Falha na comunicação com o servidor.",
            "❌",
            "red"
        );
    }
}
