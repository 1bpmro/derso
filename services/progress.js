// services/progress.js

import { DOM } from "../core/dom.js";

/* ======================================
   🎯 ATUALIZA BARRA DE PROGRESSO
====================================== */

export function updateProgress() {

    if (
        !DOM?.email ||
        !DOM?.nome ||
        !DOM?.data ||
        !DOM?.barra
    ) {
        return;
    }

    // 🔥 evita querySelector repetitivo
    const folgaSelecionada =
        document.querySelector(
            'input[name="folga"]:checked'
        );

    const validacoes = [

        /* ================================
           📧 EMAIL VÁLIDO
        ================================ */
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(DOM.email.value.trim()),

        /* ================================
           👤 NOME
        ================================ */
        DOM.nome.value.trim().length > 3,

        /* ================================
           🛌 FOLGA
        ================================ */
        Boolean(folgaSelecionada),

        /* ================================
           📅 DATA
        ================================ */
        DOM.data.value.trim() !== ""

    ];

    const preenchidos =
        validacoes.filter(Boolean).length;

    const percentual =
        Math.round(
            (preenchidos / validacoes.length) * 100
        );

    /* ================================
       🎨 UI
    ================================ */

    DOM.barra.style.width =
        `${percentual}%`;

    DOM.barra.classList.toggle(
        "barra-completa",
        percentual === 100
    );
}
