// handlers/events.js

import { DOM } from "../core/dom.js";
import { CONFIG } from "../core/config.js";
import { STATE } from "../core/state.js";
import { registrarLog } from "../services/logger.js";
import { handleSubmit } from "./submit.js";
import { apiClient } from "../core/apiClient.js";
import { UI } from "../ui/manager.js";
import { applyInstitutionalTheme } from "../services/theme.js";
import { fetchHistory } from "../features/history.js";
import { normalizarMatricula, validarEmail, sanitizarHTML } from "../core/utils.js";

/* ======================================
   🧠 CONTROLE INTERNO
====================================== */

let eventosRegistrados = false;

/* ======================================
   🚀 SETUP PRINCIPAL
====================================== */

export function setupEvents() {
    // Corrigido: não depende de window.__ADMIN_MODE__
    if (eventosRegistrados) {
        registrarLog("EVENTOS", "Eventos já registrados", "AVISO");
        return;
    }

    if (!DOM.form) {
        console.warn("⚠️ Formulário não encontrado.");
        return;
    }

    eventosRegistrados = true;

    registrarLog("EVENTOS", "Registrando eventos...", "INFO");

    setupAdminTrigger();
    setupEmailValidation();
    setupMatriculaValidation();
    setupFormulario();
    setupHistorico();
    setupModal();

    registrarLog("EVENTOS", "Eventos registrados com sucesso", "SUCESSO");
}

/* ======================================
   🛡️ GATILHO ADMIN
====================================== */

function setupAdminTrigger() {
    if (!DOM.footer) return;

    let cliquesFooter = 0;
    let timerFooter = null;

    DOM.footer.style.cursor = "pointer";

    DOM.footer.addEventListener("click", () => {
        cliquesFooter++;
        clearTimeout(timerFooter);

        if (cliquesFooter >= 5) {
            cliquesFooter = 0;
            abrirPortaAdmin();
            return;
        }

        timerFooter = setTimeout(() => {
            cliquesFooter = 0;
        }, 2000);
    });
}

/* ======================================
   📧 EMAIL
====================================== */

function setupEmailValidation() {
    if (!DOM.email) return;

    const datalist = document.getElementById("emailProviders");

    DOM.email.addEventListener("input", (e) => {
        const valor = e.target.value.trim();
        atualizarSugestoesEmail(valor, datalist);
        DOM.email.classList.toggle("valido", validarEmail(valor));
        UI.updateProgress();
    });
}

function atualizarSugestoesEmail(valor, datalist) {
    if (!datalist) return;
    datalist.innerHTML = "";
    if (!valor.includes("@")) return;

    const prefixo = valor.split("@")[0];
    const fragment = document.createDocumentFragment();

    CONFIG.EMAIL_LIST.forEach(provider => {
        const option = document.createElement("option");
        option.value = `${prefixo}@${provider}`;
        fragment.appendChild(option);
    });

    datalist.appendChild(fragment);
}

/* ======================================
   👮 MATRÍCULA
====================================== */

function setupMatriculaValidation() {
    if (!DOM.matricula) return;

    const erroEl = document.getElementById("erroMatricula");

    DOM.matricula.addEventListener("blur", () => {
        const valorRaw = DOM.matricula.value;
        if (!valorRaw.trim()) return;

        // Corrigido: usa utilitário centralizado
        const valor = normalizarMatricula(valorRaw);
        DOM.matricula.value = valor;
        localStorage.setItem("matricula_usuario", valor);

        let militar = STATE.employeeList?.[valor] ?? null;

        if (!militar && STATE.employeeList) {
            militar = Object.values(STATE.employeeList)
                .find(m => String(m.matricula) === valor);
        }

        if (militar && (militar.nome || militar.NOME)) {
            DOM.nome.value = militar.nome || militar.NOME;
            erroEl?.classList.add("is-hidden");
            registrarLog("VALIDACAO", `Militar identificado: ${DOM.nome.value}`, "SUCESSO");
            applyInstitutionalTheme(valor);
        } else {
            DOM.nome.value = "";
            erroEl?.classList.remove("is-hidden");
            applyInstitutionalTheme();
            registrarLog("VALIDACAO", `Matrícula não encontrada: ${valor}`, "AVISO");
        }

        UI.updateProgress();
    });
}

/* ======================================
   📝 FORMULÁRIO
====================================== */

function setupFormulario() {
    DOM.form.addEventListener("input", UI.updateProgress);
    DOM.form.addEventListener("submit", handleSubmit);
}

/* ======================================
   📜 HISTÓRICO
====================================== */

function setupHistorico() {
    DOM.btnHistory?.addEventListener("click", () => {
        // Corrigido: delega para fetchHistory de features/history.js
        fetchHistory(DOM.matricula?.value);
    });

    DOM.btnHistoryFechado?.addEventListener("click", () => {
        fetchHistory(DOM.matriculaConsulta?.value);
    });
}

/* ======================================
   🪟 MODAL
====================================== */

function setupModal() {
    document
        .getElementById("btnCloseModal")
        ?.addEventListener("click", () => UI.modal.hide());
}

/* ======================================
   🔐 ADMIN
====================================== */

async function abrirPortaAdmin() {
    const login = prompt("🛡️ SISTEMA DERSO\n\nIdentifique-se:");
    if (!login) return;

    const senha = prompt("Digite sua senha:");
    if (!senha) return;

    UI.loading.show("Autenticando...");

    try {
        // Corrigido: POST via apiClient — credenciais fora da URL
        const result = await apiClient.post("adminlogin", {
            matricula: login,
            senha
        });

        if (result?.autorizado) {
            localStorage.setItem("adminToken", result.token);

            registrarLog("ADMIN", `Acesso autorizado: ${result.nome}`, "SUCESSO");

            const { iniciarPainelAdmin } = await import("../features/admin.js");
            await iniciarPainelAdmin();

        } else {
            registrarLog("SEGURANÇA", `Falha login admin: ${login}`, "ERRO");
            UI.modal.show("ACESSO NEGADO", "Credenciais inválidas.", "🚫", "red");
        }

    } catch (error) {
        console.error(error);
        registrarLog("ADMIN", error.message, "ERRO");
        UI.modal.show("ERRO", "Falha ao autenticar administrador.", "📡", "red");
    } finally {
        UI.loading.hide();
    }
}
