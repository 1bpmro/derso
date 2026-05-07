// features/admin.js

import { STATE } from "../core/state.js";
import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";

const getToken = () => localStorage.getItem("adminToken");

let graficoAdmin = null;

/* ====================================== */
export async function iniciarPainelAdmin() {
    try {
        console.log("🧠 Painel admin iniciado");

        window.__ADMIN_MODE__ = true;

        const token = getToken();

        if (!token) {
            alert("Sessão inválida.");
            location.reload();
            return;
        }

        if (!window.Chart) {
            await carregarChartJS();
        }

        const container = document.getElementById("formContent");
        if (!container) return;

        container.innerHTML = gerarHTMLAdmin();

        bindEventos();

        await carregarDadosGlobais();

    } catch (err) {
        console.error("💥 ERRO ADMIN:", err);
        registrarLog("ADMIN_ERRO", err.message, "ERRO");
    }
}

/* ====================================== */
function gerarHTMLAdmin() {
    return `
<div class="admin-wrapper" style="padding:20px;">

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2>🧠 Painel Administrativo</h2>
        <button id="btnAdminExit">🚪 SAIR</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:20px;">
        <div class="card"><strong>Total</strong><div id="countTotal">0</div></div>
        <div class="card"><strong>Mês</strong><div id="countMes">0</div></div>
        <div class="card"><strong>Push</strong><div id="countPush">0</div></div>
        <div class="card"><strong>Abertos</strong><div id="countAbertos">0</div></div>
        <div class="card"><strong>Ignorados</strong><div id="countIgnorados">0</div></div>
        <div class="card"><strong>Taxa</strong><div id="taxaResposta">0%</div></div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:20px;">
        <input id="adminSearch" placeholder="Pesquisar..." style="flex:1;">
        <select id="filterMes">
            <option value="">Mês atual</option>
            ${Array.from({ length: 12 }, (_, i) =>
                `<option value="${String(i + 1).padStart(2, "0")}">${i + 1}</option>`
            ).join("")}
        </select>
        <button id="btnAtualizar">🔄</button>
        <button id="btnExportCSV">📤</button>
    </div>

    <textarea id="pushMensagem" placeholder="Push..." style="width:100%;margin-bottom:10px;"></textarea>
    <button id="btnEnviarPush">📡 ENVIAR PUSH</button>

    <div style="overflow:auto;background:#fff;padding:10px;margin-top:15px;">
        <table width="100%">
            <thead>
                <tr><th>Policial</th><th>Folgas</th><th>Score</th></tr>
            </thead>
            <tbody id="adminTableBody"></tbody>
        </table>
    </div>

    <canvas id="canvasGraficoAdmin"></canvas>
</div>`;
}

/* ====================================== */
function bindEventos() {

    document.getElementById("btnAdminExit").onclick = () => location.reload();
    document.getElementById("btnAtualizar").onclick = carregarDadosGlobais;
    document.getElementById("btnExportCSV").onclick = exportarCSV;
    document.getElementById("btnEnviarPush").onclick = enviarPushManual;

    document.getElementById("adminSearch").oninput = filtrarPainel;
    document.getElementById("filterMes").onchange = carregarDadosGlobais;
}

/* ====================================== */
function carregarChartJS() {
    return new Promise(resolve => {
        if (window.Chart) return resolve();

        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js";
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
    });
}

/* ====================================== */
async function carregarDadosGlobais() {
    try {
        const token = getToken();
        const mes = document.getElementById("filterMes")?.value ||
            String(new Date().getMonth() + 1).padStart(2, "0");

        const [dadosResp, eventosResp] = await Promise.all([
            fetch(`${CONFIG.API_URL}?action=readall_admin&token=${token}&mes=${mes}`),
            fetch(`${CONFIG.API_URL}?action=push_eventos&token=${token}`)
        ]);

        const dados = await dadosResp.json();
        const eventos = await eventosResp.json();

        STATE.listaCompletaAdmin = Array.isArray(dados) ? dados : [];
        STATE.eventosPush = Array.isArray(eventos) ? eventos : [];

        calcularScore();

        renderizarTudo(STATE.listaCompletaAdmin);
        inicializarGrafico(STATE.listaCompletaAdmin);
        carregarPushStats();

    } catch (err) {
        console.error(err);
    }
}

/* ====================================== */
function calcularScore() {
    const map = {};
    (STATE.eventosPush || []).forEach(e => {
        if (!e.matricula) return;
        map[e.matricula] = map[e.matricula] || 0;
        if (e.status === "ABERTO") map[e.matricula]++;
        if (e.status === "IGNORADO") map[e.matricula]--;
    });
    STATE.scoreMap = map;
}

/* ====================================== */
function renderizarTudo(lista) {
    const tbody = document.getElementById("adminTableBody");
    if (!tbody) return;

    const agrupado = {};

    (lista || []).forEach(i => {
        const m = i.matricula || "N/A";
        agrupado[m] ||= { nome: i.nome, datas: [], total: 0 };
        agrupado[m].datas.push(i.data);
        agrupado[m].total++;
    });

    const res = Object.entries(agrupado);

    document.getElementById("countTotal").textContent = res.length;
    document.getElementById("countMes").textContent = lista.length;

    tbody.innerHTML = res.map(([mat, item]) => {
        const score = STATE.scoreMap?.[mat] || 0;

        return `
<tr>
<td>${item.nome}</td>
<td>${item.total}</td>
<td>${score}</td>
</tr>`;
    }).join("");
}

/* ====================================== */
function filtrarPainel() {
    const termo = document.getElementById("adminSearch")?.value.toLowerCase();
    const filtrado = STATE.listaCompletaAdmin.filter(i =>
        (i.nome || "").toLowerCase().includes(termo) ||
        String(i.matricula).includes(termo)
    );
    renderizarTudo(filtrado);
}

/* ====================================== */
async function enviarPushManual() {
    const msg = document.getElementById("pushMensagem").value;
    if (!msg) return;

    const token = getToken();

    await fetch(`${CONFIG.API_URL}?action=push_manual&mensagem=${encodeURIComponent(msg)}&token=${token}`);

    document.getElementById("pushMensagem").value = "";
}

/* ====================================== */
async function carregarPushStats() {
    try {
        const token = getToken();
        const r = await fetch(`${CONFIG.API_URL}?action=push_stats&token=${token}`);
        const s = await r.json();

        document.getElementById("countPush").textContent = s.enviados || 0;
        document.getElementById("countAbertos").textContent = s.abertos || 0;
        document.getElementById("countIgnorados").textContent = s.ignorados || 0;
        document.getElementById("taxaResposta").textContent = (s.taxa || 0) + "%";

    } catch (e) {
        console.error(e);
    }
}

/* ====================================== */
function inicializarGrafico(lista) {
    const ctx = document.getElementById("canvasGraficoAdmin");
    if (!ctx) return;

    const map = {};

    (lista || []).forEach(i => {
        const d = i.data?.split("/")[0];
        if (!d) return;
        map[d] = (map[d] || 0) + 1;
    });

    const labels = Object.keys(map).sort((a,b)=>a-b);
    const values = labels.map(l => map[l]);

    if (graficoAdmin) graficoAdmin.destroy();

    graficoAdmin = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{ data: values }]
        }
    });
}
