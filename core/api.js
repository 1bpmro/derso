// core/api.js
import { CONFIG } from "./config.js";

/* ======================================
   🔒 FETCH SEGURO (com timeout + parse robusto)
====================================== */
async function safeFetch(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        if (!res.ok) {
            throw new Error(`Erro HTTP ${res.status}`);
        }
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch {
            console.warn("⚠️ Resposta não é JSON:", text);
            throw new Error(`Resposta inválida: ${text.slice(0, 200)}`);
        }
    } catch (err) {
        if (err.name === "AbortError") {
            throw new Error("Timeout na requisição");
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

/* ======================================
   📦 DADOS INICIAIS (robusto e resiliente)
====================================== */
export async function carregarDadosIniciais() {
    const results = await Promise.allSettled([
        safeFetch(`${CONFIG.API_URL}?action=datas`),
        safeFetch(`${CONFIG.API_URL}?action=lista`)
    ]);

    if (results[0].status === "rejected") {
        console.warn("⚠️ Falha ao carregar datas:", results[0].reason);
    }
    if (results[1].status === "rejected") {
        console.warn("⚠️ Falha ao carregar lista:", results[1].reason);
    }

    const datas = results[0].status === "fulfilled" ? results[0].value : [];
    const lista = results[1].status === "fulfilled" ? results[1].value : [];

    return { datas, lista };
}

/* ======================================
   📤 ENVIO DE FORMULÁRIO
====================================== */
export async function enviarFormulario(formData) {
    return safeFetch(
        CONFIG.API_URL,
        {
            method: "POST",
            body: formData
        },
        15000 // timeout maior para envios
    );
}

/* ======================================
   📜 HISTÓRICO (normalizado)
====================================== */
export async function buscarHistorico(matricula) {
    if (!matricula) return [];
    const resposta = await safeFetch(
        `${CONFIG.API_URL}?action=historico&matricula=${encodeURIComponent(matricula)}`
    );
    const lista =
        resposta?.dados ??
        resposta?.history ??
        resposta;
    return Array.isArray(lista) ? lista : [];
}
