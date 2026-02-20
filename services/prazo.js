// services/prazo.js

// ✅ Importações com caminhos corrigidos para o ambiente de subpastas
import { DOM } from "../core/dom.js"; 
import { STATE } from "../core/state.js";
import { CONFIG } from "../core/config.js";
import { UI } from "../ui/manager.js";
import { registrarLog } from "./logger.js"; // Mantém ./ pois estão na mesma pasta (services)

let intervaloPrazo = null;

export function monitorarPrazos(dataAbertura, dataFechamento) {
    // Verificação de segurança: se o DOM ainda não mapeou os elementos, evita o crash
    if (!DOM.timerDisplay || !DOM.prazoBox) {
        console.warn("[PRAZO] Elementos visuais não encontrados no DOM.");
        return;
    }

    const abertura = new Date(dataAbertura).getTime();
    const fechamento = new Date(dataFechamento).getTime();
    const hoje = new Date();

    /* ======================================
       CONFIGURAÇÃO DO PERÍODO PERMITIDO
    ====================================== */
    const mesSeguinte = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();

    // Cria datas de início e fim do mês seguinte
    const dataMinima = new Date(ano, mesSeguinte, 1);
    const dataMaxima = new Date(ano, mesSeguinte + 1, 0);

    // Aplica limites ao input de data se ele existir
    if (DOM.data) {
        DOM.data.min = dataMinima.toISOString().split("T")[0];
        DOM.data.max = dataMaxima.toISOString().split("T")[0];
        DOM.data.value = "";
        criarInfoPeriodo(dataMinima, dataMaxima);
    }

    const nomeMesRef = dataMinima
        .toLocaleString("pt-BR", { month: "long" })
        .toUpperCase();

    const ultimoDiaMes = dataMaxima.getTime();

    if (intervaloPrazo) clearInterval(intervaloPrazo);

    // Inicia o Loop de atualização do Cronômetro
    intervaloPrazo = setInterval(() => {
        const agora = Date.now();
        const instDiv = document.getElementById("instMessage");

        // Limpa classes de estado anteriores
        DOM.prazoBox.classList.remove(
            "estado-verde", "estado-alerta", "estado-urgente", 
            "estado-critico", "estado-sucesso", "estado-inspecao"
        );

        /* --- CASO 1: SISTEMA AINDA NÃO ABRIU --- */
        if (agora < abertura) {
            STATE.isClosed = true;
            if (DOM.form) DOM.form.style.display = "none";
            if (instDiv) instDiv.style.display = "none";

            DOM.prazoBox.classList.add("estado-inspecao");
            atualizarTimer(abertura - agora, `
                <b style="color:#1A3C6E">ESTAMOS PASSANDO EM INSPEÇÃO AO CÓDIGO.</b><br>
                Voltamos em:
            `);
        }

        /* --- CASO 2: SISTEMA JÁ FECHOU --- */
        else if (agora > fechamento) {
    STATE.isClosed = true;
    if (DOM.form) DOM.form.style.display = "none";
    if (instDiv) instDiv.style.display = "none";

    // Mostra a área de consulta mesmo com o form escondido
    const consultaArea = document.getElementById("consultaFechada");
    if (consultaArea) consultaArea.classList.remove("is-hidden"); // Use classList por segurança

    if (agora <= ultimoDiaMes) {
        DOM.prazoBox.classList.add("estado-sucesso");
        DOM.timerDisplay.innerHTML = `
            <b style="color:#2E7D32">MISSÃO CUMPRIDA!</b><br>
            Solicitações para <b>${nomeMesRef}</b> encerradas.
        `;
    } else {
        DOM.timerDisplay.innerHTML = "⌛ Aguardando novo cronograma...";
    }
}

        /* --- CASO 3: SISTEMA ABERTO (OPERACIONAL) --- */
        else {
            STATE.isClosed = false;
            if (DOM.form) DOM.form.style.display = "block";
            if (instDiv) instDiv.style.display = "block";

            const diff = fechamento - agora;

            // TRAVA DE SEGURANÇA: Se a diferença for negativa, força o sistema a entender que fechou
            if (diff <= 0) {
                location.reload(); // Recarrega a página para aplicar o estado "Fechado" imediatamente
                return;
            }            

            // Lógica de Cores por Urgência
            if (diff < 7200000) { // 2 horas
                DOM.prazoBox.classList.add("estado-critico");
                atualizarTimer(diff, "🔥 EMERGÊNCIA: TEMPO ACABANDO!");
            }
            else if (diff < 21600000) { // 6 horas
                DOM.prazoBox.classList.add("estado-urgente");
                atualizarTimer(diff, "⚠️ RÁPIDO! O TEMPO ESTÁ ACABANDO");
            }
            else if (diff < 86400000) { // 24 horas
                DOM.prazoBox.classList.add("estado-alerta");
                atualizarTimer(diff, "⏳ SISTEMA FECHA EM BREVE");
            }
            else {
                DOM.prazoBox.classList.add("estado-verde");
                atualizarTimer(diff, "⚡ OPERACIONAL ATIVO");
            }
        }
    }, 1000);
}

function atualizarTimer(diff, titulo) {
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    DOM.timerDisplay.innerHTML = `
        <b>${titulo}</b><br>
        <span style="font-weight:bold">${d}d ${h}h ${m}m ${s}s</span>
    `;
}

function criarInfoPeriodo(min, max) {
    let info = document.getElementById("infoPeriodo");
    if (!info && DOM.data?.parentNode) {
        info = document.createElement("small");
        info.id = "infoPeriodo";
        info.style.display = "block";
        info.style.marginTop = "5px";
        info.style.color = "#666";
        DOM.data.parentNode.appendChild(info);
    }

    if (info) {
        info.innerHTML = `📅 Período permitido: <b>${min.toLocaleDateString("pt-BR")}</b> a <b>${max.toLocaleDateString("pt-BR")}</b>`;
    }
}
