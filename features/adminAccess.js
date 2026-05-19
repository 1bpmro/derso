// features/adminAccess.js

import { apiClient } from "../core/apiClient.js";
import { canOpenAdmin } from "../core/adminGuard.js";
import { sanitizarHTML } from "../core/utils.js";

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

    if (!erro) {
        console.warn("⚠️ Elemento #erro não encontrado");
        emLogin = false;
        return;
    }

    erro.innerText = "";

    if (!matricula || !senha) {
        erro.innerText = "Preencha matrícula e senha";
        emLogin = false;
        return;
    }

    try {
        const data = await apiClient.post("adminlogin", { matricula, senha });

        if (data?.autorizado) {
            // ✅ Persistência em sessionStorage (segurança contra sessão grudada)
            sessionStorage.setItem("adminToken", data.token);

            // ✅ Sanitização rigorosa antes do armazenamento
            const nomeSeguro = sanitizarHTML(data.nome);
            sessionStorage.setItem("adminNome", nomeSeguro);

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
    document.getElementById("loginBox")?.classList.add("hidden");
    document.getElementById("dashboard")?.classList.remove("hidden");

    // ✅ Leitura segura via sessionStorage
    const nome = sessionStorage.getItem("adminNome") ?? "Admin";

    const boasVindas = document.getElementById("boasVindas");
    if (boasVindas) {
        boasVindas.innerHTML = `Bem-vindo, <b>${nome}</b>`;
    }
}

function abrirDashboardSeLogado() {
    if (canOpenAdmin()) {
        abrirDashboard();
    }
}

/* =========================
   👥 LISTAR FUNCIONÁRIOS
========================= */

async function listarFuncionarios() {
    // ✅ Token recuperado da sessão volátil
    const token = sessionStorage.getItem("adminToken");

    try {
        const data = await apiClient.get("lista", { token });

        // ✅ Sanitização de cada entrada para evitar XSS injetado na base de dados
        const html = Array.isArray(data)
            ? data.map(f => `${sanitizarHTML(f?.nome ?? "")} - ${sanitizarHTML(f?.matricula ?? "")}<br>`).join("")
            : "Nenhum resultado.";

        const conteudo = document.getElementById("conteudo");
        if (conteudo) conteudo.innerHTML = html;

    } catch (err) {
        console.error(err);
        alert("Erro ao listar funcionários");
    }
}

/* =========================
   🚪 LOGOUT
========================= */

function logout() {
    // ✅ Limpeza dupla para garantir remoção total em ambos os locais
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminNome");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminNome");
    
    location.href = "/";
}
