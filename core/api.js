import { CONFIG } from "./config.js";

async function safeFetch(url, options = {}) {
    const res = await fetch(url, options);

    if (!res.ok) {
        throw new Error(`Erro HTTP ${res.status}`);
    }

    const text = await res.text();

    try {
        return JSON.parse(text);
    } catch {
        console.warn("⚠️ Resposta não é JSON:", text);
        throw new Error("Resposta inválida do servidor");
    }
}

export async function carregarDadosIniciais() {
    const results = await Promise.allSettled([
        safeFetch(`${CONFIG.API_URL}?action=datas`),
        safeFetch(`${CONFIG.API_URL}?action=lista`)
    ]);

    return {
        datas: results[0].status === "fulfilled" ? results[0].value : [],
        lista: results[1].status === "fulfilled" ? results[1].value : []
    };
}

export async function enviarFormulario(formData) {
    return safeFetch(CONFIG.API_URL, {
        method: "POST",
        body: formData
    });
}

export async function buscarHistorico(matricula) {
    const resposta = await safeFetch(
        `${CONFIG.API_URL}?action=historico&matricula=${encodeURIComponent(matricula)}`
    );
    
    // Se a resposta for um objeto com uma propriedade de lista (ex: dados ou history), 
    // retorna só a lista. Se já for a lista, retorna ela.
    return resposta.dados || resposta.history || resposta;
}
