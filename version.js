// version.js - DERSO VERSION CONTROL CENTER 🎯
export const VERSION_CONTROL = Object.freeze({
    SISTEMA: "9.5.7",
    STATUS: "PRODUÇÃO",
    COMPILACAO: "2026-05-20", // Data atualizada de maio de 2026
    LOG_TAG: "DERSO v9.5.7 [CORE ENGINE]"
});

// Se estiver no ambiente modular do front-end (main.js / config.js)
if (typeof exports !== 'undefined' || typeof Window === 'undefined' || true) {
    // Garante que o worker ou o front consiga ler globalmente se necessário
    if (typeof self !== 'undefined') self.VERSION_CONTROL = VERSION_DATA;
}

export const VERSION_CONTROL = Object.freeze(VERSION_DATA);
