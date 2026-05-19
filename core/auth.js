// core/auth.js
// 🔐 SECURITY: Admin authentication with JWT-like tokens and session management

import { CONFIG } from "./config.js";
import { registrarLog } from "../services/logger.js";

/* ====================================== */
/* 🔐 SESSION CONSTANTS                   */
/* ====================================== */

const SESSION_KEY = "derso_admin_session";
const SESSION_TIMEOUT = CONFIG.ADMIN_SESSION_TIMEOUT;
const MAX_LOGIN_ATTEMPTS = CONFIG.MAX_LOGIN_ATTEMPTS;
const LOCKOUT_KEY = "derso_login_lockout";

/* ====================================== */
/* 🛡️ SESSION OBJECT                      */
/* ====================================== */

class AuthSession {
    constructor(matricula, timestamp = Date.now()) {
        this.matricula = matricula;
        this.created = timestamp;
        this.lastActivity = timestamp;
        this.token = this._generateToken();
    }

    _generateToken() {
        // Generate a cryptographically random token
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    isExpired() {
        const elapsed = Date.now() - this.created;
        return elapsed > SESSION_TIMEOUT;
    }

    updateActivity() {
        this.lastActivity = Date.now();
    }

    toJSON() {
        return {
            matricula: this.matricula,
            created: this.created,
            lastActivity: this.lastActivity,
            token: this.token
        };
    }

    static fromJSON(data) {
        const session = new AuthSession(data.matricula, data.created);
        session.lastActivity = data.lastActivity;
        session.token = data.token;
        return session;
    }
}

/* ====================================== */
/* ✅ VALIDAÇÃO DE LOGIN                  */
/* ====================================== */

export function isLockedOut() {
    const lockout = sessionStorage.getItem(LOCKOUT_KEY);
    if (!lockout) return false;

    const lockoutData = JSON.parse(lockout);
    const now = Date.now();

    if (now > lockoutData.until) {
        sessionStorage.removeItem(LOCKOUT_KEY);
        return false;
    }

    return true;
}

export function getLockoutTimeRemaining() {
    const lockout = sessionStorage.getItem(LOCKOUT_KEY);
    if (!lockout) return 0;

    const lockoutData = JSON.parse(lockout);
    const remaining = Math.ceil((lockoutData.until - Date.now()) / 1000);
    return Math.max(0, remaining);
}

function recordFailedAttempt() {
    let attempts = sessionStorage.getItem("derso_login_attempts");
    attempts = attempts ? parseInt(attempts) + 1 : 1;

    sessionStorage.setItem("derso_login_attempts", attempts);

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockoutUntil = Date.now() + CONFIG.LOGIN_LOCKOUT_TIME;
        sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify({ until: lockoutUntil }));
        registrarLog("AUTH", `Conta bloqueada após ${MAX_LOGIN_ATTEMPTS} tentativas`, "AVISO");
    }

    registrarLog("AUTH", `Falha na autenticação (tentativa ${attempts}/${MAX_LOGIN_ATTEMPTS})`, "AVISO");
}

function clearLoginAttempts() {
    sessionStorage.removeItem("derso_login_attempts");
}

/* ====================================== */
/* 🔐 SESSION MANAGEMENT                  */
/* ====================================== */

export function createSession(matricula) {
    if (!matricula) {
        throw new Error("Matrícula é obrigatória");
    }

    if (!/^\d{4,}$/.test(matricula.trim())) {
        throw new Error("Formato de matrícula inválido");
    }

    clearLoginAttempts();

    const session = new AuthSession(matricula);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session.toJSON()));

    registrarLog("AUTH", `Sessão criada para matrícula: [REDACTED]`, "SUCESSO");
    console.log("✅ Sessão administrativo criada");
}

export function hasAdminSession() {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    
    if (!sessionData) {
        return false;
    }

    try {
        const data = JSON.parse(sessionData);
        const session = AuthSession.fromJSON(data);

        if (session.isExpired()) {
            destroySession();
            registrarLog("AUTH", "Sessão expirada", "INFO");
            return false;
        }

        session.updateActivity();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session.toJSON()));
        return true;

    } catch (error) {
        console.error("Erro ao validar sessão:", error);
        destroySession();
        return false;
    }
}

export function getSession() {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    
    if (!sessionData) {
        return null;
    }

    try {
        const data = JSON.parse(sessionData);
        const session = AuthSession.fromJSON(data);

        if (session.isExpired()) {
            destroySession();
            return null;
        }

        return session;

    } catch (error) {
        console.error("Erro ao obter sessão:", error);
        return null;
    }
}

export function destroySession() {
    sessionStorage.removeItem(SESSION_KEY);
    registrarLog("AUTH", "Sessão destruída", "INFO");
    console.log("🔓 Sessão encerrada");
}

export function markLoginFailed() {
    recordFailedAttempt();
}

export function getSessionToken() {
    const session = getSession();
    return session ? session.token : null;
}

export { AuthSession };
