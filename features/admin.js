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
            alert("Sessão inválida. Faça login novamente.");
            location.reload();
            return;
        }

        if (!window.Chart) {
            await carregarChartJS();
        }

        const container = document.getElementById("formContent");
        if (!container) return;

        // Injeta o HTML estruturado
        container.innerHTML = gerarHTMLAdmin();

        // Vincula os cliques aos elementos recém-criados
        bindEventos();

        // Carrega os dados iniciais
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
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:10px;">
        <h2 style="margin:0;">🧠 Painel Administrativo</h2>
        <button id="btnAdminExit" class="btn btn-outline" style="width:auto;">🚪 SAIR</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:20px;">
        <div class="card"><strong>Total</strong><div id="countTotal">0</div></div>
        <div class="card"><strong>Folgas</strong><div id="countMes">0</div></div>
        <div class="card"><strong>Push</strong><div id="countPush">0</div></div>
        <div class="card"><strong>Abertos</strong><div id="countAbertos">0</div></div>
        <div class="card"><strong>Ignorados</strong><div id="countIgnorados">0</div></div>
        <div class="card"><strong>Taxa</strong><div id="taxaResposta">0%</div></div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
        <input id="adminSearch" type="text" placeholder="Pesquisar policial..." style="flex:1;min-width:200px;padding:8px;border-radius:5px;border:1px solid #ccc;">
        <select id="filterMes" style="padding:8px;border-radius:5px;">
            <option value="">Mês atual</option>
            ${Array.from({ length: 12 }, (_, i) => {
                const m = String(i + 1).padStart(2, "0");
                return `<option value="${m}">${m}</option>`;
            }).join("")}
        </select>
        <button id="btnAtualizar" class="btn btn-outline" style="width:auto;">🔄</button>
        <button id="btnExportCSV" class="btn btn-primary" style="width:auto;">📤 EXPORTAR</button>
    </div>

    <div style="margin-bottom:20px; border: 1px solid #eee; padding: 15px; border-radius: 8px; background: #f9f9f9;">
        <textarea id="pushMensagem" placeholder="Digite a mensagem para todos os policiais..." style="width:100%;min-height:60px;margin-bottom:10px;padding:10px;border-radius:5px;border:1px solid #ccc;"></textarea>
        <button id="btnEnviarPush" class="btn btn-primary">📡 ENVIAR PUSH AGORA</button>
    </div>

    <div style="overflow:auto;background:#fff;padding:15px;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,0.05);">
        <table width="100%" style="border-collapse:collapse;">
            <thead>
                <tr style="border-bottom:2px solid #eee; text-align:left;">
                    <th style="padding:10px;">Policial</th>
                    <th style="padding:10px; text-align:center;">Folgas</th>
                    <th style="padding:10px; text-align:center;">Score</th>
                </tr>
            </thead>
            <tbody id="adminTableBody"></tbody>
        </table>
    </div>

    <div style="margin-top:20px; background:#fff; padding:15px; border-radius:8px;">
        <canvas id="canvasGraficoAdmin"></canvas>
    </div>
</div>`;
}

/* ====================================== */
function bindEventos() {
    const doc = (id) => document.getElementById(id);

    if (doc("btnAdminExit")) doc("btnAdminExit").onclick = () => { localStorage.removeItem("adminToken"); location.reload(); };
    if (doc("btnAtualizar")) doc("btnAtualizar").onclick = carregarDadosGlobais;
    if (doc("btnExportCSV")) doc("btnExportCSV").onclick = exportarCSV;
    if (doc("btnEnviarPush")) doc("btnEnviarPush").onclick = enviarPushManual;
    
    if (doc("adminSearch")) doc("adminSearch").oninput = filtrarPainel;
    if (doc("filterMes")) doc("filterMes").onchange = carregarDadosGlobais;
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
        const mes = document.getElementById("filterMes")?.value || String(new Date().getMonth() + 1).padStart(2, "0");

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
        console.error("Erro ao carregar dados:", err);
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
        if (!agrupado[m]) agrupado[m] = { nome: i.nome, total: 0 };
        agrupado[m].total++;
    });

    const res = Object.entries(agrupado);
    document.getElementById("countTotal").textContent = res.length;
    document.getElementById("countMes").textContent = lista.length;

    tbody.innerHTML = res.map(([mat, item]) => {
        const score = STATE.scoreMap?.[mat] || 0;
        const corScore = score > 0 ? "green" : (score < 0 ? "red" : "#777");
        return `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px;"><strong>${item.nome}</strong><br><small style="color:#999">${mat}</small></td>
            <td style="padding:10px; text-align:center;">${item.total}</td>
            <td style="padding:10px; text-align:center; color:${corScore}; font-weight:bold;">${score}</td>
        </tr>`;
    }).join("");
}

/* ====================================== */
function filtrarPainel() {
    const termo = document.getElementById("adminSearch")?.value.toLowerCase();
    const filtrado = STATE.listaCompletaAdmin.filter(i =>
        (i.nome || "").toLowerCase().includes(termo) || String(i.matricula).includes(termo)
    );
    renderizarTudo(filtrado);
}

/* ====================================== */
function exportarCSV() {
    try {
        const lista = STATE.listaCompletaAdmin || [];
        if (!lista.length) return alert("Nenhum dado disponível para exportar.");

        let csv = "\ufeffNome,Matricula,Data\n";
        lista.forEach(i => {
            csv += `"${i.nome}","${i.matricula}","${i.data}"\n`;
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relatorio_admin_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        
        registrarLog("ADMIN", "Exportou CSV da escala", "INFO");
    } catch (err) {
        console.error("Erro no CSV:", err);
    }
}

/* ====================================== */
async function enviarPushManual() {
    const msgInput = document.getElementById("pushMensagem");
    const msg = msgInput.value.trim();
    if (!msg) return alert("Digite uma mensagem!");

    const token = getToken();
    try {
        const resp = await fetch(`${CONFIG.API_URL}?action=push_manual&mensagem=${encodeURIComponent(msg)}&token=${token}`);
        const res = await resp.json();
        
        if (res.error) throw new Error(res.error);

        alert("📡 Push enviado com sucesso!");
        msgInput.value = "";
        carregarPushStats();
    } catch (err) {
        alert("Erro ao enviar push.");
    }
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
        console.error("Erro stats:", e);
    }
}

/* ====================================== */
function inicializarGrafico(lista) {
    const ctx = document.getElementById("canvasGraficoAdmin");
    if (!ctx) return;

    const map = {};
    (lista || []).forEach(i => {
        const d = i.data?.split("/")[0];
        if (d) map[d] = (map[d] || 0) + 1;
    });

    const labels = Object.keys(map).sort((a,b)=>a-b);
    const values = labels.map(l => map[l]);

    if (graficoAdmin) graficoAdmin.destroy();

    graficoAdmin = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{ 
                label: "Folgas por Dia",
                data: values, 
                backgroundColor: "#2c3e50" 
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}
