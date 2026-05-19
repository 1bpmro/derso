// ui/manager.js
import { DOM } from "../core/dom.js";
import { CONFIG } from "../core/config.js";
import { sanitizarHTML } from "../core/utils.js"; // ✅ Importando sua função de proteção unificada

/* ======================================
   🎛️ UI MANAGER
====================================== */

export const UI = {

    /* ======================================
       🪟 MODAIS
    ====================================== */

    modal: {
        ensureStructure() {
            if (!DOM.modal) return null;

            let modalTitle = document.getElementById("modalTitle");
            let modalText = document.getElementById("modalText");
            let modalIcon = document.getElementById("modalIcon");
            let modalClose = document.getElementById("btnCloseModal");
            let historyContent = document.getElementById("historyContent");

            if (!modalTitle || !modalText || !modalIcon || !modalClose) {
                // Aqui a string HTML é estática e segura (escrita por você)
                DOM.modal.innerHTML = `
                    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
                        <span id="modalIcon" aria-hidden="true">ℹ️</span>
                        <h3 id="modalTitle">Aviso</h3>
                        <div id="modalText"></div>
                        <div id="historyContent" class="is-hidden"></div>
                        <button id="btnCloseModal" class="btn btn-primary" type="button">FECHAR</button>
                    </div>
                `;

                modalTitle = document.getElementById("modalTitle");
                modalText = document.getElementById("modalText");
                modalIcon = document.getElementById("modalIcon");
                modalClose = document.getElementById("btnCloseModal");
                historyContent = document.getElementById("historyContent");

                modalClose?.addEventListener("click", () => this.hide());
                DOM.modal.addEventListener("click", (e) => {
                    if (e.target === DOM.modal) this.hide();
                });
            }

            return { modalTitle, modalText, modalIcon, historyContent };
        },

        show(title, text, icon, color, showHistory = false) {
            if (!DOM.modal) return;

            const refs = this.ensureStructure();
            if (!refs) return;
            const { modalTitle, modalText, modalIcon, historyContent } = refs;

            // Exibe o container
            DOM.modal.classList.remove("is-hidden");
            DOM.modal.style.display = "flex";
            document.body.classList.add("modal-open");

            // ✅ TOTALMENTE SEGURO: textContent neutraliza qualquer tag de injeção maliciosa
            if (modalTitle) modalTitle.textContent = title;
            
            if (modalIcon) {
                modalIcon.textContent = icon;
                modalIcon.style.color = color;
            }

            // ✅ DETECÇÃO INTELIGENTE: Se a chamada não marcou explicitamente showHistory, mas o texto
            // claramente contém a estrutura HTML de tabelas/divs do histórico enviado pelo servidor,
            // nós forçamos o chaveamento para o fluxo do histórico para não quebrar o layout.
            const possuiHTMLHistorico = text && (text.includes("<div") || text.includes("<span"));
            const exibirComoHistorico = showHistory || possuiHTMLHistorico;

            if (modalText) {
                if (exibirComoHistorico) {
                    modalText.innerHTML = "";
                    modalText.style.display = "none"; // Oculta o bloco de texto simples
                } else {
                    modalText.style.display = "block";
                    // ✅ CORREÇÃO XSS: Modais comuns agora renderizam estritamente como texto puro.
                    // Para pular linhas, use strings com '\n' (ex: "Linha 1\n\nLinha 2")
                    modalText.textContent = text;
                }
            }

            // Controle do Histórico
            if (historyContent) {
                historyContent.classList.toggle("is-hidden", !exibirComoHistorico);
                if (exibirComoHistorico) {
                    // ✅ CORREÇÃO XSS COM LAYOUT PRESERVADO: Passa as divs de folgas pelo filtro 
                    // de sanitização antes de injetar, renderizando o layout do Sgt Dione de forma segura!
                    historyContent.innerHTML = sanitizarHTML(text);
                } else {
                    historyContent.innerHTML = "";
                }
            }
        },

        close() {
            if (!DOM.modal) return;
            DOM.modal.style.display = "none";
            DOM.modal.classList.add("is-hidden");
            document.body.classList.remove("modal-open");
        },

        hide() {
            this.close();
        }
    },

    /* ======================================
       ⏳ LOADING
    ====================================== */

    loading: {
        show(message = "Carregando...") {
            if (!DOM.loading) return;

            const loadingTextEl = document.getElementById("loadingText");
            if (loadingTextEl) {
                loadingTextEl.textContent = message;
            }

            DOM.loading.classList.remove("is-hidden");
            DOM.formContent?.classList.add("is-hidden");
        },

        hide() {
            if (!DOM.loading) return;
            DOM.loading.classList.add("is-hidden");
            DOM.formContent?.classList.remove("is-hidden");
        }
    },

    /* ======================================
       ✨ FEEDBACK VISUAL
    ====================================== */

    feedback: {
        lockForm() {
            const btnEnviar = document.getElementById("btnEnviar");
            DOM.form?.classList.add("form-locked");
            if (btnEnviar) btnEnviar.disabled = true;
        },

        unlockForm() {
            const btnEnviar = document.getElementById("btnEnviar");
            DOM.form?.classList.remove("form-locked");
            if (btnEnviar) btnEnviar.disabled = false;
        },

        shake(el) {
            if (!el) return;
            el.classList.remove("ui-shake");
            void el.offsetWidth; // Força reflow (reinicia animação)
            el.classList.add("ui-shake");
            setTimeout(() => el.classList.remove("ui-shake"), 600);
        },

        flash(el) {
            if (!el) return;
            el.classList.remove("ui-flash");
            void el.offsetWidth;
            el.classList.add("ui-flash");
            setTimeout(() => el.classList.remove("ui-flash"), 800);
        },

        scrollToTop() {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    },

    /* ======================================
       📊 PROGRESSO
    ====================================== */

    updateProgress() {
        if (!DOM.barra || !DOM.email || !DOM.nome || !DOM.data) return;

        const email = DOM.email.value.trim();
        const nome = DOM.nome.value.trim();
        const data = DOM.data.value.trim();
        const folgaSelecionada = document.querySelector('input[name="folga"]:checked');

        const validacoes = [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
            nome.length > 3,
            Boolean(folgaSelecionada),
            data !== ""
        ];

        const preenchidos = validacoes.filter(Boolean).length;
        const percentual = Math.round((preenchidos / validacoes.length) * 100);

        DOM.barra.style.width = `${percentual}%`;
        DOM.barra.setAttribute("aria-valuenow", percentual);
        DOM.barra.classList.toggle("barra-completa", percentual === 100);
    },

    /* ======================================
       🔘 BOTÃO
    ====================================== */

    setButtonState(btn, isLoading, loadingMessage = "ENVIANDO...") {
        if (!btn) return;

        if (isLoading) {
            if (!btn.dataset.originalText) {
                btn.dataset.originalText = btn.textContent;
            }
            btn.disabled = true;
            btn.textContent = loadingMessage;
        } else {
            btn.disabled = false;
            btn.textContent = btn.dataset.originalText || "ENVIAR";
        }
    }
};

if (CONFIG.DEBUG) {
    window.UI = UI;
}
