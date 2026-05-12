// handlers/events.js

import { DOM } from "../core/dom.js";
import { CONFIG } from "../core/config.js";
import { STATE } from "../core/state.js";

import { registrarLog } from "../services/logger.js";

import { handleSubmit } from "./submit.js";

import { buscarHistorico } from "../core/api.js";

import { UI } from "../ui/manager.js";

import { applyInstitutionalTheme } from "../services/theme.js";

/* ======================================
   🧠 CONTROLE INTERNO
====================================== */

let eventosRegistrados = false;

/* ======================================
   🚀 SETUP PRINCIPAL
====================================== */

export function setupEvents() {

    if (window.__ADMIN_MODE__) {
        return;
    }

    if (eventosRegistrados) {
        registrarLog(
            "EVENTOS",
            "Eventos já registrados",
            "AVISO"
        );

        return;
    }

    if (!DOM.form) {

        console.warn(
            "⚠️ Formulário não encontrado."
        );

        return;
    }

    eventosRegistrados = true;

    registrarLog(
        "EVENTOS",
        "Registrando eventos...",
        "INFO"
    );

    setupAdminTrigger();

    setupEmailValidation();

    setupMatriculaValidation();

    setupFormulario();

    setupHistorico();

    setupModal();

    registrarLog(
        "EVENTOS",
        "Eventos registrados com sucesso",
        "SUCESSO"
    );
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

    const datalist =
        document.getElementById("emailProviders");

    DOM.email.addEventListener("input", (e) => {

        const valor =
            e.target.value.trim();

        atualizarSugestoesEmail(
            valor,
            datalist
        );

        validarEmail(valor);

        UI.updateProgress();
    });
}

function atualizarSugestoesEmail(
    valor,
    datalist
) {

    if (!datalist) return;

    datalist.innerHTML = "";

    if (!valor.includes("@")) {
        return;
    }

    const prefixo =
        valor.split("@")[0];

    const fragment =
        document.createDocumentFragment();

    CONFIG.EMAIL_LIST.forEach(provider => {

        const option =
            document.createElement("option");

        option.value =
            `${prefixo}@${provider}`;

        fragment.appendChild(option);
    });

    datalist.appendChild(fragment);
}

function validarEmail(valor) {

    if (!DOM.email) return;

    const valido =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(valor);

    DOM.email.classList.toggle(
        "valido",
        valido
    );
}

/* ======================================
   👮 MATRÍCULA
====================================== */

function setupMatriculaValidation() {

    if (!DOM.matricula) return;

    const erroEl =
        document.getElementById(
            "erroMatricula"
        );

    DOM.matricula.addEventListener(
        "blur",
        () => {

            let valor =
                DOM.matricula.value
                    .trim()
                    .replace(/\D/g, "");

            if (!valor) return;

            if (!valor.startsWith("1000")) {
                valor = `1000${valor}`;
            }

            DOM.matricula.value = valor;

            localStorage.setItem(
                "matricula_usuario",
                valor
            );

            const militar =
                STATE.employeeList[valor];

            if (militar?.nome) {

                DOM.nome.value =
                    militar.nome;

                erroEl?.classList.add(
                    "is-hidden"
                );

                registrarLog(
                    "VALIDACAO",
                    `Militar identificado: ${militar.nome}`,
                    "SUCESSO"
                );

                applyInstitutionalTheme(
                    valor
                );

            } else {

                DOM.nome.value = "";

                erroEl?.classList.remove(
                    "is-hidden"
                );

                applyInstitutionalTheme();

                registrarLog(
                    "VALIDACAO",
                    `Matrícula não encontrada: ${valor}`,
                    "AVISO"
                );
            }

            UI.updateProgress();
        }
    );
}

/* ======================================
   📝 FORMULÁRIO
====================================== */

function setupFormulario() {

    DOM.form.addEventListener(
        "input",
        UI.updateProgress
    );

    DOM.form.addEventListener(
        "submit",
        handleSubmit
    );
}

/* ======================================
   📜 HISTÓRICO
====================================== */

function setupHistorico() {

    DOM.btnHistory?.addEventListener(
        "click",
        () => {

            carregarHistorico(
                DOM.matricula?.value
            );
        }
    );

    DOM.btnHistoryFechado?.addEventListener(
        "click",
        () => {

            carregarHistorico(
                DOM.matriculaConsulta?.value
            );
        }
    );
}

/* ======================================
   🪟 MODAL
====================================== */

function setupModal() {

    document
        .getElementById("btnCloseModal")
        ?.addEventListener(
            "click",
            () => UI.modal.hide()
        );
}

/* ======================================
   🔐 ADMIN
====================================== */

async function abrirPortaAdmin() {

    const login = prompt(
        "🛡️ SISTEMA DERSO\n\nIdentifique-se:"
    );

    if (!login) return;

    const senha = prompt(
        "Digite sua senha:"
    );

    if (!senha) return;

    UI.loading.show(
        "Autenticando..."
    );

    try {

        const url =
            `${CONFIG.API_URL}?action=adminlogin` +
            `&matricula=${encodeURIComponent(login)}` +
            `&senha=${encodeURIComponent(senha)}`;

        const resp = await fetch(url);

        if (!resp.ok) {
            throw new Error(
                `Erro HTTP ${resp.status}`
            );
        }

        const result =
            await resp.json();

        if (result.autorizado) {

            localStorage.setItem(
                "adminToken",
                result.token
            );

            registrarLog(
                "ADMIN",
                `Acesso autorizado: ${result.nome}`,
                "SUCESSO"
            );

            const {
                iniciarPainelAdmin
            } = await import(
                "../features/admin.js"
            );

            await iniciarPainelAdmin();

        } else {

            registrarLog(
                "SEGURANÇA",
                `Falha login admin: ${login}`,
                "ERRO"
            );

            UI.modal.show(
                "ACESSO NEGADO",
                "Credenciais inválidas.",
                "🚫",
                "red"
            );
        }

    } catch (error) {

        console.error(error);

        registrarLog(
            "ADMIN",
            error.message,
            "ERRO"
        );

        UI.modal.show(
            "ERRO",
            "Falha ao autenticar administrador.",
            "📡",
            "red"
        );

    } finally {

        UI.loading.hide();
    }
}

/* ======================================
   📚 HISTÓRICO
====================================== */

async function carregarHistorico(
    matriculaOriginal
) {

    if (!matriculaOriginal) {

        UI.modal.show(
            "AVISO",
            "Informe uma matrícula válida.",
            "⚠️",
            "orange"
        );

        return;
    }

    let matricula =
        matriculaOriginal
            .trim()
            .replace(/\D/g, "");

    if (
        matricula.length <= 6 &&
        !matricula.startsWith("1000")
    ) {
        matricula = `1000${matricula}`;
    }

    const dadosMilitar =
        STATE.employeeList[matricula];

    const nomeMilitar =
        dadosMilitar?.nome ||
        dadosMilitar?.NOME ||
        DOM.nome?.value ||
        "MILITAR NÃO IDENTIFICADO";

    try {

        UI.loading.show(
            "Buscando registros..."
        );

        const resultado =
            await buscarHistorico(
                matricula
            );

        const lista =
            Array.isArray(resultado)
                ? resultado
                : resultado?.dados || [];

        const registrosHTML =
            lista.length > 0
                ? lista.map(item => `
                    <div class="historico-item">
                        <span>
                            📅 <b>${item.data}</b>
                        </span>

                        <span class="historico-tipo">
                            ${item.tipo || item.folga || "48H"}
                        </span>
                    </div>
                `).join("")
                : `
                    <p class="historico-vazio">
                        Nenhum registro encontrado.
                    </p>
                `;

        const conteudoHTML = `
            <div class="historico-header">
                ${nomeMilitar}
            </div>

            <div class="historico-lista">
                ${registrosHTML}
            </div>
        `;

        UI.modal.show(
            "HISTÓRICO",
            conteudoHTML,
            "📜",
            "#1a3c6e"
        );

        registrarLog(
            "HISTORICO",
            `Consulta realizada: ${matricula}`,
            "INFO"
        );

    } catch (error) {

        console.error(error);

        registrarLog(
            "HISTORICO",
            error.message,
            "ERRO"
        );

        UI.modal.show(
            "ERRO",
            "Não foi possível carregar o histórico.",
            "❌",
            "red"
        );

    } finally {

        UI.loading.hide();
    }
}
