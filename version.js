// version.js - DERSO VERSION CONTROL CENTER 🎯

const VERSION_DATA = Object.freeze({
    SISTEMA: "9.5.7",
    STATUS: "PRODUÇÃO",
    COMPILACAO: "2026-05-21",
    LOG_TAG: "DERSO v9.5.7"
});

// 1. Atribui ao escopo global (essencial para o importScripts do sw.js)
if (typeof self !== 'undefined') {
    self.VERSION_CONTROL = VERSION_DATA;
}

// 2. Exportação segura para módulos sem quebrar o Service Worker
// Usamos uma propriedade dinâmica para exportar apenas se o ambiente aceitar
let exportado = VERSION_DATA;
export { exportado as VERSION_CONTROL };
