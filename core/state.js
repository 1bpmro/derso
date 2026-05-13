// core/state.js
export const STATE = Object.seal({
    /* ======================================
       📋 DADOS PRINCIPAIS
    ====================================== */
    employeeList: {},

    /* ======================================
       🔒 CONTROLE DO SISTEMA
    ====================================== */
    isClosed: false,
    ultimoEnvio: 0,

    /* ======================================
       🧾 LOGS DE SESSÃO
       ⚠️ Use .push() para adicionar — nunca reatribua o array
    ====================================== */
    sessionLogs: [],

    /* ======================================
       👤 USUÁRIO ATUAL
    ====================================== */
    userScore: 0,

    /* ======================================
       🛠️ ADMIN
       ⚠️ adminToken aqui é apenas cache de sessão.
          A fonte de verdade é o adminGuard.js (localStorage).
          Mantenha sincronizado ao autenticar/deslogar.
    ====================================== */
    adminToken: null,
    listaCompletaAdmin: [],

    /* ======================================
       📡 EVENTOS / MÉTRICAS
       ⚠️ Use .push() para adicionar — nunca reatribua o array
    ====================================== */
    eventosPush: [],
    scoreMap: {},

    /* ======================================
       🧠 METADADOS INTERNOS
       lastSync: null antes de inicializar, Date.now() após
    ====================================== */
    initialized: false,
    lastSync: null
});
