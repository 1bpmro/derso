import { STATE } from "../core/state.js";
import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";

const getToken = () => localStorage.getItem("derso_session_token");

/* ====================================== */
export async function iniciarPainelAdmin() {
    window.__ADMIN_MODE__ = true;

    const token = getToken();

    if (!token) {
        alert("Sessão inválida. Faça login novamente.");
        location.reload();
        return;
    }

    // 🔥 garante Chart carregado antes de usar
    if (!window.Chart) {
        await carregarChartJS();
    }

    const container = document.getElementById("formContent");

    container.innerHTML = `...`; // mantém seu HTML igual

    document.getElementById("btnAdminExit").onclick = () => location.reload();
    document.getElementById("adminSearch").oninput = filtrarPainel;
    document.getElementById("filterMes").onchange = filtrarPainel;
    document.getElementById("btnExportCSV").onclick = exportarParaEscala;
    document.getElementById("btnEnviarPush").onclick = enviarPushManual;

    await carregarDadosGlobais();
}

/* ====================================== */
function carregarChartJS() {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

/* ====================================== */
async function carregarDadosGlobais() {
    try {
        const token = getToken();

        console.log("🔑 TOKEN USADO:", token);

        const [dadosResp, eventosResp] = await Promise.all([
            fetch(`${CONFIG.API_URL}?action=readall&token=${token}`),
            fetch(`${CONFIG.API_URL}?action=push_eventos&token=${token}`)
        ]);

        const dados = await dadosResp.json();
        const eventos = await eventosResp.json();

        console.log("📦 DADOS:", dados);
        console.log("📡 EVENTOS:", eventos);

        // 🔥 validação forte
        if (dados.error) throw new Error(dados.error);
        if (eventos.error) throw new Error(eventos.error);

        if (!Array.isArray(dados)) {
            throw new Error("Formato inválido em readall");
        }

        if (!Array.isArray(eventos)) {
            console.warn("⚠️ Eventos não é array, corrigindo...");
        }

        STATE.listaCompletaAdmin = dados;
        STATE.eventosPush = Array.isArray(eventos) ? eventos : [];

        calcularScore();
        renderizarTudo(dados);
        inicializarGrafico(dados);

        await carregarPushStats();

    } catch (err) {
        console.error("🔥 ERRO ADMIN:", err);
        registrarLog("ADMIN_ERRO", err.message, "ERRO");
        alert("Erro ao carregar dados do admin.");
    }
}

/* ====================================== */
async function enviarPushManual() {
    const msg = document.getElementById("pushMensagem").value;
    const token = getToken();

    if (!msg) return alert("Digite uma mensagem");
    if (!token) return alert("Sessão expirada");

    try {
        const resp = await fetch(
            `${CONFIG.API_URL}?action=push_manual&mensagem=${encodeURIComponent(msg)}&token=${token}`
        );

        const res = await resp.json();

        if (res.error) throw new Error(res.error);

        alert("Push enviado!");
        document.getElementById("pushMensagem").value = "";

    } catch (e) {
        console.error("🔥 PUSH ERRO:", e);
        alert("Erro ao enviar push");
    }
}

/* ====================================== */
async function carregarPushStats() {
    try {
        const token = getToken();

        const resp = await fetch(`${CONFIG.API_URL}?action=push_stats&token=${token}`);
        const stats = await resp.json();

        if (stats.error) throw new Error(stats.error);

        document.getElementById("countPush").textContent = stats.enviados || 0;
        document.getElementById("countAbertos").textContent = stats.abertos || 0;
        document.getElementById("countIgnorados").textContent = stats.ignorados || 0;
        document.getElementById("taxaResposta").textContent = (stats.taxa || 0) + "%";

    } catch (err) {
        console.error("🔥 STATS ERRO:", err);
        registrarLog("ADMIN_PUSH", err.message, "ERRO");
    }
}

/* ====================================== */
function calcularScore() {
    const eventos = STATE.eventosPush;
    const scoreMap = {};

    if (!Array.isArray(eventos)) return;

    eventos.forEach(ev => {
        if (!ev.matricula) return;

        if (!scoreMap[ev.matricula]) scoreMap[ev.matricula] = 0;

        if (ev.status === "ABERTO") scoreMap[ev.matricula] += 1;
        if (ev.status === "IGNORADO") scoreMap[ev.matricula] -= 1;
    });

    STATE.scoreMap = scoreMap;
}

/* ====================================== */
function getBadge(score) {
    if (score >= 3) return "🟢";
    if (score >= 0) return "🟡";
    return "🔴";
}

/* ====================================== */
function renderizarTudo(lista) {
    const tbody = document.getElementById("adminTableBody");

    if (!Array.isArray(lista)) {
        tbody.innerHTML = `<tr><td colspan="4">Erro ao carregar dados</td></tr>`;
        return;
    }

    document.getElementById("countTotal").textContent = lista.length;

    const mesAtual = (new Date().getMonth() + 1).toString().padStart(2, '0');

    document.getElementById("countMes").textContent =
        lista.filter(i => i.data?.split('/')[1] === mesAtual).length;

    tbody.innerHTML = lista.map(item => {
        const score = STATE.scoreMap?.[item.matricula] || 0;
        const badge = getBadge(score);

        return `
        <tr>
            <td>
                <div style="font-weight:700;">${item.nome}</div>
                <div style="font-size:10px;">Mat: ${item.matricula}</div>
            </td>
            <td>${item.data}</td>
            <td>${item.folga}</td>
            <td><b>${score}</b> ${badge}</td>
        </tr>
        `;
    }).join("");
}
