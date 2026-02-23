// handlers/submit.js

import { DOM } from "../core/dom.js";
import { CONFIG } from "../core/config.js";
import { STATE } from "../core/state.js";
import { registrarLog } from "../services/logger.js";
import { updateProgress } from "../services/progress.js";
import { salvarRascunho } from "../services/storage.js";
import { UI } from "../ui/manager.js"; 

export async function handleSubmit(e) {
    e.preventDefault();

    // 1. NORMALIZAÇÃO DE SEGURANÇA (Dentro da função!)
    let matriculaLimpa = DOM.matricula.value.trim().replace(/\D/g, '');
    if (matriculaLimpa && matriculaLimpa.length <= 6 && !matriculaLimpa.startsWith("1000")) {
        matriculaLimpa = "1000" + matriculaLimpa;
    }
    DOM.matricula.value = matriculaLimpa; 

    // 2. 🔒 Anti spam (3 segundos)
    if (Date.now() - STATE.ultimoEnvio < 3000) {
        registrarLog("BLOQUEIO", "Tentativa de envio muito rápida", "AVISO");
        return;
    }
    STATE.ultimoEnvio = Date.now();

    const mLog = matriculaLimpa || "N/A";
    registrarLog("ENVIO", `Iniciando tentativa para matrícula: ${mLog}`);

    try {
        UI.feedback.lockForm(); 
        UI.loading.show("ENVIANDO...");

        const formData = new URLSearchParams(new FormData(DOM.form));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(CONFIG.API_URL, {
            method: "POST",
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);

        let response;
        try {
            response = await res.json();
        } catch {
            throw new Error("Resposta inválida do servidor");
        }

        if (response.success || response.result === "success") {
            registrarLog("SUCESSO", `Solicitação de ${mLog} registrada`, "SUCESSO");

            UI.modal.show(
                "SUCESSO!",
                "Sua solicitação foi registrada no banco de dados.",
                "✔",
                "#2E7D32"
            );

            limparFormulario();
            UI.feedback.flash(DOM.form); 
            UI.feedback.scrollToTop();   

        } else {
            tratarErroServidor(response);
        }

    } catch (err) {
        registrarLog("ERRO_CRITICO", err.message, "ERRO");
        UI.feedback.shake(DOM.form); 

        UI.modal.show(
            "ERRO DE CONEXÃO",
            err.name === "AbortError"
                ? "O servidor demorou para responder. Tente novamente."
                : "Não foi possível enviar sua solicitação. Verifique sua internet.",
            "📡",
            "red"
        );
    } finally {
        UI.feedback.unlockForm(); 
        UI.loading.hide();
    }
}

/* ======================================
   FUNÇÕES AUXILIARES
====================================== */

function limparFormulario() {
    if (DOM.form) {
        DOM.form.reset();
        UI.updateProgress(); 
        salvarRascunho({}); 
        registrarLog("FORM_RESET", "Formulário limpo após envio");
    }
}

function tratarErroServidor(response) {
    registrarLog("ENVIO_NEGADO", `Servidor recusou: ${response.message}`, "AVISO");

    // Ajustado para bater com a frase exata do seu Código.gs
    if (response.message?.includes("Já existe") || response.message?.toLowerCase().includes("duplicada")) {
        UI.modal.show(
            "SOLICITAÇÃO DUPLICADA",
            "Você já solicitou folga para esta data.",
            "🚫",
            "orange"
        );
        limparFormulario();
        return;
    }

    UI.modal.show(
        "AVISO",
        response.message || "Falha desconhecida.",
        "⚠️",
        "orange"
    );
    UI.feedback.shake(DOM.form);
}
