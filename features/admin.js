//features/admin.js

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
            <strong>Total Policiais</strong>
            <div id="countTotal">0</div>
        </div>

        <div class="card">
            <strong>Total Folgas</strong>
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
            placeholder="Pesquisar policial..."
            style="flex:1; min-width:200px;"
        >

        <select id="filterMes">
            <option value="">Mês Atual</option>
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

        <button id="btnAtualizar" class="btn btn-outline">
            🔄 Atualizar
        </button>

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
                    <th style="padding:10px;">Folgas</th>
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

        document.getElementById("btnAdminExit").onclick = () => {
            location.reload();
        };

        document.getElementById("btnAtualizar").onclick = () => {
            carregarDadosGlobais();
        };

        document.getElementById("adminSearch").oninput = filtrarPainel;

        document.getElementById("filterMes").onchange = () => {
            carregarDadosGlobais();
        };

        document.getElementById("btnExportCSV").onclick = exportarCSV;

        document.getElementById("btnEnviarPush").onclick = enviarPushManual;

        setTimeout(() => {
            carregarDadosGlobais();
        }, 100);

    } catch (err) {

        console.error("💥 ERRO iniciarPainelAdmin:", err);
        alert("Erro ao iniciar painel admin");

    }
}

/* ====================================== */
function carregarChartJS() {

    return new Promise((resolve) => {

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
            console.error("❌ Falha Chart.js");
            resolve();
        };

        document.head.appendChild(script);

    });

}

/* ====================================== */
async function carregarDadosGlobais() {

    try {

        const token = getToken();

        const mesSelecionado =
            document.getElementById("filterMes")?.value ||
            String(new Date().getMonth() + 1).padStart(2, "0");

        console.log("📅 MÊS:", mesSelecionado);

        const [dadosResp, eventosResp] = await Promise.all([

            fetch(
                `${CONFIG.API_URL}?action=readall_admin&token=${token}&mes=${mesSelecionado}`
            ),

            fetch(
                `${CONFIG.API_URL}?action=push_eventos&token=${token}`
            )

        ]);

        const dados = await dadosResp.json();
        const eventos = await eventosResp.json();

        console.log("📦 DADOS:", dados);
        console.log("📡 EVENTOS:", eventos);

        if (dados.error) {
            throw new Error(dados.error);
        }

        if (eventos.error) {
            throw new Error(eventos.error);
        }

        if (!Array.isArray(dados)) {
            throw new Error("Dados admin inválidos");
        }

        STATE.listaCompletaAdmin = dados;
        STATE.eventosPush = Array.isArray(eventos)
            ? eventos
            : [];

        calcularScore();

        renderizarTudo(dados);

        inicializarGrafico(dados);

        carregarPushStats();

    } catch (err) {

        console.error("🔥 ERRO ADMIN:", err);

        registrarLog(
            "ADMIN_ERRO",
            err.message,
            "ERRO"
        );

        alert("Erro ao carregar admin");

    }

}

/* ====================================== */
async function enviarPushManual() {

    const msg = document.getElementById("pushMensagem").value.trim();

    const token = getToken();

    if (!msg) {
        alert("Digite uma mensagem");
        return;
    }

    try {

        const resp = await fetch(
            `${CONFIG.API_URL}?action=push_manual&mensagem=${encodeURIComponent(msg)}&token=${token}`
        );

        const res = await resp.json();

        console.log("📡 PUSH:", res);

        if (res.error) {
            throw new Error(res.error);
        }

        alert("Push enviado!");

        document.getElementById("pushMensagem").value = "";

        carregarPushStats();

    } catch (err) {

        console.error("🔥 PUSH ERRO:", err);

        alert("Erro ao enviar push");

    }

}

/* ====================================== */
async function carregarPushStats() {

    try {

        const token = getToken();

        const resp = await fetch(
            `${CONFIG.API_URL}?action=push_stats&token=${token}`
        );

        const stats = await resp.json();

        console.log("📊 STATS:", stats);

        if (stats.error) {
            throw new Error(stats.error);
        }

        document.getElementById("countPush").textContent =
            stats.enviados || 0;

        document.getElementById("countAbertos").textContent =
            stats.abertos || 0;

        document.getElementById("countIgnorados").textContent =
            stats.ignorados || 0;

        document.getElementById("taxaResposta").textContent =
            `${stats.taxa || 0}%`;

    } catch (err) {

        console.error("🔥 STATS ERRO:", err);

    }

}

/* ====================================== */
function calcularScore() {

    const eventos = STATE.eventosPush || [];

    const scoreMap = {};

    eventos.forEach(ev => {

        if (!ev.matricula) return;

        if (!scoreMap[ev.matricula]) {
            scoreMap[ev.matricula] = 0;
        }

        if (ev.status === "ABERTO") {
            scoreMap[ev.matricula] += 1;
        }

        if (ev.status === "IGNORADO") {
            scoreMap[ev.matricula] -= 1;
        }

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

        tbody.innerHTML = `
            <tr>
                <td colspan="3">
                    Nenhum dado encontrado
                </td>
            </tr>
        `;

        return;

    }

    const agrupado = {};

    lista.forEach(item => {

        const mat = item.matricula || "SEM_MATRICULA";

        if (!agrupado[mat]) {

            agrupado[mat] = {
                nome: item.nome || "SEM NOME",
                matricula: mat,
                datas: [],
                total: 0
            };

        }

        agrupado[mat].datas.push(item.data || "-");

        agrupado[mat].total++;

    });

    const resultado = Object.values(agrupado);

    document.getElementById("countTotal").textContent =
        resultado.length;

    document.getElementById("countMes").textContent =
        lista.length;

    tbody.innerHTML = resultado.map(item => {

        const score =
            STATE.scoreMap?.[item.matricula] || 0;

        const badge = getBadge(score);

        return `
<tr>
    <td style="padding:10px;border-bottom:1px solid #eee;">
        <div style="font-weight:700;">
            ${item.nome}
        </div>

        <div style="font-size:11px;color:#777;">
            Mat: ${item.matricula}
        </div>
    </td>

    <td style="padding:10px;border-bottom:1px solid #eee;">
        <b>${item.total}x</b>

        <div style="
            font-size:11px;
            color:#666;
            margin-top:4px;
        ">
            ${item.datas.join(", ")}
        </div>
    </td>

    <td style="
        padding:10px;
        border-bottom:1px solid #eee;
        font-weight:700;
    ">
        ${score} ${badge}
    </td>
</tr>
`;

    }).join("");

}

/* ====================================== */
function filtrarPainel() {

    const termo =
        document.getElementById("adminSearch")
            .value
            .toLowerCase();

    const filtrado =
        STATE.listaCompletaAdmin.filter(item => {

            const nome =
                (item.nome || "").toLowerCase();

            const matricula =
                String(item.matricula || "");

            return (
                nome.includes(termo) ||
                matricula.includes(termo)
            );

        });

    renderizarTudo(filtrado);

}

/* ====================================== */
function exportarCSV() {

    try {

        const lista = STATE.listaCompletaAdmin || [];

        if (!lista.length) {
            alert("Sem dados");
            return;
        }

        let csv =
            "Nome,Matrícula,Data\n";

        lista.forEach(item => {

            csv += `"${item.nome}","${item.matricula}","${item.data}"\n`;

        });

        const blob = new Blob(
            [csv],
            { type: "text/csv;charset=utf-8;" }
        );

        const url = URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            `escala_admin.csv`;

        link.click();

    } catch (err) {

        console.error("🔥 CSV ERRO:", err);

        alert("Erro ao exportar");

    }

}

/* ====================================== */
function inicializarGrafico(lista) {

    try {

        const ctx =
            document.getElementById("graficoAdmin");

        if (!ctx) return;

        const agrupado = {};

        lista.forEach(item => {

            const dia =
                item.data?.split("/")[0];

            if (!dia) return;

            if (!agrupado[dia]) {
                agrupado[dia] = 0;
            }

            agrupado[dia]++;

        });

        const labels =
            Object.keys(agrupado);

        const valores =
            Object.values(agrupado);

        if (graficoAdmin) {
            graficoAdmin.destroy();
        }

        graficoAdmin = new Chart(ctx, {

            type: "bar",

            data: {

                labels,

                datasets: [{
                    label: "Folgas por Dia",
                    data: valores,
                    borderWidth: 1
                }]

            },

            options: {

                responsive: true,

                plugins: {

                    legend: {
                        display: true
                    }

                },

                scales: {

                    y: {
                        beginAtZero: true
                    }

                }

            }

        });

    } catch (err) {

        console.error("🔥 GRÁFICO ERRO:", err);

    }

}
