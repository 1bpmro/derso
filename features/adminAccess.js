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
let listenersAtivos = false;

const DEBUG = false;

/* ======================================
   🚪 SETUP ACESSO ADMIN
====================================== */

export function configurarAcessoAdmin() {

    if (listenersAtivos) return;
    listenersAtivos = true;

    const footer = document.getElementById("footerText");
    if (footer) {

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
    }

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
    document
        .getElementById("adminLoginModal")
        ?.classList.remove("is-hidden");

    setTimeout(() => {
        document
            .getElementById("adminMatricula")
            ?.focus();
    }, 120);
}

function fecharModalAdmin() {
    document
        .getElementById("adminLoginModal")
        ?.classList.add("is-hidden");

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

        const dados = await apiClient.post("adminlogin", {
            matricula,
            senha
        }, {
            signal: loginController.signal
        });

        if (DEBUG) console.log("LOGIN:", dados);

        if (dados?.autorizado && dados?.token?.length > 10) {

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
            console.error(err);
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
    return new Promise(r => setTimeout(r, ms));
}
