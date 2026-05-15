// features/history.js
import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";
import { UI } from "../ui/manager.js";
import { apiClient } from "../core/apiClient.js";
import { isArrayValido, sanitizarHTML } from "../core/utils.js";

export async function fetchHistory(mat) {
    const matricula = (mat || "").trim();

    if (!matricula) {
        registrarLog("PESQUISA", "Consulta sem matrícula", "AVISO");
        return UI.modal.show(
            "AVISO",
            "Insira a matrícula para consultar.",
            "📂",
            "#FFD700"
        );
    }

    registrarLog("PESQUISA", `Buscando histórico: ${matricula}`, "INFO");
    UI.loading?.show?.("Buscando registros...");

    try {
        // Corrigido: usa apiClient em vez de fetch manual
        const r = await apiClient.get("historico", { matricula });

        if (r?.error) {
            throw new Error(r.error);
        }

        const lista = isArrayValido(r?.dados) ? r.dados : [];
        const nome = r?.nome || "REGISTROS";

        if (lista.length === 0) {
            registrarLog("PESQUISA", `Sem registros: ${matricula}`, "INFO");
            return UI.modal.show(
                "NADA ENCONTRADO",
                "Não há registros para esta matrícula.",
                "🔎",
                "#777"
            );
        }

        registrarLog("PESQUISA", `${lista.length} registros encontrados`, "SUCESSO");

        const html = buildHistoryHTML(lista);
        UI.modal.show(nome, html, "📋", "#1A3C6E", true);

    } catch (e) {
        console.error("🔥 ERRO HISTÓRICO:", e);
        registrarLog("PESQUISA_FALHA", e.message, "ERRO");

        UI.modal.show(
            "ERRO",
            e.message === "Timeout na requisição"
                ? "Tempo de resposta excedido."
                : "Falha ao buscar histórico.",
            "❌",
            "red"
        );
    } finally {
        UI.loading?.hide?.();
    }
}

/* ======================================
   🧱 BUILDER DE HTML
====================================== */
function buildHistoryHTML(lista) {
    return `
        <div style="max-height: 320px; overflow-y: auto; padding-right: 6px;">
            ${lista.map(i => {
                // Sanitização aplicada nos dados vindos da API
                const data = sanitizarHTML(i?.data || "Sem data");
                const tipo = sanitizarHTML(i?.folga || i?.tipo || "Registro");
                
                return `
                    <div style="
                        display:flex;
                        justify-content:space-between;
                        padding:10px 6px;
                        border-bottom:1px solid #eee;
                        font-size:0.95rem;
                    ">
                        <span>📅 ${data}</span>
                        <b style="color:#1A3C6E">${tipo}</b>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}
