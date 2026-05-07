// features/admin.js

import { STATE } from "../core/state.js";
import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";

const getToken = () => localStorage.getItem("adminToken");

// Variável para a instância do Chart.js
let instanciaGraficoAdmin = null;

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

        // Carrega o Chart.js se ainda não existir
        if (!window.Chart) {
            await carregarChartJS();
        }

        const container = document.getElementById("formContent");
        if (!container) return;

        // Injeção do HTML
        container.innerHTML = `
<div class="admin-wrapper" style="padding:20px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:10px; flex-wrap:wrap;">
        <h2 style="margin:0;">🧠 Painel Administrativo</h2>
        <button id="btnAdminExit" class="btn btn-outline">🚪 SAIR</button>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; margin-bottom:20px;">
        <div class="card"><strong>Total Policiais</strong><div id="countTotal">0</div></div>
        <div class="card"><strong>Total Folgas</strong><div id="countMes">0</div></div>
        <div class="card"><strong>Push Enviados</strong><div id="countPush">0</div></div>
        <div class="card"><strong>Abertos</strong><div id="countAbertos">0</div></div>
        <div class="card"><strong>Ignorados</strong><div id="countIgnorados">0</div></div>
        <div class="card"><strong>Taxa</strong><div id="taxaResposta">0%</div></div>
    </div>

    <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
        <input type="text" id="adminSearch" placeholder="Pesquisar policial..." style="flex:1; min-width:200px;">
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
        <button id="btnAtualizar" class="btn btn-outline">🔄 Atualizar</button>
        <button id="btnExportCSV" class="btn btn-primary">📤 EXPORTAR</button>
    </div>

    <div style="margin-bottom:20px; display:flex; gap:10px; flex-wrap:wrap;">
        <textarea id="pushMensagem" placeholder="Mensagem push..." style="flex:1; min-height:80px; padding:10px; border-radius:8px; border:1px solid #ccc;"></textarea>
        <button id="btnEnviarPush" class="btn btn-primary" style="min-width:180px;">📡 ENVIAR PUSH</button>
    </div>

    <div style="overflow:auto; background:#fff; border-radius:12px; padding:10px;">
        <table style="width:100%; border-collapse:collapse;">
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

    <div style="margin-top:25px; background:#fff; border-radius:12px; padding:20px;">
        <canvas id="canvasGraficoAdmin"></canvas>
    </div>
</div>
`;

        console.log("✅ HTML ADMIN INSERIDO");

        // Pequena pausa para garantir que o DOM renderizou os novos IDs
        await new Promise(resolve => setTimeout(resolve, 50));

        // Atribuição de eventos protegida
        const ids = {
            "btnAdminExit": () => { localStorage.removeItem("adminToken"); location.reload(); },
            "btnAtualizar": carregarDadosGlobais,
            "btnExportCSV": exportarCSV,
            "btnEnviarPush": enviarPushManual
        };

        Object.entries(ids).forEach(([id, func]) => {
            const el = document.getElementById(id);
            if (el) el.onclick = func;
        });

        const searchInput = document.getElementById("adminSearch");
        if (searchInput) searchInput.oninput = filtrarPainel;

        const mesSelect = document.getElementById("filterMes");
        if (mesSelect) mesSelect.onchange = carregarDadosGlobais;

        // Carga inicial de dados
        carregarDadosGlobais();

    } catch (err) {
        console.error("💥 ERRO iniciarPainelAdmin:", err);
        alert("Erro ao iniciar painel admin");
    }
}

/* ====================================== */
function carregarChartJS() {
    return new Promise((resolve) => {
        if (window.Chart) return resolve();
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        script.onload = () => { console.log("📊 Chart.js carregado"); resolve(); };
        script.onerror = () => { console.error("❌ Falha Chart.js"); resolve(); };
        document.head.appendChild(script);
    });
}

/* ====================================== */
async function carregarDadosGlobais() {
    try {
        const token = getToken();
        const mesSelecionado = document.getElementById("filterMes")?.value || String(new Date().getMonth() + 1).padStart(2, "0");

        const [dadosResp, eventosResp] = await Promise.all([
            fetch(`${CONFIG.API_URL}?action=readall_admin&token=${token}&mes=${mesSelecionado}`),
            fetch(`${CONFIG.API_URL}?action=push_eventos&token=${token}`)
        ]);

        const dados = await dadosResp.json();
        const eventos = await eventosResp.json();

        if (dados.error || eventos.error) throw new Error(dados.error || eventos.error);

        STATE.listaCompletaAdmin = Array.isArray(dados) ? dados : [];
        STATE.eventosPush = Array.isArray(eventos) ? eventos : [];

        calcularScore();
        renderizarTudo(STATE.listaCompletaAdmin);
        inicializarGrafico(STATE.listaCompletaAdmin);
        carregarPushStats();

    } catch (err) {
        console.error("🔥 ERRO ADMIN:", err);
        registrarLog("ADMIN_ERRO", err.message, "ERRO");
    }
}

/* ====================================== */
async function enviarPushManual() {
    const msgEl = document.getElementById("pushMensagem");
    const msg = msgEl?.value.trim();
    const token = getToken();

    if (!msg) return alert("Digite uma mensagem");

    try {
        const resp = await fetch(`${CONFIG.API_URL}?action=push_manual&mensagem=${encodeURIComponent(msg)}&token=${token}`);
        const res = await resp.json();
        if (res.error) throw new Error(res.error);

        alert("Push enviado!");
        msgEl.value = "";
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
        const resp = await fetch(`${CONFIG.API_URL}?action=push_stats&token=${token}`);
        const stats = await resp.json();

        const map = {
            "countPush": stats.enviados,
            "countAbertos": stats.abertos,
            "countIgnorados": stats.ignorados,
            "taxaResposta": `${stats.taxa || 0}%`
        };

        Object.entries(map).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || 0;
        });
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
    if (!tbody) return;

    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="3">Nenhum dado encontrado</td></tr>`;
        return;
    }

    const agrupado = {};
    lista.forEach(item => {
        const mat = item.matricula || "SEM_MATRICULA";
        if (!agrupado[mat]) {
            agrupado[mat] = { nome: item.nome || "SEM NOME", matricula: mat, datas: [], total: 0 };
        }
        agrupado[mat].datas.push(item.data || "-");
        agrupado[mat].total++;
    });

    const resultado = Object.values(agrupado);
    document.getElementById("countTotal").textContent = resultado.length;
    document.getElementById("countMes").textContent = lista.length;

    tbody.innerHTML = resultado.map(item => {
        const score = STATE.scoreMap?.[item.matricula] || 0;
        return `
<tr>
    <td style="padding:10px;border-bottom:1px solid #eee;">
        <div style="font-weight:700;">${item.nome}</div>
        <div style="font-size:11px;color:#777;">Mat: ${item.matricula}</div>
    </td>
    <td style="padding:10px;border-bottom:1px solid #eee;">
        <b>${item.total}x</b>
        <div style="font-size:11px;color:#666;margin-top:4px;">${item.datas.join(", ")}</div>
    </td>
    <td style="padding:10px;border-bottom:1px solid #eee;font-weight:700;">
        ${score} ${getBadge(score)}
    </td>
</tr>`;
    }).join("");
}

/* ====================================== */
function filtrarPainel() {
    const termo = document.getElementById("adminSearch")?.value.toLowerCase();
    const filtrado = STATE.listaCompletaAdmin.filter(item => 
        (item.nome || "").toLowerCase().includes(termo) || String(item.matricula).includes(termo)
    );
    renderizarTudo(filtrado);
}

/* ====================================== */
function exportarCSV() {
    const lista = STATE.listaCompletaAdmin || [];
    if (!lista.length) return alert("Sem dados");

    let csv = "\ufeffNome,Matrícula,Data\n";
    lista.forEach(item => { csv += `"${item.nome}","${item.matricula}","${item.data}"\n`; });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `escala_admin.csv`;
    link.click();
}

/* ====================================== */
function inicializarGrafico(lista) {
    try {
        const ctx = document.getElementById("canvasGraficoAdmin");
        if (!ctx) return;

        const agrupado = {};
        lista.forEach(item => {
            const dia = item.data?.split("/")[0];
            if (dia) agrupado[dia] = (agrupado[dia] || 0) + 1;
        });

        const labels = Object.keys(agrupado).sort((a,b) => a-b);
        const valores = labels.map(l => agrupado[l]);

        if (instanciaGraficoAdmin) instanciaGraficoAdmin.destroy();

        instanciaGraficoAdmin = new Chart(ctx, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Folgas por Dia",
                    data: valores,
                    backgroundColor: "#3b82f6",
                    borderWidth: 0
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    } catch (err) {
        console.error("🔥 GRÁFICO ERRO:", err);
    }
}
