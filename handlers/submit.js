// handlers/submit.js

import { DOM } from "../core/dom.js";
import { apiClient } from "../core/apiClient.js";
import { STATE } from "../core/state.js";
import { registrarLog } from "../services/logger.js";
import { limparRascunho } from "../services/storage.js";
import { UI } from "../ui/manager.js";
import { normalizarMatricula, estaEmCooldown, sanitizarHTML } from "../core/utils.js"; // ✅ Importado o sanitizarHTML por segurança

/* ======================================
   🚫 CONTROLE DE ENVIO
====================================== */

let envioEmAndamento = false;

/* ======================================
   🚀 SUBMIT PRINCIPAL
====================================== */

export async function handleSubmit(e) {
    e.preventDefault();

    /* ================================
       🚫 BLOQUEIO DUPLO CLIQUE
    ================================ */

    if (envioEmAndamento) {
        registrarLog("BLOQUEIO", "Tentativa de envio simultâneo", "AVISO");
        return;
    }

    /* ================================
       🔒 NORMALIZA MATRÍCULA
       Corrigido: usa utilitário centralizado
    ================================ */

    const matriculaLimpa = normalizarMatricula(DOM.matricula?.value);

    if (DOM.matricula) {
        DOM.matricula.value = matriculaLimpa;
    }

    /* ================================
       💾 CACHE LOCAL
    ================================ */

    if (matriculaLimpa) {
        localStorage.setItem("matricula_usuario", matriculaLimpa);
    }

    /* ================================
       🚫 ANTI-SPAM
    ================================ */

    const agora = Date.now();

    if (estaEmCooldown(STATE.ultimoEnvio, 3000)) {
        registrarLog("BLOQUEIO", "Tentativa muito rápida", "AVISO");
        UI.modal.show("AGUARDE", "Espere alguns segundos antes de enviar novamente.", "⏳", "orange");
        return;
    }

    const matriculaLog = matriculaLimpa || "N/A";

    registrarLog("ENVIO", `Iniciando envio: ${matriculaLog}`, "INFO");

    envioEmAndamento = true;
    UI.feedback.lockForm();
    UI.loading.show("ENVIANDO SOLICITAÇÃO...");

    try {

        /* ================================
           📦 MONTA BODY PARA POST
           Corrigido: apiClient.post em vez de postForm inexistente
        ================================ */

        const formData = new FormData(DOM.form);
        formData.set("matricula", matriculaLimpa);

        const body = {};
        formData.forEach((v, k) => { body[k] = v; });
        delete body.action;

        // ✅ FIX: força o nome, pois readonly pode ser ignorado pelo FormData
        const militar = STATE.employeeList?.[matriculaLimpa];
        body.nome = DOM.nome?.value?.trim() || militar?.nome || "";

        const result = await apiClient.post("submit", body);

        /* ================================
           ✅ SUCESSO
        ================================ */

        if (result.success || result.result === "success") {
            STATE.ultimoEnvio = Date.now();

            registrarLog("SUCESSO", `Solicitação registrada: ${matriculaLog}`, "SUCESSO");

            UI.modal.show(
                "SUCESSO!",
                "Sua solicitação foi registrada no banco de dados.",
                "✔",
                "#2E7D32"
            );

            limparFormulario();
            UI.feedback.flash(DOM.form);
            UI.feedback.scrollToTop();

            return;
        }

        /* ================================
           ⚠️ ERRO NEGADO PELO SERVIDOR
        ================================ */

        tratarErroServidor(result);

    } catch (error) {
        console.error(error);

        registrarLog("ERRO_CRITICO", error.message, "ERRO");

        UI.feedback.shake(DOM.form);

        // Corrigido: apiClient lança "Timeout na requisição", não AbortError
        const mensagem = error.message === "Timeout na requisição"
            ? "O servidor demorou para responder."
            : "Não foi possível enviar sua solicitação.";

        // ✅ CORREÇÃO XSS & DESIGN: Trocado <br> por \n para renderizar de forma segura e elegante via textContent
        const textoSeguro = `${mensagem}\n\nVerifique sua internet e tente novamente.`;

        UI.modal.show(
            "ERRO DE CONEXÃO",
            textoSeguro,
            "📡",
            "red"
        );

    } finally {
        envioEmAndamento = false;
        UI.feedback.unlockForm();
        UI.loading.hide();
    }
}

/* ======================================
   🧹 LIMPA FORMULÁRIO
====================================== */

function limparFormulario() {
    if (!DOM.form) return;

    DOM.form.reset();
    limparRascunho();
    UI.updateProgress();

    registrarLog("FORM_RESET", "Formulário limpo", "INFO");
}

/* ======================================
   ⚠️ ERROS DO SERVIDOR
====================================== */

function tratarErroServidor(response) {
    const mensagem = response?.message || "Falha desconhecida.";

    registrarLog("ENVIO_NEGADO", mensagem, "AVISO");

    const texto = mensagem.toLowerCase();

    if (texto.includes("duplicado") || texto.includes("já existe")) {
        UI.modal.show(
            "SOLICITAÇÃO DUPLICADA",
            "Já existe solicitação para esta data/tipo. Verifique seu histórico.",
            "⚠️",
            "orange"
        );
        return;
    }

    if (texto.includes("prazo") || texto.includes("fechado") || texto.includes("bloqueado")) {
        UI.modal.show(
            "PRAZO ENCERRADO",
            "O período para solicitação desta data está fechado.",
            "⛔",
            "red"
        );
        return;
    }

    // ✅ CORREÇÃO EXTRA CONTRA XSS: Garantimos que o 'mensagem' vindo de fora seja limpo antes de ir para a tela
    UI.modal.show("ERRO", sanitizarHTML(mensagem), "❌", "red");
}
