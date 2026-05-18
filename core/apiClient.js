// core/apiClient.js
import { CONFIG } from "./config.js";
import { registrarLog } from "../services/logger.js";
import { sleep } from "../core/utils.js";

const DEFAULT_TIMEOUT = CONFIG.TIMEOUT_FETCH;
const POST_TIMEOUT = CONFIG.TIMEOUT_POST;
const MAX_RETRY = CONFIG.RETRY_MAX;
const RETRY_DELAY_MS = CONFIG.RETRY_DELAY_MS;

async function request(url, options = {}, retry = 0) {
    const isPost = options.method === "POST";
    const timeout = isPost ? POST_TIMEOUT : DEFAULT_TIMEOUT;
    
    // 🆔 [MELHORIA GPT - ACHADO 3]: Gera um ID único para rastrear esta operação do início ao fim
    const requestId = Math.random().toString(36).substring(2, 8).toUpperCase();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    // Identifica qual action está sendo executada para enriquecer o log
    let actionIdentificada = "UNKNOWN_ACTION";
    try {
        if (isPost && options.body) {
            const parsedBody = JSON.parse(options.body);
            actionIdentificada = parsedBody.action || actionIdentificada;
        } else if (!isPost) {
            const urlObj = new URL(url);
            actionIdentificada = urlObj.searchParams.get("action") || actionIdentificada;
        }
    } catch { /* fallback silencioso */ }

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} (${response.statusText})`);
        }

        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            throw new Error("Resposta do servidor não é um JSON válido");
        }
    } catch (err) {
        const isTimeout = err.name === "AbortError";
        const isHttpError = err.message.startsWith("HTTP ");
        
        // 📊 [MELHORIA GPT - ACHADO 3/5]: Log ultra enriquecido com contexto e monitoramento de retries
        const sufixoRetry = retry < MAX_RETRY ? `-> Agendando tentativa ${retry + 2}/${MAX_RETRY + 1}` : "-> Esgotado!";
        const contextoErro = `[ID: ${requestId}][Action: ${actionIdentificada}] Falha (Tentativa ${retry + 1}/${MAX_RETRY + 1}): ${isTimeout ? "TIMEOUT" : err.message} ${sufixoRetry}`;

        registrarLog(
            "API_FAIL",
            contextoErro,
            "ERRO"
        );

        // Se não for erro HTTP definitivo e ainda tiver tentativas, tenta de novo
        if (!isHttpError && retry < MAX_RETRY) {
            await sleep(RETRY_DELAY_MS * (retry + 1));
            return request(url, options, retry + 1);
        }

        if (isTimeout) {
            throw new Error(`Timeout na requisição [Ref: ${requestId}]. O servidor demorou mais de ${timeout/1000}s para responder.`);
        }

        // Adiciona o ID de rastreio ao erro final para a UX saber exibir se quiser
        err.requestId = requestId;
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

/* =========================
   GET
========================= */
export function get(action, params = {}) {
    const query = new URLSearchParams({ action, ...params });
    return request(`${CONFIG.API_URL}?${query.toString()}`);
}

/* =========================
   POST (Blindado contra Erros de E-mail e Livre de CORS)
========================= */
export function post(action, body = {}) {
    // ✅ Mantemos o formato JSON que o seu GAS exige, mas usamos text/plain para burlar a checagem de CORS do navegador
    return request(CONFIG.API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
            action,
            ...body
        })
    });
}

/* =========================
   POST FORM
========================= */
export function postForm(formLike) {
    const body =
        formLike instanceof URLSearchParams ||
        formLike instanceof FormData
            ? formLike
            : new URLSearchParams(formLike || {});

    return request(CONFIG.API_URL, {
        method: "POST",
        body
    });
}

export const apiClient = { get, post, postForm };
