// core/state.js

export const STATE = Object.seal({
    // 📋 Dados principais
    employeeList: {},

    // 🔒 Controle de sistema
    isClosed: false,
    ultimoEnvio: 0,

    // 🧾 Logs
    sessionLogs: [],

    // 🛠️ ADMIN
    listaCompletaAdmin: [],
    adminToken: null,

    // 🔥 NOVOS CAMPOS (corrigem teu erro e evitam próximos)
    userScore: 0,        // ← resolve o erro atual
    eventosPush: [],     // ← eventos de push (aberto/ignorado)
    scoreMap: {}         // ← score por matrícula (admin dashboard)
});
