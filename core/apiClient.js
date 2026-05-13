import { CONFIG } from "./config.js";
import { registrarLog } from "../services/logger.js";

const DEFAULT_TIMEOUT = 10000;
const MAX_RETRY = 2;

async function request(url, options = {}, retry = 0) {

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

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

        registrarLog(
            "API",
            `Erro request: ${isTimeout ? "TIMEOUT" : err.message}`,
            "ERRO"
        );

        if (retry < MAX_RETRY) {
            return request(url, options, retry + 1);
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

    const query = new URLSearchParams({
        action,
        ...params
    });

    return request(`${CONFIG.API_URL}?${query.toString()}`);
}

/* =========================
   POST
========================= */

export function post(action, body = {}) {

    const formData = new FormData();
    formData.append("action", action);

    Object.entries(body).forEach(([k, v]) => {
        formData.append(k, v);
    });

    return request(CONFIG.API_URL, {
        method: "POST",
        body: formData
    });
}

export const apiClient = {
    get,
    post
};
