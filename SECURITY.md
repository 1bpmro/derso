# 🔐 Política de Segurança - DERSO v9.5.7

Esta documentação visa garantir a integridade, confidencialidade e segurança dos dados do sistema de controle de voluntariedade (DERSO).

---

## 🚫 Gerenciamento de Credenciais e Dados Sensíveis

### O que NUNCA deve ser exposto publicamente:
- ❌ Links diretos de execução do Google Apps Script com tokens administrativos na URL.
- ❌ Tokens de sessão de administradores ativos gerados no navegador.
- ❌ Matrículas funcionais sem a devida máscara/redação nos logs públicos.

### ⚙️ Arquitetura de Configuração Híbrida
O projeto foi blindado para operar de forma segura tanto em servidores estáticos puros (**GitHub Pages**) quanto em ambientes de build modernos (**Vite**). Isso é feito centralizadamente no arquivo `core/config.js`.

1. **Em ambiente de Produção Estático (GitHub Pages):**
   As credenciais do Firebase e do Google Apps Script rodam como constantes seguras (padrões de fallback) encapsuladas em um objeto congelado com `Object.freeze()`. 
   
2. **Segurança no Front-end:**
   Lembre-se de que, por ser uma aplicação executada inteiramente no lado do cliente (Client-Side), as chaves do Firebase e do Apps Script são visíveis no console/rede do navegador. A segurança real do ecossistema é garantida por:
   - **Cabeçalhos de Autenticação (`adminToken`):** Validando requisições direto no servidor (Google Apps Script).
   - **Regras de Segurança do Firebase Console:** Bloqueando leitura/escrita não autorizada na base de dados do Push.

---

## 🛡️ Controles de Segurança Implementados

O DERSO conta com camadas ativas de proteção no front-end para mitigação de riscos:

* **Proteção contra XSS (Cross-Site Scripting):** Sanetização obrigatória de inputs e dados vindos da API usando funções de escape (`escaperHTML`) antes de renderizar qualquer conteúdo dinâmico na interface.
* **Segurança de Sessão (`core/auth.js`):** Mecanismo de Anti-Brute Force (bloqueio temporário de login após 5 tentativas incorretas) e expiração automática de sessão ociosa de administradores (30 minutos).
* **Validação de Input Estrita:** Bloqueio de caracteres especiais em campos críticos usando expressões regulares (Regex).
