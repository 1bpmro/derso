// core/config.js
export const CONFIG = Object.freeze({
    API_URL: "https://script.google.com/macros/s/AKfycbyRZe-Dsc-aKFRwkfRuGPWnstsC-yr7jRfrZGPwunmScbcu_7psRE4lErC-n3GhMN_weg/exec",
    VERSAO: "9.5.7",
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
