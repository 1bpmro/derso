// services/theme.js

import { STATE } from "../core/state.js";
import { registrarLog } from "./logger.js";

/* ======================================
   🌙 DARK MODE AUTOMÁTICO
====================================== */

const DARK_MODE_QUERY =
    "(prefers-color-scheme: dark)";

const DARK_STYLE_ID =
    "darkModeStyle";

export function applyDarkModeStyles() {

    if (
        !window.matchMedia ||
        !window.matchMedia(DARK_MODE_QUERY).matches
    ) {
        return;
    }

    // 🔥 evita duplicação
    if (document.getElementById(DARK_STYLE_ID)) {
        return;
    }

    registrarLog(
        "INTERFACE",
        "Modo Noturno Tático aplicado",
        "INFO"
    );

    const style = document.createElement("style");

    style.id = DARK_STYLE_ID;

    style.textContent = `
        @media (prefers-color-scheme: dark) {

            body {
                background-color: #0f0f0f !important;
                color: #e0e0e0 !important;
            }

            .container {
                background: #1a1a1a !important;
                border: 1px solid #333 !important;
                box-shadow:
                    0 10px 30px rgba(0,0,0,0.5) !important;
            }

            input:not([type="radio"]),
            select,
            textarea {
                background: #252525 !important;
                color: #ffffff !important;
                border-color: #444 !important;
            }

            .radio-group label {
                background: #252525 !important;
                border-color: #444 !important;
                color: #ccc !important;
            }

            #instMessage {
                background:
                    rgba(255, 202, 40, 0.1) !important;

                color: #ffca28 !important;

                border:
                    1px solid rgba(255, 202, 40, 0.3)
                    !important;

                border-left:
                    4px solid #ffca28 !important;

                padding: 12px !important;

                border-radius: 6px !important;
            }

            .subtitle,
            .label-hint,
            small {
                color: #999 !important;
            }

            #prazoBox {
                background: #1e1e1e !important;

                box-shadow:
                    0 4px 15px rgba(0,0,0,0.6)
                    !important;
            }

            .modal-content {
                background: #222 !important;
                color: #fff !important;
                border: 1px solid #444 !important;
            }
        }
    `;

    document.head.appendChild(style);
}

/* ======================================
   🛡️ TEMA INSTITUCIONAL
====================================== */

export function applyInstitutionalTheme(
    matriculaLogada = null
) {

    const hoje = new Date();

    const chaveHoje =
        `${hoje.getDate()}-${hoje.getMonth() + 1}`;

    // 🔥 mês seguinte = escala referência
    const dataRef = new Date(
        hoje.getFullYear(),
        hoje.getMonth() + 1,
        1
    );

    const mesReferencia =
        dataRef.getMonth();

    const instDiv =
        document.getElementById("instMessage");

    if (!instDiv) {
        return;
    }

    const aplicarMensagem = (mensagem) => {

        instDiv.innerHTML = mensagem;

        registrarLog(
            "TEMA",
            "Mensagem institucional aplicada",
            "INFO"
        );
    };

    /* ================================
       🎂 ANIVERSÁRIO
    ================================ */

    if (
        matriculaLogada &&
        STATE.employeeList?.[matriculaLogada]
    ) {

        const militar =
            STATE.employeeList[matriculaLogada];

        if (militar?.niver === chaveHoje) {

            const primeiroNome =
                (militar.nome || "")
                    .trim()
                    .split(" ")[0];

            aplicarMensagem(`
                🎂 <b>Parabéns, ${primeiroNome}!</b><br>
                O 1º BPM celebra seu dia.
                Saúde, honra e vida longa,
                combatente! 🫡
            `);

            return;
        }
    }

    /* ================================
       🇧🇷 DATAS COMEMORATIVAS
    ================================ */

    const temasPontuais = {

        "4-1":
            `🌳 Rondônia: ${
                hoje.getFullYear() - 1982
            } anos de história e bravura.`,

        "10-2":
            "🌸 10 de Fevereiro: Dia da Policial Militar. Nossa continência àquelas que honram a farda da PMRO.",

        "1-5":
            "🛠️ Dia do Trabalhador: O serviço público move a cidadania.",

        "7-9":
            "🇧🇷 7 de Setembro: Independência se constrói com Ordem e Progresso.",

        "15-11":
            `🇧🇷 15 de Novembro: Proclamação da República (${
                hoje.getFullYear() - 1889
            } anos).`,

        "7-12":
            `🛡️ 1º BPM: O Sentinela da Capital. ${
                hoje.getFullYear() - 1983
            } anos de compromisso.`
    };

    if (temasPontuais[chaveHoje]) {

        aplicarMensagem(
            temasPontuais[chaveHoje]
        );

        return;
    }

    /* ================================
       📅 MENSAGENS MENSAIS
    ================================ */

    const mensagensMensais = {

        0: "🎭 Janeiro: Planejamento estratégico para o novo ano.",

        1: "🎊 Fevereiro: Foco e prevenção na segurança dos eventos.",

        2: "🌷 Março: Homenagem às mulheres que honram a farda.",

        3: "🕊️ Abril: Tempo de renovação e fortalecimento da união.",

        4: "🤱 Maio: Reconhecemos as mães que sustentam famílias e carreiras.",

        5: "🔥 Junho: Valorizando cultura e tradição com responsabilidade.",

        6: "👮 Julho: Disciplina e prontidão no policiamento ostensivo.",

        7: "👔 Agosto: Família é alicerce da missão profissional.",

        8: "🇧🇷 Setembro: Renovamos nosso juramento de servir e proteger.",

        9: "🎗️ Outubro: Prevenção é compromisso com a vida.",

        10: "📜 Novembro: Compromisso com os ideais republicanos.",

        11: "🎄 Dezembro: Planejamento garante um final de ano seguro."
    };

    aplicarMensagem(
        mensagensMensais[mesReferencia]
        || "DERSO 1º BPM - Sentinela da Capital"
    );
}
