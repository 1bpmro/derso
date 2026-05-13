// core/config.js
export const CONFIG = Object.freeze({
    API_URL: "https://script.google.com/macros/s/AKfycbySobQVE00uUwPdlJwvfWzVgfq9N822lBjnIYkp5tMq1-pGE1GzKJHhJKsiepIDZVvSow/exec",
    VERSAO: "7.1.1",
    EMAIL_LIST: [
        "gmail.com",
        "hotmail.com",
        "outlook.com",
        "yahoo.com",
        "pm.ro.gov.br"
    ],
    ADMIN_EMAIL: "ti1bpmro@gmail.com",

    /* ======================================
       ⚙️ CONFIGURAÇÕES DE SISTEMA
    ====================================== */
    TIMEOUT_FETCH: 10000,       // usado pelo apiClient para GETs
    TIMEOUT_POST: 15000,        // usado pelo apiClient para POSTs
    RETRY_MAX: 2,               // renomeado de RETRY_REQUESTS para clareza
    RETRY_DELAY_MS: 500,        // delay base entre tentativas
    DEBUG: false
});
