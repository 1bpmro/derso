// core/config.js - DERSO Configuration (v9.5.7 - Híbrido Protegido)
// ============================================
// ⚠️ SECURITY: Injected via environment variables or safe defaults
// ============================================

const getEnvVar = (key, defaultValue = undefined) => {
    let value = undefined;

    // ✅ SOLUÇÃO DEFINITIVA: Acessa o objeto de forma indireta e isolada. 
    // Se o ambiente não der suporte a módulos/Vite, o catch captura sem quebrar o script.
    try {
        const globalModule = Function('return this')();
        if (globalModule && globalModule.import && globalModule.import.meta && globalModule.import.meta.env) {
            value = globalModule.import.meta.env[key];
        }
    } catch (e) {
        // Ignora falhas de ambientes que não possuem suporte a ESM/Vite
    }

    // ✅ Segundo Fallback: Objeto global do DERSO (Modelo Estático PWA)
    if (typeof value === 'undefined' && typeof window !== 'undefined' && window.DERSO_CONFIG) {
        value = window.DERSO_CONFIG[key];
    }

    // ✅ Retorna o valor limpo ou a chave real do DERSO como padrão seguro
    return typeof value !== 'undefined' ? value : defaultValue;
};

export const CONFIG = Object.freeze({
    // ============================================
    // API ENDPOINTS
    // ============================================
    // ✅ Se o Git/Vite não injetar, ele usa a sua URL real do GAS como padrão seguro
    API_URL: getEnvVar('VITE_API_URL', 'https://script.google.com/macros/s/AKfycbyRZe-Dsc-aKFRwkfRuGPWnstsC-yr7jRfrZGPwunmScbcu_7psRE4lErC-n3GhMN_weg/exec'),
    
    // ============================================
    // VERSION
    // ============================================
    VERSAO: getEnvVar('VITE_APP_VERSION', '9.5.7'),
    
    // ============================================
    // EMAIL CONFIGURATION
    // ============================================
    EMAIL_LIST: [
        "gmail.com",
        "hotmail.com",
        "outlook.com",
        "yahoo.com",
        "pm.ro.gov.br"
    ],
    
    ADMIN_EMAIL: getEnvVar('VITE_ADMIN_EMAIL', 'ti1bpmro@gmail.com'),
    
    /* ======================================
       🔥 CONFIGURAÇÕES DO FIREBASE & PUSH
    ====================================== */
    FIREBASE: {
        apiKey: getEnvVar('VITE_FIREBASE_API_KEY', 'AIzaSyDqAtLFEwpxN2Yhju8X8I0QeHWR66copLc'),
        authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'derso-8294b.firebaseapp.com'),
        projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'derso-8294b'),
        messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', '1056159074696'),
        appId: getEnvVar('VITE_FIREBASE_APP_ID', '1:1056159074696:web:90962abec6bf703c5d923d')
    },
    VAPID_KEY: getEnvVar('VITE_FIREBASE_VAPID_KEY', 'BHGFjPdrcahFdPsIVDsA4RA04ArqgiVslZgoZXjwm49O-au9z4hN2TLNQfhYsWdRQnEkZ4khJCaSb-S09dSolkc'),

    // ============================================
    // SYSTEM CONFIGURATION
    // ============================================
    TIMEOUT_FETCH: 10000,
    TIMEOUT_POST: 15000,
    RETRY_MAX: 2,
    RETRY_DELAY_MS: 500,
    
    // ============================================
    // DEBUG MODE
    // ============================================
    // ✅ PERMISSIVO PARA PRODUÇÃO MILITAR: Ativo em localhost ou na URL do repositório de homologação do BPM
    DEBUG: getEnvVar('VITE_DEBUG', 
        (typeof window !== 'undefined' && (
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('github.io') // 🛡️ Permite depurar no GitHub Pages enquanto finaliza os testes
        )) ? 'true' : 'false'
    ) === 'true',
    
    // ============================================
    // SESSION & SECURITY (Exigido pelo core/auth.js)
    // ============================================
    ADMIN_SESSION_TIMEOUT: 30 * 60 * 1000,
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_TIME: 15 * 60 * 1000,
});

if (!CONFIG.API_URL) {
    console.error('🔴 CRITICAL: API_URL is not configured. Application cannot function.');
}

// ✅ EXPOSIÇÃO CORRIGIDA: Exibe o objeto de configuração e injeta na window para testes em homologação
if (CONFIG.DEBUG) {
    console.warn('🟡 DEBUG MODE ENABLED - Monitoramento operacional ativo.');
    window.CONFIG = CONFIG;
} else {
    // Garante compatibilidade básica se desativado por completo
    if (typeof window !== 'undefined') window.CONFIG = undefined;
}
