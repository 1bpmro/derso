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

/* ======================================
   🛡️ SANITIZAÇÃO INTELIGENTE
====================================== */

/**
 * Sanitizador que permite HTML legítimo (com whitelist)
 * mas bloqueia scripts e event handlers XSS.
 * 
 * Usado para renderizar histórico formatado com segurança.
 * 
 * @param {string} html - HTML a ser sanitizado
 * @returns {string} - HTML limpo e seguro
 */
export function sanitizeHTMLContent(html) {
    if (typeof html !== 'string') {
        return String(html || '');
    }

    // 1️⃣ Rejeita patterns XSS conhecidos
    const xssPatterns = [
        /<script[^>]*>[\s\S]*?<\/script>/gi,      // Scripts
        /javascript:/gi,                            // javascript: protocol
        /on\w+\s*=/gi,                              // Event handlers (onclick, onerror, etc)
        /<iframe/gi,                                // Iframes
        /<embed/gi,                                 // Embeds
        /<object/gi,                                // Objects
        /<link/gi,                                  // Links
        /<meta/gi,                                  // Meta tags
        /<base/gi,                                  // Base tags
        /data:/gi                                   // Data URIs
    ];

    let sanitized = html;
    for (const pattern of xssPatterns) {
        sanitized = sanitized.replace(pattern, '');
    }

    // 2️⃣ Cria container DOM para parser
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitized;

    // 3️⃣ Whitelist de tags permitidas
    const allowedTags = ['DIV', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'SMALL', 'BR'];
    const allowedAttributes = ['style', 'class', 'id'];

    // 4️⃣ Whitelist de propriedades CSS seguras
    const safeStyleProps = [
        'color', 
        'background-color', 
        'font-weight', 
        'margin', 
        'padding', 
        'font-size', 
        'text-align', 
        'display', 
        'flex', 
        'justify-content', 
        'border', 
        'border-bottom', 
        'overflow', 
        'overflow-y', 
        'max-height', 
        'padding-right',
        'gap'
    ];

    // 5️⃣ Função recursiva para limpar nodes
    function cleanNodes(node) {
        const children = Array.from(node.childNodes);

        children.forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tag = child.tagName;

                // ✅ Tag permitida?
                if (!allowedTags.includes(tag)) {
                    // ❌ Não permitida: substitui por seu textContent
                    const text = document.createTextNode(child.textContent);
                    node.replaceChild(text, child);
                    return;
                }

                // ✅ Limpa atributos não-permitidos
                const attrs = Array.from(child.attributes);
                attrs.forEach(attr => {
                    if (!allowedAttributes.includes(attr.name)) {
                        child.removeAttribute(attr.name);
                    } else if (attr.name === 'style') {
                        // ⚠️ Valida style para evitar injeção CSS
                        const style = attr.value;
                        
                        // Rejeita styles perigosos
                        if (
                            /expression\s*\(/i.test(style) ||  // IE expressions
                            /javascript:/i.test(style) ||
                            /behavior:/i.test(style) ||
                            /import\s+/i.test(style) ||
                            /@import/i.test(style)
                        ) {
                            child.removeAttribute('style');
                            return;
                        }

                        // Filtra apenas propriedades seguras
                        const props = style.split(';').map(p => p.trim()).filter(p => p);
                        const cleanedProps = props.filter(prop => {
                            const [key] = prop.split(':');
                            return safeStyleProps.some(safe => 
                                safe.toLowerCase() === key.trim().toLowerCase()
                            );
                        });

                        if (cleanedProps.length > 0) {
                            child.setAttribute('style', cleanedProps.join('; '));
                        } else {
                            child.removeAttribute('style');
                        }
                    }
                });

                // ✅ Recursivo: limpa filhos
                cleanNodes(child);
            } else if (child.nodeType !== Node.TEXT_NODE) {
                // ❌ Remove outros tipos de nodes (comments, etc)
                node.removeChild(child);
            }
        });
    }

    cleanNodes(tempDiv);

    // 6️⃣ Retorna HTML limpo
    return tempDiv.innerHTML;
}
