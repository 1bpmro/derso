// core/dom.js
import { CONFIG } from "./config.js";

function $(id) {
    return document.getElementById(id);
}

export { $ };

function buildDOM() {
    // Mantive sua lógica original aqui
    const elements = {
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
        Object.entries(elements).forEach(([key, el]) => {
            if (!el) console.warn(`⚠️ DOM: elemento ausente → "${key}"`);
        });
    }

    return elements;
}

export let DOM = {};

// --- ALTERAÇÃO AQUI: Execução imediata se o DOM já estiver pronto ---
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        Object.assign(DOM, buildDOM());
    });
} else {
    // Se o navegador já carregou o HTML, mapeia agora mesmo!
    Object.assign(DOM, buildDOM());
}
