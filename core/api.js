import { CONFIG } from "./config.js";

async function safeFetch(url, options = {}) {
    const res = await fetch(url, options);

    if (!res.ok) {
        throw new Error(`Erro HTTP ${res.status}`);
    }

    try {
        return await res.json();
    } catch {
        throw new Error("Resposta inválida do servidor");
    }
}

export async function carregarDadosIniciais() {
    const [dResp, lResp] = await Promise.all([
        safeFetch(`${CONFIG.API_URL}?action=datas`),
        safeFetch(`${CONFIG.API_URL}?action=lista`)
    ]);

    return { datas: dResp, lista: lResp };
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
