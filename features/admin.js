// features/admin.js

import { STATE } from "../core/state.js";
import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";

export async function iniciarPainelAdmin() {
    window.__ADMIN_MODE__ = true;
    
    if (!window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        document.head.appendChild(script);
    }

    const container = document.getElementById("formContent");
    container.innerHTML = `
        <div class="admin-wrapper">
            <div class="admin-header">
                <div>
                    <h3 style="margin:0; color:var(--azul-marinho);">📊 DASHBOARD INTELIGENTE</h3>
                    <small>Comportamento do Efetivo</small>
                </div>
                <button id="btnAdminExit" class="btn-exit">SAIR</button>
            </div>

            <div class="admin-stats">
                <div class="stat-box">
                    <span id="countTotal">0</span>
                    <label>Total de Pedidos</label>
                </div>
                <div class="stat-box" style="background: var(--sucesso-verde)">
                    <span id="countMes">0</span>
                    <label>Neste Mês</label>
                </div>
            </div>

            <!-- 🔥 STATS DE PUSH -->
            <div class="admin-stats">
                <div class="stat-box">
                    <span id="countPush">0</span>
                    <label>Push Enviados</label>
                </div>
                <div class="stat-box" style="background:#1A3C6E;color:white;">
                    <span id="countAbertos">0</span>
                    <label>Abertos</label>
                </div>
                <div class="stat-box" style="background:#C62828;color:white;">
                    <span id="countIgnorados">0</span>
                    <label>Ignorados</label>
                </div>
                <div class="stat-box" style="background:#FFD700;color:black;">
                    <span id="taxaResposta">0%</span>
                    <label>Taxa</label>
                </div>
            </div>

            <!-- 📡 PUSH MANUAL -->
            <div style="margin:20px 0;">
                <input id="pushMensagem" placeholder="Mensagem do push..." class="admin-input">
                <button id="btnEnviarPush" class="btn-export">📡 Enviar Push</button>
            </div>

            <div style="background:white; padding:15px; border-radius:12px; margin-bottom:20px;">
                <canvas id="chartFolgas" height="150"></canvas>
            </div>

            <div class="admin-tools">
                <input type="text" id="adminSearch" placeholder="🔍 Nome ou Matrícula..." class="admin-input">
                <select id="filterMes" class="admin-input" style="max-width:120px">
                    <option value="">Todos Meses</option>
                    <option value="01">Jan</option><option value="02">Fev</option>
                    <option value="03">Mar</option><option value="04">Abr</option>
                    <option value="05">Mai</option><option value="06">Jun</option>
                    <option value="07">Jul</option><option value="08">Ago</option>
                    <option value="09">Set</option><option value="10">Out</option>
                    <option value="11">Nov</option><option value="12">Dez</option>
                </select>
                <button id="btnExportCSV" class="btn-export">📥 CSV</button>
            </div>

            <div class="admin-table-scroll">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>MILITAR</th>
                            <th>DATA</th>
                            <th>TIPO</th>
                            <th>SCORE</th>
                        </tr>
                    </thead>
                    <tbody id="adminTableBody">
                        <tr><td colspan="4" style="text-align:center; padding:20px;">Sincronizando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("btnAdminExit").onclick = () => location.reload();
    document.getElementById("adminSearch").oninput = filtrarPainel;
    document.getElementById("filterMes").onchange = filtrarPainel;
    document.getElementById("btnExportCSV").onclick = exportarParaEscala;

    // 🔥 EVENTO DO PUSH MANUAL
    document.getElementById("btnEnviarPush").onclick = enviarPushManual;

    await carregarDadosGlobais();
}

/* ======================================
   🔥 CARREGA DADOS
====================================== */
async function carregarDadosGlobais() {
    try {
        const token = localStorage.getItem("derso_session_token");

        const [dadosResp, eventosResp] = await Promise.all([
            fetch(`${CONFIG.API_URL}?action=readall&token=${token}`),
            fetch(`${CONFIG.API_URL}?action=push_eventos&token=${token}`)
        ]);

        const dados = await dadosResp.json();
        const eventos = await eventosResp.json();

        if (dados.error) throw new Error(dados.error);

        STATE.listaCompletaAdmin = dados;
        STATE.eventosPush = eventos || [];

        calcularScore();
        renderizarTudo(dados);
        inicializarGrafico(dados);

        await carregarPushStats();

    } catch (err) {
        registrarLog("ADMIN_ERRO", err.message, "ERRO");
    }
}

/* ======================================
   📡 PUSH MANUAL
====================================== */
async function enviarPushManual() {
    const msg = document.getElementById("pushMensagem").value;

    if (!msg) return alert("Digite uma mensagem");

    try {
        await fetch(`${CONFIG.API_URL}?action=push_manual&mensagem=${encodeURIComponent(msg)}`);
        alert("Push enviado!");
    } catch (e) {
        alert("Erro ao enviar push");
    }
}

/* ======================================
   🔥 STATS
====================================== */
async function carregarPushStats() {
    try {
        const resp = await fetch(`${CONFIG.API_URL}?action=push_stats`);
        const stats = await resp.json();

        document.getElementById("countPush").textContent = stats.enviados;
        document.getElementById("countAbertos").textContent = stats.abertos;
        document.getElementById("countIgnorados").textContent = stats.ignorados;
        document.getElementById("taxaResposta").textContent = stats.taxa + "%";

    } catch (err) {
        registrarLog("ADMIN_PUSH", err.message, "ERRO");
    }
}

/* ======================================
   🧠 SCORE
====================================== */
function calcularScore() {
    const eventos = STATE.eventosPush || [];
    const scoreMap = {};

    eventos.forEach(ev => {
        if (!scoreMap[ev.matricula]) scoreMap[ev.matricula] = 0;

        if (ev.status === "ABERTO") scoreMap[ev.matricula] += 1;
        if (ev.status === "IGNORADO") scoreMap[ev.matricula] -= 1;
    });

    STATE.scoreMap = scoreMap;
}

function getBadge(score) {
    if (score >= 3) return "🟢";
    if (score >= 0) return "🟡";
    return "🔴";
}

/* ======================================
   📊 RENDER
====================================== */
function renderizarTudo(lista) {
    const tbody = document.getElementById("adminTableBody");

    document.getElementById("countTotal").textContent = lista.length;

    const mesAtual = (new Date().getMonth() + 1).toString().padStart(2, '0');

    document.getElementById("countMes").textContent =
        lista.filter(i => i.data.split('/')[1] === mesAtual).length;

    tbody.innerHTML = lista.map(item => {
        const score = STATE.scoreMap[item.matricula] || 0;
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

/* ======================================
   📈 GRÁFICO
====================================== */
function inicializarGrafico(dados) {
    const ctx = document.getElementById('chartFolgas').getContext('2d');

    const tipos = {};
    dados.forEach(d => tipos[d.folga] = (tipos[d.folga] || 0) + 1);

    if (window.meuGrafico) window.meuGrafico.destroy();

    window.meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(tipos),
            datasets: [{ data: Object.values(tipos) }]
        },
        options: {
            plugins: { legend: { display: false } }
        }
    });
}

/* ======================================
   🔍 FILTRO
====================================== */
function filtrarPainel() {
    const termo = document.getElementById("adminSearch").value.toLowerCase();
    const mes = document.getElementById("filterMes").value;

    const filtrados = STATE.listaCompletaAdmin.filter(i => {
        const bateTexto =
            i.nome.toLowerCase().includes(termo) ||
            i.matricula.includes(termo);

        const bateMes =
            mes === "" || i.data.split('/')[1] === mes;

        return bateTexto && bateMes;
    });

    renderizarTudo(filtrados);
}

/* ======================================
   📥 EXPORT
====================================== */
function exportarParaEscala() {
    const dados = STATE.listaCompletaAdmin;
    if (!dados || dados.length === 0) return;

    let csv = "\ufeffDATA;MATRICULA;NOME;TIPO_FOLGA;SCORE\n";

    dados.forEach(i => {
        const score = STATE.scoreMap[i.matricula] || 0;
        csv += `${i.data};${i.matricula};${i.nome};${i.folga};${score}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "derso_score.csv");
    link.click();
}
