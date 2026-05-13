// features/adminAccess.js

import { iniciarPainelAdmin } from "./admin.js";
import { apiClient } from "../core/apiClient.js";

/* ======================================
   🧠 ESTADO LOCAL
====================================== */

let contadorCliques = 0;
let temporizador = null;
let loginController = null;
let emLogin = false;

const DEBUG = false;

/* ======================================
   🚪 SETUP ACESSO ADMIN
====================================== */

export function configurarAcessoAdmin() {

    const footer = document.getElementById("footerText");
    if (!footer) return;

    footer.addEventListener("click", () => {

        contadorCliques++;

        clearTimeout(temporizador);

        temporizador = setTimeout(() => {
            contadorCliques = 0;
        }, 2000);

        if (contadorCliques >= 5) {
            contadorCliques = 0;
            abrirModalAdmin();
        }
    });

    const btnLogin = document.getElementById("btnAdminLogin");

    btnLogin?.addEventListener("click", async () => {

        if (btnLogin.disabled || emLogin) return;

        btnLogin.disabled = true;

        try {
            await validarAcessoAdmin();
        } finally {
            btnLogin.disabled = false;
        }
    });
}

/* ======================================
   🪟 MODAL
====================================== */

function abrirModalAdmin() {
    const modal = document.getElementById("adminLoginModal");
    modal?.classList.remove("is-hidden");

    setTimeout(() => {
        document.getElementById("adminMatricula")?.focus();
    }, 120);
}

function fecharModalAdmin() {
    const modal = document.getElementById("adminLoginModal");
    modal?.classList.add("is-hidden");

    const input = document.getElementById("adminMatricula");
    if (input) input.value = "";
}

/* ======================================
   🔐 LOGIN ADMIN
====================================== */

async function validarAcessoAdmin() {

    if (emLogin) return;
    emLogin = true;

    const input = document.getElementById("adminMatricula");
    const matricula = input?.value?.trim();

    if (!matricula) {
        alert("Digite a matrícula");
        input?.focus();
        emLogin = false;
        return;
    }

    const senha = prompt("Digite a senha administrativa:");

    if (!senha) {
        alert("Senha não informada");
        emLogin = false;
        return;
    }

    try {
        loginController?.abort();
        loginController = new AbortController();

        const timeout = setTimeout(() => {
            loginController.abort();
        }, 10000);

        const dados = await apiClient.post("adminlogin", {
            matricula,
            senha
        }, {
            signal: loginController.signal
        });

        clearTimeout(timeout);

        if (DEBUG) {
            console.log("LOGIN RESPONSE:", dados);
        }

        if (
            dados?.autorizado &&
            typeof dados.token === "string" &&
            dados.token.length > 10
        ) {

            localStorage.setItem("adminToken", dados.token);

            fecharModalAdmin();

            await delay(150);
            await iniciarPainelAdmin();

        } else {
            alert("Credenciais inválidas.");
            input.value = "";
            input.focus();
        }

    } catch (err) {

        if (err.name === "AbortError") {
            alert("Servidor demorou para responder.");
        } else {
            console.error("LOGIN ERROR:", err);
            alert("Erro ao conectar ao servidor.");
        }

    } finally {
        emLogin = false;
    }
}

/* ======================================
   ⏳ HELPERS
====================================== */

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
