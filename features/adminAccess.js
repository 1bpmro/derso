// features/adminAccess.js

import { apiClient } from "../core/apiClient.js";

let emLogin = false;

export function configurarAdminPage() {

    const btnLogin = document.getElementById("btnLogin");
    const btnListar = document.getElementById("btnListar");
    const btnLogout = document.getElementById("btnLogout");

    btnLogin?.addEventListener("click", login);
    btnListar?.addEventListener("click", listarFuncionarios);
    btnLogout?.addEventListener("click", logout);

    abrirDashboardSeLogado();
}

/* =========================
   🔐 LOGIN
========================= */

async function login() {

    if (emLogin) return;
    emLogin = true;

    const matricula = document.getElementById("matricula")?.value?.trim();
    const senha = document.getElementById("senha")?.value?.trim();
    const erro = document.getElementById("erro");

    erro.innerText = "";

    if (!matricula || !senha) {
        erro.innerText = "Preencha matrícula e senha";
        emLogin = false;
        return;
    }

    try {
        const data = await apiClient.post("adminlogin", {
            matricula,
            senha
        });

        if (data?.autorizado) {

            localStorage.setItem("adminToken", data.token);
            localStorage.setItem("adminNome", data.nome);

            localStorage.removeItem("ADMIN_UNLOCK");

            abrirDashboard();

        } else {
            erro.innerText = "Login inválido";
        }

    } catch (err) {
        console.error(err);
        erro.innerText = "Erro ao conectar ao servidor";
    } finally {
        emLogin = false;
    }
}

/* =========================
   📊 DASHBOARD
========================= */

function abrirDashboard() {

    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");

    const nome = localStorage.getItem("adminNome");

    document.getElementById("boasVindas").innerHTML =
        `Bem-vindo, <b>${nome}</b>`;
}

function abrirDashboardSeLogado() {

    const token = localStorage.getItem("adminToken");

    if (token) {
        abrirDashboard();
    }
}

/* =========================
   👥 LISTAR FUNCIONÁRIOS
========================= */

async function listarFuncionarios() {

    try {
        const data = await apiClient.get("lista");

        let html = "";

        data.forEach(f => {
            html += `${f.nome} - ${f.matricula}<br>`;
        });

        document.getElementById("conteudo").innerHTML = html;

    } catch (err) {
        console.error(err);
        alert("Erro ao listar funcionários");
    }
}

/* =========================
   🚪 LOGOUT
========================= */

function logout() {
    localStorage.clear();
    location.href = "/";
}
