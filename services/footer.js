// services/footer.js

// ✅ Corrigido: Saindo da pasta 'services' e entrando na 'core'
import { DOM } from "../core/dom.js";
import { CONFIG } from "../core/config.js";

export function updateFooter() {

    if (!DOM.footer) {
        console.warn("Elemento footer não encontrado.");
        return;
    }

    const now = new Date();

    const mes = String(now.getMonth() + 1).padStart(2, "0");
    const ano = now.getFullYear();

    DOM.footer.textContent =
        `Desenvolvido na 1ª Cia do 1º BPM pelo PVSA Pedro Porto - versão ${CONFIG.VERSAO} - em ${mes}/${ano}`;
}
