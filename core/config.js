// core/config.js (v9.5.7 - Hardening e Centralização Ativa)
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
       🔒 POLÍTICAS DE AUTENTICAÇÃO (NOVO)
    ====================================== */
    ADMIN_SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos de sessão ativa
    MAX_LOGIN_ATTEMPTS: 5,                // Bloqueia após 5 erros seguidos
    LOGIN_LOCKOUT_TIME: 15 * 60 * 1000,    // Tempo de bloqueio: 15 minutos

       /* ======================================
       🔥 CONFIGURAÇÕES DO FIREBASE & PUSH
       (Centralizado a pedido da auditoria)
    ====================================== */
    FIREBASE: {
        apiKey: "AIzaSyDqAtLFEwpxN2Yhju8X8I0QeHWR66copLc",
        authDomain: "derso-8294b.firebaseapp.com",
        projectId: "derso-8294b",
        messagingSenderId: "1056159074696",
        appId: "1:1056159074696:web:90962abec6bf703c5d923d"
    },
    VAPID_KEY: "BHGFjPdrcahFdPsIVDsA4RA04ArqgiVslZgoZXjwm49O-au9z4hN2TLNQfhYsWdRQnEkZ4khJCaSb-S09dSolkc",

    /* ======================================
       ⚙️ CONFIGURAÇÕES DE SISTEMA
    ====================================== */
    TIMEOUT_FETCH: 10000,       // usado pelo apiClient para GETs
    TIMEOUT_POST: 15000,        // usado pelo apiClient para POSTs
    RETRY_MAX: 2,               // renomeado de RETRY_REQUESTS para clareza
    RETRY_DELAY_MS: 500,        // delay base entre tentativas
    DEBUG: false
});
