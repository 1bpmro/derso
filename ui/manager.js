// ui/manager.js
import { DOM } from "../core/dom.js";

/**
 * UI Manager - Centraliza todas as interações visuais e manipulação de DOM
 */
export const UI = {
    
    // --- GESTÃO DE MODAIS ---
    modal: {
        /**
         * Exibe o modal com configurações dinâmicas
         */
        show(title, text, icon, color, showHistory = false) {
            if (!DOM.modal) return;

            // 1. Garante que o modal fique visível
            DOM.modal.classList.remove('is-hidden');
            DOM.modal.style.display = 'flex';

            // 2. Preenche os textos básicos
            document.getElementById('modalTitle').textContent = title;
            
            // Usamos innerHTML para permitir que o histórico formatado (com <div>) apareça
            document.getElementById('modalText').innerHTML = showHistory ? "" : text;

            // 3. Configura o ícone
            const iconDiv = document.getElementById('modalIcon');
            if (iconDiv) {
                iconDiv.textContent = icon;
                iconDiv.style.color = color;
            }

            // 4. Controla o conteúdo do Histórico
            if (DOM.historyContent) {
                DOM.historyContent.classList.toggle('is-hidden', !showHistory);
                if (showHistory) {
                    DOM.historyContent.innerHTML = text; // Aqui entra o conteúdo do .map()
                }
            }
        },

        /** Fecha o modal e limpa os estados */
        close() {
            if (DOM.modal) {
                DOM.modal.style.display = 'none';
                DOM.modal.classList.add('is-hidden');
            }
        },

        /** Atalho para compatibilidade com outros scripts */
        hide() {
            this.close();
        }
    },

    // --- ESTADOS DE CARREGAMENTO (LOADING) ---
    loading: {
        show(message = "A carregar...") {
            if (!DOM.loading) return;
            
            // Seleciona o texto dentro do loading sem apagar o Spinner
            const textEl = document.getElementById('loadingText') || DOM.loading;
            textEl.textContent = message;
            
            DOM.loading.classList.remove("is-hidden");
            
            // Esconde o formulário enquanto carrega
            DOM.formContent?.classList.add("is-hidden");
        },

        hide() {
            if (!DOM.loading) return;
            DOM.loading.classList.add("is-hidden");
            DOM.formContent?.classList.remove("is-hidden");
        }
    },

    // --- FEEDBACKS VISUAIS E ANIMAÇÕES ---
    feedback: {
        lockForm() {
            DOM.form?.classList.add("form-locked");
            const btn = document.getElementById('btnEnviar');
            if (btn) btn.disabled = true;
        },

        unlockForm() {
            DOM.form?.classList.remove("form-locked");
            const btn = document.getElementById('btnEnviar');
            if (btn) btn.disabled = false;
        },

        shake(el) {
            if (!el) return;
            el.classList.add("ui-shake");
            setTimeout(() => el.classList.remove("ui-shake"), 600);
        },

        flash(el) {
            if (!el) return;
            el.classList.add("ui-flash");
            setTimeout(() => el.classList.remove("ui-flash"), 800);
        },

        scrollToTop() {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    },

    // --- COMPONENTES ESPECÍFICOS ---
    
    /** Atualiza a barra de progresso do formulário */
    updateProgress() {
        if (!DOM.barra || !DOM.email || !DOM.nome || !DOM.data) return;

        const checks = [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(DOM.email.value.trim()), 
            DOM.nome.value.trim().length > 3,                         
            !!document.querySelector('input[name="folga"]:checked'),  
            DOM.data.value.trim() !== ""                              
        ];

        const total = checks.length;
        const completed = checks.filter(Boolean).length;
        const percentage = (completed / total) * 100;

        DOM.barra.style.width = `${percentage}%`;
        DOM.barra.classList.toggle("barra-completa", percentage === 100);
    },

    /** Altera o estado do botão de envio */
    setButtonState(btn, isLoading, text = "A ENVIAR...") {
        if (!btn) return;
        
        if (isLoading) {
            btn.dataset.originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = text;
        } else {
            btn.disabled = false;
            btn.textContent = btn.dataset.originalText || "ENVIAR SOLICITAÇÃO";
        }
    }
};
