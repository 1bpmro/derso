// features/admin.js (v2 refatorado e alinhado ao core/api)

import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";
import { UI } from "../ui/manager.js";
import { apiClient } from "../core/api.js";

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

        bindEventos();

        await carregarDados();

        adminStore.carregado = true;
        window.__ADMIN_MODE__ = true;

        registrarLog("ADMIN", "Painel iniciado", "SUCESSO");

    } catch (err) {
        container.innerHTML = erroHTML(err.message);

        registrarLog("ADMIN_ERRO", err.message, "ERRO");
    } finally {
        adminStore.processando = false;
    }
}

/* ======================================
   📦 DADOS (AGORA VIA API CLIENT)
====================================== */

async function carregarDados() {
    const token = getToken();
    if (!token) throw new Error("Sessão inválida");

    const mes = document.getElementById("mes")?.value;

    try {
        UI.loading.show("Sincronizando painel...");

        const [dadosAdmin, eventosPush] = await Promise.all([
            apiClient.get(`readall_admin&token=${token}&mes=${mes}`),
            apiClient.get(`push_eventos&token=${token}`)
        ]);

        adminStore.listaOriginal = Array.isArray(dadosAdmin)
            ? dadosAdmin
            : [];

        adminStore.eventosPush = Array.isArray(eventosPush)
            ? eventosPush
            : [];

        processar();

        registrarLog(
            "ADMIN_SYNC",
            `Registros: ${adminStore.listaOriginal.length}`,
            "INFO"
        );

    } catch (err) {
        UI.modal.show(
            "ERRO",
            err.message,
            "❌",
            "red"
        );
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

        const res = await apiClient.get(
            `push_manual&token=${token}&mensagem=${encodeURIComponent(mensagem)}`
        );

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
   📦 RESTO (mantido, mas já consistente)
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
   📈 CHART (inalterado estruturalmente)
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

function renderChart() {
    const canvas = document.getElementById("chart");
    if (!canvas || !window.Chart) return;

    adminStore.grafico?.destroy();

    adminStore.grafico = new Chart(canvas, {
        type: "line",
        data: { labels: [], datasets: [] }
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
