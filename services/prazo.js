// services/prazo.js

import { DOM } from "../core/dom.js";
import { STATE } from "../core/state.js";

/* ======================================
   ⏱️ CONTROLE GLOBAL
====================================== */

let timeoutPrazo = null;

/* ======================================
   🚀 MONITORAMENTO PRINCIPAL
====================================== */

export function monitorarPrazos(
    dataAbertura,
    dataFechamento
) {

    if (!DOM.timerDisplay || !DOM.prazoBox) {

        console.warn(
            "[PRAZO] Elementos visuais não encontrados."
        );

        return;
    }

    /* ======================================
       🧠 CACHE DE ELEMENTOS
    ====================================== */

    const instDiv =
        document.getElementById("instMessage");

    const consultaArea =
        document.getElementById("consultaFechada");

    /* ======================================
       📅 DATAS BASE
    ====================================== */

    const abertura =
        new Date(dataAbertura).getTime();

    const fechamento =
        new Date(dataFechamento).getTime();

    const hoje =
        new Date();

    const mesSeguinte =
        hoje.getMonth() + 1;

    const ano =
        hoje.getFullYear();

    const dataMinima =
        new Date(ano, mesSeguinte, 1);

    const dataMaxima =
        new Date(ano, mesSeguinte + 1, 0);

    const ultimoDiaMes =
        dataMaxima.getTime();

    const nomeMesRef =
        dataMinima
            .toLocaleString("pt-BR", {
                month: "long"
            })
            .toUpperCase();

    /* ======================================
       📆 INPUT DATE
    ====================================== */

    if (DOM.data) {

        DOM.data.min =
            formatarDataInput(dataMinima);

        DOM.data.max =
            formatarDataInput(dataMaxima);

        DOM.data.value = "";

        criarInfoPeriodo(
            dataMinima,
            dataMaxima
        );
    }

    /* ======================================
       🧹 LIMPA LOOP ANTIGO
    ====================================== */

    if (timeoutPrazo) {
        clearTimeout(timeoutPrazo);
    }

    /* ======================================
       🔁 LOOP RECURSIVO PREMIUM
    ====================================== */

    function loopPrazo() {

        const agora = Date.now();

        limparEstadosVisuais();

        /* ======================================
           🔒 SISTEMA NÃO ABERTO
        ====================================== */

        if (agora < abertura) {

            STATE.isClosed = true;

            ocultarFormulario(instDiv);

            setEstadoVisual("estado-inspecao");

            atualizarTimer(
                abertura - agora,
                `
                <b style="color:#1A3C6E">
                    ESTAMOS PASSANDO EM INSPEÇÃO AO CÓDIGO.
                </b><br>
                Voltamos em:
                `
            );
        }

        /* ======================================
           ✅ SISTEMA ENCERRADO
        ====================================== */

        else if (agora >= fechamento) {

            STATE.isClosed = true;

            ocultarFormulario(instDiv);

            if (consultaArea) {
                consultaArea.classList.remove(
                    "is-hidden"
                );
            }

            if (agora <= ultimoDiaMes) {

                setEstadoVisual("estado-sucesso");

                DOM.timerDisplay.innerHTML = `
                    <b style="color:#2E7D32">
                        MISSÃO CUMPRIDA!
                    </b><br>

                    Solicitações para
                    <b>${nomeMesRef}</b>
                    encerradas.
                `;

            } else {

                DOM.timerDisplay.innerHTML =
                    "⌛ Aguardando novo cronograma...";
            }
        }

        /* ======================================
           ⚡ SISTEMA OPERACIONAL
        ====================================== */

        else {

            STATE.isClosed = false;

            mostrarFormulario(instDiv);

            const diff =
                fechamento - agora;

            // proteção extra
            if (diff <= 0) {

                STATE.isClosed = true;

                timeoutPrazo =
                    setTimeout(loopPrazo, 1000);

                return;
            }

            /* ================================
               🔥 NÍVEIS DE URGÊNCIA
            ================================ */

            if (diff < 7200000) {

                setEstadoVisual("estado-critico");

                atualizarTimer(
                    diff,
                    "🔥 EMERGÊNCIA: TEMPO ACABANDO!"
                );
            }

            else if (diff < 21600000) {

                setEstadoVisual("estado-urgente");

                atualizarTimer(
                    diff,
                    "⚠️ RÁPIDO! O TEMPO ESTÁ ACABANDO"
                );
            }

            else if (diff < 86400000) {

                setEstadoVisual("estado-alerta");

                atualizarTimer(
                    diff,
                    "⏳ SISTEMA FECHA EM BREVE"
                );
            }

            else {

                setEstadoVisual("estado-verde");

                atualizarTimer(
                    diff,
                    "⚡ OPERACIONAL ATIVO"
                );
            }
        }

        /* ======================================
           🔁 PRÓXIMO CICLO
        ====================================== */

        timeoutPrazo =
            setTimeout(loopPrazo, 1000);
    }

    loopPrazo();
}

/* ======================================
   🎨 ESTADO VISUAL
====================================== */

function limparEstadosVisuais() {

    DOM.prazoBox.classList.remove(
        "estado-verde",
        "estado-alerta",
        "estado-urgente",
        "estado-critico",
        "estado-sucesso",
        "estado-inspecao"
    );
}

function setEstadoVisual(classe) {

    limparEstadosVisuais();

    DOM.prazoBox.classList.add(classe);
}

/* ======================================
   👁️ FORMULÁRIO
====================================== */

function ocultarFormulario(instDiv) {

    if (DOM.form) {
        DOM.form.style.display = "none";
    }

    if (instDiv) {
        instDiv.style.display = "none";
    }
}

function mostrarFormulario(instDiv) {

    if (DOM.form) {
        DOM.form.style.display = "block";
    }

    if (instDiv) {
        instDiv.style.display = "block";
    }
}

/* ======================================
   ⏱️ TIMER
====================================== */

function atualizarTimer(
    diff,
    titulo
) {

    const d =
        Math.floor(diff / 86400000);

    const h =
        Math.floor(
            (diff % 86400000) / 3600000
        );

    const m =
        Math.floor(
            (diff % 3600000) / 60000
        );

    const s =
        Math.floor(
            (diff % 60000) / 1000
        );

    DOM.timerDisplay.innerHTML = `
        <b>${titulo}</b><br>

        <span style="font-weight:bold">
            ${d}d ${h}h ${m}m ${s}s
        </span>
    `;
}

/* ======================================
   📆 FORMATADOR SAFE (SEM UTC BUG)
====================================== */

function formatarDataInput(date) {

    const ano =
        date.getFullYear();

    const mes =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const dia =
        String(date.getDate())
            .padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

/* ======================================
   📋 INFO DE PERÍODO
====================================== */

function criarInfoPeriodo(
    min,
    max
) {

    let info =
        document.getElementById("infoPeriodo");

    if (!info && DOM.data?.parentNode) {

        info =
            document.createElement("small");

        info.id = "infoPeriodo";

        info.style.display = "block";
        info.style.marginTop = "5px";
        info.style.color = "#666";

        DOM.data.parentNode.appendChild(info);
    }

    if (info) {

        info.innerHTML = `
            📅 Período permitido:
            <b>${min.toLocaleDateString("pt-BR")}</b>
            a
            <b>${max.toLocaleDateString("pt-BR")}</b>
        `;
    }
}
