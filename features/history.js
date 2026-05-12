// features/history.js

import { CONFIG } from "../core/config.js";
import { DOM } from "../core/dom.js";
import { registrarLog } from "../services/logger.js";
import { UI } from "../ui/manager.js";

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

    registrarLog(
        "PESQUISA",
        `Buscando histórico: ${matricula}`,
        "INFO"
    );

    UI.loading?.show?.("Buscando registros...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {

        const url = `${CONFIG.API_URL}?action=historico&matricula=${encodeURIComponent(matricula)}`;

        const response = await fetch(url, {
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const r = await response.json();

        if (r?.error) {
            throw new Error(r.error);
        }

        const lista = Array.isArray(r?.dados)
            ? r.dados
            : [];

        const nome = r?.nome || "REGISTROS";

        if (lista.length === 0) {

            registrarLog(
                "PESQUISA",
                `Sem registros: ${matricula}`,
                "INFO"
            );

            return UI.modal.show(
                "NADA ENCONTRADO",
                "Não há registros para esta matrícula.",
                "🔎",
                "#777"
            );
        }

        registrarLog(
            "PESQUISA",
            `${lista.length} registros encontrados`,
            "SUCESSO"
        );

        const html = buildHistoryHTML(lista);

        UI.modal.show(
            nome,
            html,
            "📋",
            "#1A3C6E",
            true
        );

    } catch (e) {

        console.error("🔥 ERRO HISTÓRICO:", e);

        registrarLog(
            "PESQUISA_FALHA",
            e.message,
            "ERRO"
        );

        UI.modal.show(
            "ERRO",
            e.name === "AbortError"
                ? "Tempo de resposta excedido."
                : "Falha ao buscar histórico.",
            "❌",
            "red"
        );

    } finally {
        clearTimeout(timeout);
        UI.loading?.hide?.();
    }
}

/* ======================================
   🧱 BUILDER DE HTML (limpa UI do core)
====================================== */
function buildHistoryHTML(lista) {

    return `
        <div style="max-height: 320px; overflow-y: auto; padding-right: 6px;">
            ${lista.map(i => {
                const data = i?.data || "Sem data";
                const tipo = i?.folga || i?.tipo || "Registro";

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
