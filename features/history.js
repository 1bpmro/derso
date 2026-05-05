// features/history.js

// ✅ Importações corrigidas: voltando um nível (../)
import { CONFIG } from "../core/config.js";
import { DOM } from "../core/dom.js";
import { registrarLog } from "../services/logger.js";
import { UI } from "../ui/manager.js";

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
        const url = `${CONFIG.API_URL}?action=historico&matricula=${encodeURIComponent(mat)}`;

        console.log("🌐 HISTÓRICO URL:", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const r = await response.json();

        console.log("📦 HISTÓRICO RESPOSTA:", r);

        // 🔥 tratamento de erro vindo da API
        if (r?.error) {
            throw new Error(r.error);
        }

        const lista = Array.isArray(r?.dados) ? r.dados : [];

        if (lista.length > 0) {
            registrarLog("PESQUISA", `${lista.length} registros encontrados`, "SUCESSO");

            if (DOM.historyContent) {
                DOM.historyContent.innerHTML = lista
                    .map(i => {
                        const data = i?.data || "Sem data";
                        const tipo = i?.folga || i?.tipo || "Registro";

                        return `
                            <div class="historico-item" style="padding: 8px; border-bottom: 1px solid #eee;">
                                <span>📅 ${data}</span> - 
                                <b>${tipo}</b>
                            </div>
                        `;
                    })
                    .join("");
            }

            UI.modal.show(
                r?.nome || "REGISTROS",
                `Encontrados ${lista.length} registro(s)`,
                "📋",
                "#1A3C6E",
                true
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
        console.error("🔥 ERRO HISTÓRICO:", e);
        registrarLog("PESQUISA_FALHA", e.message, "ERRO");

        UI.modal.show(
            "ERRO",
            "Falha ao buscar histórico.",
            "❌",
            "red"
        );
    }
}
