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

    // Corrigido: checa existência do elemento antes de usar
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
            localStorage.setItem("adminToken", data.token);

            // Corrigido: sanitiza nome antes de usar no HTML
            const nomeSeguro = sanitizarHTML(data.nome);
            localStorage.setItem("adminNome", nomeSeguro);

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
    document.getElementById("loginBox")?.classList.add("hidden");
    document.getElementById("dashboard")?.classList.remove("hidden");

    const nome = localStorage.getItem("adminNome") ?? "Admin";

    const boasVindas = document.getElementById("boasVindas");
    if (boasVindas) {
        // Nome já foi sanitizado no momento do save
        boasVindas.innerHTML = `Bem-vindo, <b>${nome}</b>`;
    }
}

function abrirDashboardSeLogado() {
    // Corrigido: usa canOpenAdmin() em vez de checar token diretamente
    if (canOpenAdmin()) {
        abrirDashboard();
    }
}

/* =========================
   👥 LISTAR FUNCIONÁRIOS
========================= */

async function listarFuncionarios() {
    const token = localStorage.getItem("adminToken");

    try {
        const data = await apiClient.get("lista", { token });

        const html = Array.isArray(data)
            ? data.map(f => `${f.nome} - ${f.matricula}<br>`).join("")
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
    // Corrigido: remove apenas os itens do admin, não tudo
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminNome");
    location.href = "/";
}
