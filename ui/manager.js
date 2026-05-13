// ui/manager.js
import { DOM } from "../core/dom.js";

/* ======================================
   🎛️ UI MANAGER
====================================== */

export const UI = {

    /* ======================================
       🪟 MODAIS
    ====================================== */

    modal: {
        show(title, text, icon, color, showHistory = false) {
            if (!DOM.modal) return;

            // Seleção interna para evitar erro de "null" se o DOM não estiver pronto no load
            const modalTitle = document.getElementById("modalTitle");
            const modalText = document.getElementById("modalText");
            const modalIcon = document.getElementById("modalIcon");

            // Exibe o container
            DOM.modal.classList.remove("is-hidden");
            DOM.modal.style.display = "flex";
            document.body.classList.add("modal-open");

            // Preenchimento de dados
            if (modalTitle) modalTitle.textContent = title;
            
            if (modalIcon) {
                modalIcon.textContent = icon;
                modalIcon.style.color = color;
            }

            if (modalText) {
                if (showHistory) {
                    modalText.innerHTML = "";
                } else {
                    modalText.innerHTML = text;
                }
            }

            // Controle do Histórico
            if (DOM.historyContent) {
                DOM.historyContent.classList.toggle("is-hidden", !showHistory);
                if (!showHistory) {
                    DOM.historyContent.innerHTML = "";
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

// Exporta para o escopo global apenas para facilitar o debug via console
window.UI = UI;
