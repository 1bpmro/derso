// core/dom.js

import { CONFIG } from "./config.js"; 

function $(id) {
    return document.getElementById(id);
}

export { $ };

function buildDOM() {
    const DOM = {
        form:               $("dersoForm"),
        email:              $("email"),
        matricula:          $("matricula"),
        matriculaConsulta:  $("matriculaConsulta"),
        nome:               $("nome"),
        data:               $("data"),
        btnEnviar:          $("btnEnviar"),
        btnHistory:         $("btnHistory"),
        btnHistoryFechado:  $("btnHistoryFechado"),
        consultaFechada:    $("consultaFechada"),
        timerDisplay:       $("timerDisplay"),
        prazoBox:           $("prazoBox"),
        modal:              $("modalMsg"),
        historyContent:     $("historyContent"),
        loading:            $("loadingScreen"),
        formContent:        $("formContent"),
        barra:              $("barraProgresso"),
        footer:             $("footerText")
    };

    if (CONFIG.DEBUG) {
        Object.entries(DOM).forEach(([key, el]) => {
            if (!el) console.warn(`⚠️ DOM: elemento ausente → "${key}"`);
        });
    }

    return DOM;
}

export let DOM = {};

document.addEventListener("DOMContentLoaded", () => {
    Object.assign(DOM, buildDOM());
});
