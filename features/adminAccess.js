// features/adminAccess.js

import { iniciarPainelAdmin } from "./admin.js";
import { apiClient } from "../core/apiClient.js";

let contadorCliques = 0;
let temporizador = null;
let emLogin = false;
let listenersAtivos = false;

const DEBUG = false;

// 🔐 janela de acesso ao admin (60s)
const ADMIN_KEY = "ADMIN_UNLOCK";

export function configurarAcessoAdmin() {

    if (listenersAtivos) return;
    listenersAtivos = true;

    const footer = document.getElementById("footerText");

    footer?.addEventListener("click", () => {

        contadorCliques++;

        clearTimeout(temporizador);

        temporizador = setTimeout(() => {
            contadorCliques = 0;
        }, 2000);

        if (contadorCliques >= 5) {
            contadorCliques = 0;

            // 🔑 libera acesso temporário
            localStorage.setItem(ADMIN_KEY, String(Date.now() + 60000));

            abrirAdmin();
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

function abrirAdmin() {
    // abre página protegida
    window.location.href = "/admin.html";
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
        const dados = await apiClient.post("adminlogin", {
            matricula,
            senha
        });

        if (DEBUG) console.log("LOGIN:", dados);

        if (dados?.autorizado && dados?.token?.length > 10) {

            localStorage.setItem("adminToken", dados.token);

            // 🔒 consome a chave de acesso
            localStorage.removeItem(ADMIN_KEY);

            fecharModalAdmin();

            await delay(150);

            await iniciarPainelAdmin();

        } else {
            alert("Credenciais inválidas.");
            input.value = "";
            input.focus();
        }

    } catch (err) {
        console.error(err);
        alert("Erro ao conectar ao servidor.");
    } finally {
        emLogin = false;
    }
}

function fecharModalAdmin() {
    document.getElementById("adminLoginModal")
        ?.classList.add("is-hidden");

    const input = document.getElementById("adminMatricula");
    if (input) input.value = "";
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}
