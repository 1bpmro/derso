// features/admin.js (v2 refatorado e alinhado ao core/api)

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
       
       bindEventos();

        const ok = await carregarDados();

        if (ok) {
            adminStore.carregado = true;
            registrarLog("ADMIN", "Painel iniciado", "SUCESSO");
        }

        // Não expor via window — apenas registrar internamente
        // window.__ADMIN_MODE__ foi removido por segurança

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

        // Corrigido: token e mes como params, não embutidos na action string
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

        // Corrigido: mensagem como param, não embutida na action string
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
    $("export")?.addEventListener("click", exportCSV);
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
   📦 TABELA
====================================== */

function renderTabela(lista) {
    const tbody = document.getElementById("table");
    if (!tbody) return;

    tbody.innerHTML = lista.map(v => {
        const s = adminStore.scoreMap[v.matricula] ?? 0;

        const cor =
            s > 0 ? "#27ae60" :
            s < 0 ? "#e74c3c" :
            "#7f8c8d";

        return `
        <tr>
            <td>
                <b>${v.nome}</b><br>
                <small>${v.matricula}</small>
            </td>
            <td style="text-align:center;">
                ${v.total || 0}
            </td>
            <td style="text-align:center;color:${cor};font-weight:bold;">
                ${s}
            </td>
        </tr>`;
    }).join("");
}

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

    // Labels e dados extraídos da lista real
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
    return `<div>Admin carregado</div>`;
}
