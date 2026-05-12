// ui/manager.js

import { DOM } from "../core/dom.js";

/* ======================================
   📦 CACHE DE ELEMENTOS FIXOS
====================================== */

const modalTitle =
    document.getElementById("modalTitle");

const modalText =
    document.getElementById("modalText");

const modalIcon =
    document.getElementById("modalIcon");

const loadingTextEl =
    document.getElementById("loadingText");

const btnEnviar =
    document.getElementById("btnEnviar");

/* ======================================
   🎛️ UI MANAGER
====================================== */

export const UI = {

    /* ======================================
       🪟 MODAIS
    ====================================== */

    modal: {

        show(
            title,
            text,
            icon,
            color,
            showHistory = false
        ) {

            if (!DOM.modal) return;

            DOM.modal.classList.remove(
                "is-hidden"
            );

            DOM.modal.style.display = "flex";

            /* ================================
               📝 TÍTULO
            ================================ */

            if (modalTitle) {
                modalTitle.textContent = title;
            }

            /* ================================
               📄 TEXTO
            ================================ */

            if (modalText) {

                if (showHistory) {
                    modalText.innerHTML = "";
                } else {
                    modalText.innerHTML = text;
                }
            }

            /* ================================
               🎨 ÍCONE
            ================================ */

            if (modalIcon) {

                modalIcon.textContent = icon;

                modalIcon.style.color = color;
            }

            /* ================================
               📜 HISTÓRICO
            ================================ */

            if (DOM.historyContent) {

                DOM.historyContent.classList.toggle(
                    "is-hidden",
                    !showHistory
                );

                if (!showHistory) {
                    DOM.historyContent.innerHTML = "";
                }
            }
        },

        close() {

            if (!DOM.modal) return;

            DOM.modal.style.display = "none";

            DOM.modal.classList.add(
                "is-hidden"
            );
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

            if (loadingTextEl) {
                loadingTextEl.textContent =
                    message;
            }

            DOM.loading.classList.remove(
                "is-hidden"
            );

            DOM.formContent?.classList.add(
                "is-hidden"
            );
        },

        hide() {

            if (!DOM.loading) return;

            DOM.loading.classList.add(
                "is-hidden"
            );

            DOM.formContent?.classList.remove(
                "is-hidden"
            );
        }
    },

    /* ======================================
       ✨ FEEDBACK VISUAL
    ====================================== */

    feedback: {

        lockForm() {

            DOM.form?.classList.add(
                "form-locked"
            );

            if (btnEnviar) {
                btnEnviar.disabled = true;
            }
        },

        unlockForm() {

            DOM.form?.classList.remove(
                "form-locked"
            );

            if (btnEnviar) {
                btnEnviar.disabled = false;
            }
        },

        shake(el) {

            if (!el) return;

            el.classList.remove(
                "ui-shake"
            );

            // 🔥 força reflow
            void el.offsetWidth;

            el.classList.add(
                "ui-shake"
            );

            setTimeout(() => {

                el.classList.remove(
                    "ui-shake"
                );

            }, 600);
        },

        flash(el) {

            if (!el) return;

            el.classList.remove(
                "ui-flash"
            );

            // 🔥 força reflow
            void el.offsetWidth;

            el.classList.add(
                "ui-flash"
            );

            setTimeout(() => {

                el.classList.remove(
                    "ui-flash"
                );

            }, 800);
        },

        scrollToTop() {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    },

    /* ======================================
       📊 PROGRESSO
    ====================================== */

    updateProgress() {

        if (
            !DOM.barra ||
            !DOM.email ||
            !DOM.nome ||
            !DOM.data
        ) {
            return;
        }

        /* ================================
           🔍 CAMPOS
        ================================ */

        const email =
            DOM.email.value.trim();

        const nome =
            DOM.nome.value.trim();

        const data =
            DOM.data.value.trim();

        const folgaSelecionada =
            document.querySelector(
                'input[name="folga"]:checked'
            );

        /* ================================
           ✅ VALIDAÇÕES
        ================================ */

        const validacoes = [

            /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(email),

            nome.length > 3,

            Boolean(folgaSelecionada),

            data !== ""
        ];

        /* ================================
           📈 CÁLCULO
        ================================ */

        const preenchidos =
            validacoes.filter(Boolean).length;

        const percentual =
            Math.round(
                (preenchidos / validacoes.length) * 100
            );

        /* ================================
           🎨 UI
        ================================ */

        DOM.barra.style.width =
            `${percentual}%`;

        DOM.barra.setAttribute(
            "aria-valuenow",
            percentual
        );

        DOM.barra.classList.toggle(
            "barra-completa",
            percentual === 100
        );
    },

    /* ======================================
       🔘 BOTÃO
    ====================================== */

    setButtonState(
        btn,
        isLoading,
        loadingMessage = "ENVIANDO..."
    ) {

        if (!btn) return;

        if (isLoading) {

            if (!btn.dataset.originalText) {

                btn.dataset.originalText =
                    btn.textContent;
            }

            btn.disabled = true;

            btn.textContent =
                loadingMessage;

        } else {

            btn.disabled = false;

            btn.textContent =
                btn.dataset.originalText ||
                "ENVIAR";
        }
    }
};
