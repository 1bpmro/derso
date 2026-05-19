// features/admin.js (v2.2 - Escopo corrigido e blindagem XSS ativa)

import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";
import { UI } from "../ui/manager.js";
import { apiClient } from "../core/apiClient.js";
import { isArrayValido } from "../core/utils.js";

/* ======================================
   🧠 STORE
====================================== */

const adminStore = {
    listaOriginal: [],
    eventosPush: [],
    scoreMap: {},
    grafico: null,
    carregado: false,
    processando: false
};

const getToken = () => localStorage.getItem("adminToken");

/* ======================================
   🛡️ SECURITY PROTECTION (XSS SANITIZER)
====================================== */

function escaperHTML(string) {
    return String(string || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ======================================
   🚀 INIT
====================================== */

export async function iniciarPainelAdmin() {
    if (adminStore.carregado || adminStore.processando) return;

    const container = document.getElementById("formContent");
    if (!container) return;

    try {
        adminStore.processando = true;

        container.innerHTML = loadingHTML();

        await garantirChartJS();

        container.innerHTML = gerarHTMLAdmin();
       
        bindEventos();

        const ok = await carregarDados();

        if (ok) {
            adminStore.carregado = true;
            registrarLog("ADMIN", "Painel iniciado", "SUCESSO");
        }

    } catch (err) {
        container.innerHTML = erroHTML(err.message);
        registrarLog("ADMIN_ERRO", err.message, "ERRO");
    } finally {
        adminStore.processando = false;
    }
}

/* ======================================
   📦 DADOS (VIA API CLIENT — params separados)
====================================== */

async function carregarDados() {
    const token = getToken();
    if (!token) throw new Error("Sessão inválida");

    const mes = document.getElementById("mes")?.value;

    try {
        UI.loading.show("Sincronizando painel...");

        const [dadosAdmin, eventosPush] = await Promise.all([
            apiClient.get("readall_admin", { token, mes }),
            apiClient.get("push_eventos", { token })
        ]);

        adminStore.listaOriginal = isArrayValido(dadosAdmin) ? dadosAdmin : [];
        adminStore.eventosPush = isArrayValido(eventosPush) ? eventosPush : [];

        processar();

        registrarLog(
            "ADMIN_SYNC",
            `Registros: ${adminStore.listaOriginal.length}`,
            "INFO"
        );

        return true;

    } catch (err) {
        UI.modal.show("ERRO", err.message, "❌", "red");
        registrarLog("ADMIN_SYNC_ERRO", err.message, "ERRO");
        return false;
    } finally {
        UI.loading.hide();
    }
}

/* ======================================
   ⚙️ PROCESSAMENTO
====================================== */

function processar() {
    calcularScore();
    renderTabela(adminStore.listaOriginal);
    renderChart(adminStore.listaOriginal);
    updateKPIs();
}

/* ======================================
   📊 SCORE
====================================== */

function calcularScore() {
    const map = {};

    for (const e of adminStore.eventosPush) {
        if (!e?.matricula) continue;

        const m = String(e.matricula);
        const status = String(e.status || "").toUpperCase();

        map[m] ??= 0;

        if (status === "ABERTO") map[m] += 1;
        if (status === "IGNORADO") map[m] -= 0.5;
    }

    adminStore.scoreMap = map;
}

/* ======================================
   📥 EXPORTAÇÃO CSV (Móvel p/ Raiz do Arquivo)
====================================== */

function exportCSV() {
    if (!adminStore.listaOriginal.length) {
        UI.modal.show("AVISO", "Nenhum dado para exportar.", "⚠️", "orange");
        return;
    }

    const linhas = [
        ["Matrícula", "Nome", "Total", "Score"],
        ...adminStore.listaOriginal.map(v => [
            v.matricula,
            v.nome,
            v.total || 0,
            adminStore.scoreMap[v.matricula] ?? 0
        ])
    ];

    const csv = linhas
        .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `derso_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/* ======================================
   📢 PUSH GLOBAL (via API CLIENT)
====================================== */

async function dispararPushGlobal() {
    const input = document.getElementById("pushMsg");
    const btn = document.getElementById("btnSendPush");

    if (!input || !btn) return;

    const mensagem = input.value.trim();
    if (!mensagem) {
        UI.modal.show("AVISO", "Digite mensagem", "⚠️", "orange");
        return;
    }

    const confirmar = confirm("Confirmar envio?");
    if (!confirmar) return;

    const token = getToken();

    try {
        btn.disabled = true;
        btn.textContent = "ENVIANDO...";

        const res = await apiClient.get("push_manual", {
            token,
            mensagem: encodeURIComponent(mensagem)
        });

        if (!res?.success) {
            throw new Error(res?.message || "Falha no envio");
        }

        input.value = "";

        UI.modal.show(
            "PUSH ENVIADO",
            `Alcançados: ${res.enviados || 0}`,
            "🚀",
            "#3498db"
        );

        await carregarDados();

    } catch (err) {
        UI.modal.show("ERRO", err.message, "❌", "red");
        registrarLog("ADMIN_PUSH_ERRO", err.message, "ERRO");
    } finally {
        btn.disabled = false;
        btn.textContent = "ENVIAR DISPARO";
    }
}

/* ======================================
   🎯 EVENTOS
====================================== */

function bindEventos() {
    const $ = (id) => document.getElementById(id);

    $("btnExit")?.addEventListener("click", sairPainel);
    $("refresh")?.addEventListener("click", carregarDados);
    $("export")?.addEventListener("click", exportCSV); // ✅ Agora mapeia sem falhas de escopo
    $("search")?.addEventListener("input", renderFiltrado);
    $("mes")?.addEventListener("change", carregarDados);
    $("btnSendPush")?.addEventListener("click", dispararPushGlobal);
}

function sairPainel() {
    localStorage.removeItem("adminToken");
    location.reload();
}

/* ======================================
   🔍 FILTRO
====================================== */

function renderFiltrado() {
    const termo = document.getElementById("search")?.value?.toLowerCase() ?? "";

    const filtrada = adminStore.listaOriginal.filter(v =>
        v.nome?.toLowerCase().includes(termo) ||
        String(v.matricula).includes(termo)
    );

    renderTabela(filtrada);
}

/* ======================================
   📦 TABELA (Blindagem XSS Injetada)
====================================== */

function renderTabela(lista) {
    const tbody = document.getElementById("table");
    if (!tbody) return;

    // Guardamos a lista filtrada atual na store para o clique saber quem é quem
    adminStore.listaFiltradaAtual = lista;

    tbody.innerHTML = lista.map((v, index) => {
        const s = adminStore.scoreMap[v.matricula] ?? 0;

        const cor =
            s > 0 ? "#27ae60" :
            s < 0 ? "#e74c3c" :
            "#7f8c8d";

        // ✅ Adicionado cursor:pointer e o evento abrirDetalhesMilitar
        return `
        <tr onclick="abrirDetalhesMilitar(${index})" style="cursor:pointer;" title="Clique para ver os dias solicitados">
            <td>
                <b>${escaperHTML(v.nome)}</b><br>
                <small>${escaperHTML(v.matricula)}</small>
            </td>
            <td style="text-align:center; font-weight:bold;">
                ${v.total || 0}
            </td>
            <td style="text-align:center;color:${cor};font-weight:bold;">
                ${s}
            </td>
        </tr>`;
    }).join("");
}

// 🗓️ [UX UPGRADE]: Abre os detalhes dos dias solicitados em um modal flutuante
window.abrirDetalhesMilitar = function(index) {
    const militar = adminStore.listaFiltradaAtual?.[index];
    if (!militar) return;

    // Se sua API manda os dias em uma string (ex: "05, 12, 19") ou array (ex: ["05", "12"])
    // Ajustamos aqui para exibir bonito. Altere 'v.dias' pelo nome correto do campo se for diferente!
    const diasSolicitados = militar.data || militar.detalhes || "Nenhum dia detalhado encontrado.";

    const corpoModal = `
        <div style="text-align:left; font-size:14px; line-height:1.5;">
            <p><b>Militar:</b> ${escaperHTML(militar.nome)}</p>
            <p><b>Matrícula:</b> ${escaperHTML(militar.matricula)}</p>
            <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
            <p><b>🗓️ Dias Solicitados neste mês:</b></p>
            <div style="background:#f8f9fa; padding:10px; border-radius:5px; font-family:monospace; font-size:15px; color:#2c3e50; text-align:center; border:1px solid #e2e8f0;">
                ${escaperHTML(diasSolicitados)}
            </div>
        </div>
    `;

    // Dispara o componente de UI padrão do DERSO
    UI.modal.show(
        "DETALHES DA SOLICITAÇÃO", 
        corpoModal, 
        "📋", 
        "var(--azul-marinho)"
    );
};

/* ======================================
   📊 KPI
====================================== */

function updateKPIs() {
    const total = adminStore.listaOriginal.length;
    const folgas = adminStore.listaOriginal.reduce((a, b) => a + (b.total || 0), 0);
    const enviados = adminStore.eventosPush.length;

    setText("kpiTotal", total);
    setText("kpiFolgas", folgas);
    setText("kpiPush", enviados);
}

function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
}

/* ======================================
   📈 CHART
====================================== */

async function garantirChartJS() {
    if (window.Chart) return;

    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

function renderChart(lista = []) {
    const canvas = document.getElementById("chart");
    if (!canvas || !window.Chart) return;

    adminStore.grafico?.destroy();

    const labels = lista.map(v => v.nome || v.matricula);
    const valores = lista.map(v => v.total || 0);

    adminStore.grafico = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Folgas",
                data: valores,
                borderColor: "#3498db",
                tension: 0.3,
                fill: false
            }]
        }
    });
}

/* ======================================
   🧾 UI HELPERS
====================================== */

function loadingHTML() {
    return `<div style="padding:40px;text-align:center;">Carregando...</div>`;
}

function erroHTML(msg) {
    return `<div style="padding:20px;color:red;">${msg}</div>`;
}

function gerarHTMLAdmin() {
    const mesAtual = new Date().getMonth() + 1;
    const opcoesMes = Array.from({ length: 12 }, (_, i) => {
        const v = String(i + 1).padStart(2, "0");
        const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
        return `<option value="${v}"${i + 1 === mesAtual ? " selected" : ""}>${nomes[i]}</option>`;
    }).join("");

    return `
    <div class="admin-wrapper">
        <div class="admin-header">
            <h3 style="margin:0;color:var(--azul-marinho)">📊 DERSO Admin</h3>
            <button class="btn-exit" id="btnExit">Sair</button>
        </div>

        <div class="admin-stats">
            <div class="stat-box"><span id="kpiTotal">—</span><label>Militares</label></div>
            <div class="stat-box"><span id="kpiFolgas">—</span><label>Solicitações</label></div>
            <div class="stat-box"><span id="kpiPush">—</span><label>Pushs enviados</label></div>
            <div class="stat-box" style="grid-column:span 1">
                <select id="mes" class="admin-input">${opcoesMes}</select>
                <label>Mês</label>
            </div>
        </div>

        <div class="admin-tools">
            <input id="search" class="admin-input" placeholder="Buscar militar...">
            <button class="btn-export" id="export">CSV</button>
            <button class="btn-export" id="refresh" style="background:#3498db">↻</button>
        </div>

        <div class="admin-tools" style="margin-bottom:15px">
            <input id="pushMsg" class="admin-input" placeholder="Mensagem push global...">
            <button class="btn-export" id="btnSendPush" style="background:#8e44ad;white-space:nowrap">
                ENVIAR DISPARO
            </button>
        </div>

        <div class="admin-table-scroll">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Militar</th>
                        <th style="text-align:center">Total</th>
                        <th style="text-align:center">Score</th>
                    </tr>
                </thead>
                <tbody id="table"></tbody>
            </table>
        </div>

        <canvas id="chart" style="margin-top:20px;max-width:100%"></canvas>
    </div>`;
}
