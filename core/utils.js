// core/utils.js

/* ======================================
   📐 MATRÍCULA
====================================== */

/**
 * Normaliza uma matrícula:
 * - Remove não-dígitos
 * - Garante prefixo 1000
 * @param {string} valor
 * @returns {string}
 */
export function normalizarMatricula(valor) {
    let raw = String(valor || "").trim().replace(/\D/g, "");
    if (!raw) return "";
    if (!raw.startsWith("1000")) {
        raw = `1000${raw}`;
    }
    return raw;
}

/* ======================================
   📧 EMAIL
====================================== */

/**
 * Valida formato básico de e-mail
 * @param {string} valor
 * @returns {boolean}
 */
export function validarEmail(valor) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

/* ======================================
   🔐 SANITIZAÇÃO & SEGURANÇA
====================================== */

/**
 * Escapa caracteres HTML para evitar XSS
 * ao inserir strings em innerHTML
 * @param {string} str
 * @returns {string}
 */
export function sanitizarHTML(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/\//g, "&#x2F;"); // Adicionado escape de barra para maior cobertura
}

// 📎 ALIAS DE COMPATIBILIDADE: Mapeia o termo do Copilot para a sua função nativa
export { sanitizarHTML as escapeHTML };

/**
 * Remove HTML tags completamente (Retorna apenas texto puro)
 * @param {string} texto
 * @returns {string}
 */
export function stripHTML(texto) {
    if (typeof texto !== 'string') {
        return String(texto || '');
    }
    return texto
        .replace(/<[^>]*>/g, '')
        .replace(/&[a-z]+;/gi, '')
        .trim();
}

/**
 * Limpa dados estruturados vindos da API recursivamente antes de salvar no State
 * @param {object} data
 * @returns {object}
 */
export function sanitizeAPIResponse(data) {
    if (!data || typeof data !== 'object') return {};
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizarHTML(value);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            sanitized[key] = value;
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'string' ? sanitizarHTML(item) : item
            );
        } else if (typeof value === 'object') {
            sanitized[key] = sanitizeAPIResponse(value);
        }
    }
    return sanitized;
}

/* ======================================
   ⏱️ TEMPO
====================================== */

/**
 * Retorna true se o intervalo mínimo em ms
 * ainda não passou desde o timestamp dado
 * @param {number} ultimoTimestamp
 * @param {number} intervaloMs
 * @returns {boolean}
 */
export function estaEmCooldown(ultimoTimestamp, intervaloMs) {
    return Date.now() - ultimoTimestamp < intervaloMs;
}

/**
 * Promise que resolve após N milissegundos
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ======================================
   🧹 OBJETO / ARRAY
====================================== */

/**
 * Retorna true se o valor é um array não-vazio
 * @param {*} valor
 * @returns {boolean}
 */
export function isArrayValido(valor) {
    return Array.isArray(valor) && valor.length > 0;
}

/**
 * Retorna true se o valor é um objeto simples não-nulo
 * @param {*} valor
 * @returns {boolean}
 */
export function isObjeto(valor) {
    return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}
