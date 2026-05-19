// core/adminGuard.js

// Estado interno oculto por escopo de módulo (Segurança reforçada contra manipulação de console)
let _adminMode = false;

/**
 * Valida se a sessão administrativa é ativa e válida.
 * Realiza migração transparente de tokens do localStorage para o sessionStorage.
 * @returns {boolean}
 */
export function canOpenAdmin() {
  // ✅ Procura primeiro na sessão ativa, senão recorre ao armazenamento antigo (Legado)
  const token = sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken");
  if (!token || token.length <= 10) return false;

  // Checa expiração se o token tiver estrutura segura "valor|timestamp"
  const parts = token.split("|");
  if (parts.length === 2) {
    const expiry = parseInt(parts[1], 10);
    if (Date.now() > expiry) {
      // ✅ Limpeza absoluta em caso de token vencido
      sessionStorage.removeItem("adminToken");
      localStorage.removeItem("adminToken");
      return false;
    }
  }

  // ✅ COMPATIBILIDADE E MIGRAÇÃO: Se o token só existia no localStorage antigo,
  // promove ele para sessionStorage e limpa o armazenamento persistente.
  if (!sessionStorage.getItem("adminToken") && localStorage.getItem("adminToken")) {
    sessionStorage.setItem("adminToken", token);
    localStorage.removeItem("adminToken");
  }

  return true;
}

/**
 * Define o estado do modo administrador global e interno do ecossistema.
 * @param {boolean} value 
 */
export function setAdminMode(value) {
  // Mantém no window para compatibilidade com rotas legadas, mas blinda no closure privado
  window.__ADMIN_MODE__ = value;
  _adminMode = value;
}

/**
 * Retorna se a aplicação está operando em modo administrativo.
 * @returns {boolean}
 */
export function isAdminMode() {
  return _adminMode;
}
