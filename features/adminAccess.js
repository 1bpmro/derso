import { iniciarPainelAdmin } from "./admin.js";

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

    // Evento do botão ENTRAR
    const btnLogin = document.getElementById("btnAdminLogin");
    btnLogin?.addEventListener("click", validarAcessoAdmin);
}

function abrirModalAdmin() {
    const modal = document.getElementById("adminLoginModal");
    modal?.classList.remove("is-hidden");
}

function fecharModalAdmin() {
    const modal = document.getElementById("adminLoginModal");
    modal?.classList.add("is-hidden");
}

async function validarAcessoAdmin() {
    const input = document.getElementById("adminMatricula");
    const matricula = input?.value.trim();

    const senha = prompt("Digite a senha administrativa:");

    try {

        const resp = await fetch(
            `${CONFIG.API_URL}?action=adminlogin&matricula=${matricula}&senha=${senha}`
        );

        const dados = await resp.json();

        if (dados.autorizado) {

            localStorage.setItem("adminToken", dados.token);

            fecharModalAdmin();
            iniciarPainelAdmin();

        } else {
            alert("Credenciais inválidas.");
            input.value = "";
        }

    } catch (err) {
        alert("Erro ao conectar ao servidor.");
    }
}
