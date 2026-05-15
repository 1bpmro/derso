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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            throw new Error("Resposta não é JSON válido");
        }
    } catch (err) {
        const isTimeout = err.name === "AbortError";
        const isHttpError = err.message.startsWith("HTTP ");

        registrarLog(
            "API",
            `Erro request (tentativa ${retry + 1}): ${isTimeout ? "TIMEOUT" : err.message}`,
            "ERRO"
        );

        // Retry apenas para erros de rede/timeout, nunca para erros HTTP
        if (!isHttpError && retry < MAX_RETRY) {
            await sleep(RETRY_DELAY_MS * (retry + 1)); // backoff simples
            return request(url, options, retry + 1);
        }

        if (isTimeout) {
            throw new Error("Timeout na requisição");
        }

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
   POST
========================= */

export function post(action, body = {}) {

    const formData = new FormData();

    formData.append("action", action);

    Object.entries(body).forEach(([key, value]) => {
        formData.append(key, value);
    });

    return request(CONFIG.API_URL, {
        method: "POST",
        body: formData
    });
}

/* =========================
   POST FORM (sem action)
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
