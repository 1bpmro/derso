//core/dom.js

function $(id) {
    return document.getElementById(id);
}

export const DOM = {
    form: $("dersoForm"),
    email: $("email"),
    matricula: $("matricula"),
    matriculaConsulta: $("matriculaConsulta"),
    nome: $("nome"),
    data: $("data"),
    btnEnviar: $("btnEnviar"),
    btnHistory: $("btnHistory"),
    btnHistoryFechado: $("btnHistoryFechado"),
    consultaFechada: $("consultaFechada"),
    timerDisplay: $("timerDisplay"),
    prazoBox: $("prazoBox"),
    modal: $("modalMsg"),
    historyContent: $("historyContent"),
    loading: $("loadingScreen"),
    formContent: $("formContent"),
    barra: $("barraProgresso"),
    footer: $("footerText")
};
