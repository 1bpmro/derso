import { STATE } from "../core/state.js";
import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";

const getToken = () => localStorage.getItem("adminToken");

/* ====================================== */
export async function iniciarPainelAdmin() {

    try {

        console.log("🧠 Painel admin iniciado");

        window.__ADMIN_MODE__ = true;

        const token = getToken();

        console.log("🧪 TOKEN:", token);

        if (!token) {
            alert("Sessão inválida. Faça login novamente.");
            location.reload();
            return;
        }

        if (!window.Chart) {
            await carregarChartJS();
        }

        const container = document.getElementById("formContent");

      container.innerHTML = `
<div class="admin-wrapper" style="padding:20px;">

    <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:20px;
        gap:10px;
        flex-wrap:wrap;
    ">
        <h2 style="margin:0;">🧠 Painel Administrativo</h2>

        <button id="btnAdminExit" class="btn btn-outline">
            🚪 SAIR
        </button>
    </div>

    <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
        gap:10px;
        margin-bottom:20px;
    ">
        <div class="card">
            <strong>Total</strong>
            <div id="countTotal">0</div>
        </div>

        <div class="card">
            <strong>Mês Atual</strong>
            <div id="countMes">0</div>
        </div>

        <div class="card">
            <strong>Push Enviados</strong>
            <div id="countPush">0</div>
        </div>

        <div class="card">
            <strong>Abertos</strong>
            <div id="countAbertos">0</div>
        </div>

        <div class="card">
            <strong>Ignorados</strong>
            <div id="countIgnorados">0</div>
        </div>

        <div class="card">
            <strong>Taxa</strong>
            <div id="taxaResposta">0%</div>
        </div>
    </div>

    <div style="
        display:flex;
        gap:10px;
        margin-bottom:20px;
        flex-wrap:wrap;
    ">
        <input
            type="text"
            id="adminSearch"
            placeholder="Pesquisar..."
            style="flex:1; min-width:200px;"
        >

        <select id="filterMes">
            <option value="">Todos os meses</option>
            <option value="01">Janeiro</option>
            <option value="02">Fevereiro</option>
            <option value="03">Março</option>
            <option value="04">Abril</option>
            <option value="05">Maio</option>
            <option value="06">Junho</option>
            <option value="07">Julho</option>
            <option value="08">Agosto</option>
            <option value="09">Setembro</option>
            <option value="10">Outubro</option>
            <option value="11">Novembro</option>
            <option value="12">Dezembro</option>
        </select>

        <button id="btnExportCSV" class="btn btn-primary">
            📤 EXPORTAR
        </button>
    </div>

    <div style="
        margin-bottom:20px;
        display:flex;
        gap:10px;
        flex-wrap:wrap;
    ">
        <textarea
            id="pushMensagem"
            placeholder="Mensagem push..."
            style="
                flex:1;
                min-height:80px;
                padding:10px;
                border-radius:8px;
                border:1px solid #ccc;
            "
        ></textarea>

        <button
            id="btnEnviarPush"
            class="btn btn-primary"
            style="min-width:180px;"
        >
            📡 ENVIAR PUSH
        </button>
    </div>

    <div style="
        overflow:auto;
        background:#fff;
        border-radius:12px;
        padding:10px;
    ">
        <table style="
            width:100%;
            border-collapse:collapse;
        ">
            <thead>
                <tr style="background:#f2f2f2;">
                    <th style="padding:10px;">Policial</th>
                    <th style="padding:10px;">Data</th>
                    <th style="padding:10px;">Folga</th>
                    <th style="padding:10px;">Score</th>
                </tr>
            </thead>

            <tbody id="adminTableBody"></tbody>
        </table>
    </div>

    <div style="
        margin-top:25px;
        background:#fff;
        border-radius:12px;
        padding:20px;
    ">
        <canvas id="graficoAdmin"></canvas>
    </div>

</div>
`;

        console.log("✅ HTML ADMIN INSERIDO");

        console.log("btnAdminExit", !!document.getElementById("btnAdminExit"));
        console.log("adminSearch", !!document.getElementById("adminSearch"));
        console.log("filterMes", !!document.getElementById("filterMes"));
        console.log("btnExportCSV", !!document.getElementById("btnExportCSV"));
        console.log("btnEnviarPush", !!document.getElementById("btnEnviarPush"));

        console.log("filtrarPainel", typeof filtrarPainel);
        console.log("exportarParaEscala", typeof exportarParaEscala);
        console.log("inicializarGrafico", typeof inicializarGrafico);

        document.getElementById("btnAdminExit").onclick = () => location.reload();

        if (typeof filtrarPainel === "function") {
            document.getElementById("adminSearch").oninput = filtrarPainel;
            document.getElementById("filterMes").onchange = filtrarPainel;
        }

        if (typeof exportarParaEscala === "function") {
            document.getElementById("btnExportCSV").onclick = exportarParaEscala;
        }

        document.getElementById("btnEnviarPush").onclick = enviarPushManual;

        setTimeout(() => {
            carregarDadosGlobais();
        }, 100);

    } catch (err) {

        console.error("💥 ERRO iniciarPainelAdmin:", err);

    }
}

/* ====================================== */
function carregarChartJS() {
    return new Promise((resolve) => {

        // 🔥 evita duplicar
        if (window.Chart) {
            resolve();
            return;
        }

        const script = document.createElement("script");

        script.src = "https://cdn.jsdelivr.net/npm/chart.js";

       script.onload = () => {
    console.log("📊 Chart.js carregado");
    resolve();
};

script.onerror = () => {
    console.error("❌ Falha ao carregar Chart.js");
    resolve(); // evita travar o painel
};

        document.head.appendChild(script);
    });
}

/* ====================================== */
async function carregarDadosGlobais() {
    try {
       const token = getToken();

console.log("🧪 TOKEN RECUPERADO:", token);

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
        if (typeof inicializarGrafico === "function") {
    inicializarGrafico(dados);
}

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
