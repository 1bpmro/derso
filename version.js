// version.js - DERSO VERSION CONTROL CENTER 🎯

const VERSION_DATA = Object.freeze({
    SISTEMA: "9.5.7",
    STATUS: "PRODUÇÃO",
    COMPILACAO: "2026-05-20",
    LOG_TAG: "DERSO v9.5.7"
});

// 1. Atribui ao escopo global (essencial para o importScripts do sw.js)
if (typeof self !== 'undefined') {
    self.VERSION_CONTROL = VERSION_DATA;
}

// 2. Exporta como módulo padrão (essencial para o import do main.js / config.js)
export const VERSION_CONTROL = VERSION_DATA;
