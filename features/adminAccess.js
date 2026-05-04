import { iniciarPainelAdmin } from "./admin.js";
import { CONFIG } from "../core/config.js"; // 🔥 FALTAVA ISSO

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

function abrirModalAdmin() {
    document.getElementById("adminLoginModal")?.classList.remove("is-hidden");
}

function fecharModalAdmin() {
    document.getElementById("adminLoginModal")?.classList.add("is-hidden");
}

async function validarAcessoAdmin() {
    const input = document.getElementById("adminMatricula");
    const matricula = input?.value.trim();

    if (!matricula) {
        alert("Digite a matrícula");
        return;
    }

    const senha = prompt("Digite a senha administrativa:");

    try {
        const resp = await fetch(
            `${CONFIG.API_URL}?action=adminlogin&matricula=${matricula}&senha=${senha}`
        );

        const dados = await resp.json();

        console.log("🔐 LOGIN:", dados);

        if (dados.autorizado && dados.token) {

            // 🔥 PADRONIZA O TOKEN
            localStorage.setItem("derso_session_token", dados.token);

            fecharModalAdmin();
            iniciarPainelAdmin();

        } else {
            alert("Credenciais inválidas.");
            input.value = "";
        }

    } catch (err) {
        console.error(err);
        alert("Erro ao conectar ao servidor.");
    }
}
