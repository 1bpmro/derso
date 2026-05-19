# 🚀 Guia de Migração de Segurança - DERSO v9.5.7

## 🛡️ Segurança Implementada no Front-End

O DERSO foi migrado para uma arquitetura híbrida centralizada. Os mecanismos de defesa foram atualizados para garantir conformidade com as auditorias de maio de 2026.

### 📋 Checklist de Funcionalidades Ativas

- [x] **Centralização de Escopo:** Credenciais unificadas em `core/config.js`.
- [x] **Sessões Voláteis:** Autenticação administrativa movida para `sessionStorage` com tokens criptográficos randômicos nativos (`crypto.getRandomValues`).
- [x] **Anti-Brute Force:** Bloqueio temporário de 15 minutos após 5 tentativas de login incorretas (gerenciado por `core/auth.js`).
- [x] **Session Timeout:** Expiração automática de ociosidade do Administrador após 30 minutos.
- [x] **Mitigação de XSS:** Implementação de escape de caracteres em tabelas dinâmicas do painel administrativo.
