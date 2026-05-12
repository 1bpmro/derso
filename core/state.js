//core/state.js


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
    ====================================== */
    sessionLogs: [],

    /* ======================================
       👤 USUÁRIO ATUAL
    ====================================== */
    userScore: 0,

    /* ======================================
       🛠️ ADMIN
    ====================================== */
    adminToken: null,
    listaCompletaAdmin: [],

    /* ======================================
       📡 EVENTOS / MÉTRICAS
    ====================================== */
    eventosPush: [],
    scoreMap: {},

    /* ======================================
       🧠 METADADOS INTERNOS (leve evolução)
    ====================================== */
    initialized: false,
    lastSync: null
});
