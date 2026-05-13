// core/adminGuard.js

export function canOpenAdmin() {
  const token = localStorage.getItem("adminToken");
  if (!token || token.length <= 10) return false;

  // Adiciona: checa expiração se o token tiver estrutura "valor|timestamp"
  const parts = token.split("|");
  if (parts.length === 2) {
    const expiry = parseInt(parts[1], 10);
    if (Date.now() > expiry) {
      localStorage.removeItem("adminToken"); // limpa token vencido
      return false;
    }
  }

  return true;
}

export function setAdminMode(value) {
  // Mantém o window para compatibilidade, mas espelha num closure privado
  window.__ADMIN_MODE__ = value;
  _adminMode = value;
}

// Estado interno menos exposto
let _adminMode = false;
export function isAdminMode() {
  return _adminMode;
}
