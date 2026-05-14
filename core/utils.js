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
   🔐 SANITIZAÇÃO
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
        .replace(/'/g, "&#39;");
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
