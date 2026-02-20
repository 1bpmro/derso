// services/progress.js

// ✅ CORREÇÃO: Saindo de services (../) para buscar o dom.js dentro de core/
import { DOM } from "../core/dom.js";

export function updateProgress() {

    if (!DOM?.email || !DOM?.nome || !DOM?.data || !DOM?.barra) return;

    const validacoes = [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(DOM.email.value.trim()), // Email válido
        DOM.nome.value.trim().length > 3,                         // Nome preenchido
        !!document.querySelector('input[name="folga"]:checked'),  // Tipo de folga selecionado
        DOM.data.value.trim() !== ""                               // Data selecionada
    ];

    const total = validacoes.length;
    const preenchidos = validacoes.filter(Boolean).length;
    const perc = (preenchidos / total) * 100;

    DOM.barra.style.width = perc + "%";
    DOM.barra.classList.toggle("barra-completa", perc === 100);
}
