// core/dom.js
import { CONFIG } from "./config.js";

function $(id) {
    return document.getElementById(id);
}

export { $ };

function buildDOM() {
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
            if (!el) {
                console.warn(`⚠️ DOM: elemento ausente → "${key}"`);
            }
        });
    }

    return elements;
}

export let DOM = {};

// Inicialização segura que popula o objeto exportado
function initDOM() {
    const targetElements = buildDOM();
    
    Object.keys(targetElements).forEach(key => {
        // Atribui o elemento ou null caso não exista (evita quebra de referências)
        DOM[key] = targetElements[key] || null;
    });
}

// --- EXECUÇÃO SEGURA BASEADA NO ESTADO DO DOCUMENTO ---
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDOM);
} else {
    // Se o HTML já foi processado pelo navegador, mapeia imediatamente
    initDOM();
}
