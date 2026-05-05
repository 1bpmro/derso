import { iniciarPainelAdmin } from "./admin.js";
import { CONFIG } from "../core/config.js";

let contadorCliques = 0;
let temporizador = null;

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
    btnLogin?.addEventListener("click", validarAcessoAdmin);
}

/* ====================================== */
function abrirModalAdmin() {
    document.getElementById("adminLoginModal")?.classList.remove("is-hidden");
}

/* ====================================== */
function fecharModalAdmin() {
    document.getElementById("adminLoginModal")?.classList.add("is-hidden");
}

/* ====================================== */
async function validarAcessoAdmin() {
    const input = document.getElementById("adminMatricula");
    const matricula = input?.value.trim();

    if (!matricula) {
        alert("Digite a matrícula");
        return;
    }

    const senha = prompt("Digite a senha administrativa:");

    if (!senha) {
        alert("Senha não informada");
        return;
    }

    try {
        const url = `${CONFIG.API_URL}?action=adminlogin&matricula=${encodeURIComponent(matricula)}&senha=${encodeURIComponent(senha)}`;

        console.log("🌐 URL LOGIN:", url);

        const resp = await fetch(url);

        if (!resp.ok) {
            throw new Error("Erro HTTP: " + resp.status);
        }

        const dados = await resp.json();

        console.log("🔐 LOGIN:", dados);

        if (dados.autorizado && dados.token) {

            // 🔥 limpa qualquer lixo antigo
            localStorage.removeItem("adminToken");

            // 🔥 salva token padrão
            localStorage.setItem("derso_session_token", dados.token);

            console.log("✅ TOKEN SALVO:", dados.token);

            fecharModalAdmin();

            // pequeno delay evita bug visual
            setTimeout(() => {
                iniciarPainelAdmin();
            }, 200);

        } else {
            alert("Credenciais inválidas.");
            input.value = "";
        }

    } catch (err) {
        console.error("🔥 ERRO LOGIN:", err);
        alert("Erro ao conectar ao servidor de autenticação.");
    }
}
