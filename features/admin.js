import { STATE } from "../core/state.js";
import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";

const adminStore = {
    listaOriginal: [],
    eventosPush: [],
    scoreMap: {},
    grafico: null,
    carregado: false,
    processando: false
};

const getToken = () => localStorage.getItem("adminToken");

/**
 * INIT
 */
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

    } catch (err) {
        adminStore.carregado = false;
        container.innerHTML = erroHTML(err.message);
        registrarLog("ADMIN_ERRO", err.message, "ERRO");
    } finally {
        adminStore.processando = false;
    }
}

/**
 * UI STATES
 */
const loadingHTML = () => `
<div style="padding:50px;text-align:center;font-family:sans-serif;">
    <div style="width:40px;height:40px;border:4px solid #eee;border-top:4px solid #3498db;border-radius:50%;margin:auto;animation:spin 1s linear infinite;"></div>
    <p style="margin-top:15px;color:#666;">Sincronizando base...</p>
</div>
<style>@keyframes spin{to{transform:rotate(360deg);}}</style>`;

const erroHTML = (msg) => `
<div style="padding:20px;background:#f8d7da;color:#721c24;border-radius:8px;">
    <h3>❌ Erro</h3>
    <p>${msg}</p>
    <button onclick="location.reload()">Recarregar</button>
</div>`;

/**
 * DATA
 */
async function carregarDados(retry = 0) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const token = getToken();
        const mes = document.getElementById("mes")?.value;

        const [r1, r2] = await Promise.all([
            fetch(`${CONFIG.API_URL}?action=readall_admin&token=${token}&mes=${mes}`, { signal: controller.signal }),
            fetch(`${CONFIG.API_URL}?action=push_eventos&token=${token}`, { signal: controller.signal })
        ]);

        clearTimeout(timeout);

        if (!r1.ok || !r2.ok) throw new Error("HTTP ERROR");

        const d = await r1.json();
        const e = await r2.json();

        adminStore.listaOriginal = Array.isArray(d) ? d : [];
        adminStore.eventosPush = Array.isArray(e) ? e : [];

        processar();

    } catch (err) {
        clearTimeout(timeout);

        if (err.name === "AbortError" && retry < 1) {
            return carregarDados(retry + 1);
        }

        alert("Falha: " + err.message);
        registrarLog("ADMIN_FETCH", err.message, "ERRO");
    }
}

/**
 * CORE
 */
function processar() {
    calcularScore();
    renderTabela(adminStore.listaOriginal);
    renderChart(adminStore.listaOriginal);
    updateKPIs();
}

/**
 * SCORE ENGINE
 */
function calcularScore() {
    const map = {};

    (adminStore.eventosPush || []).forEach(e => {
        if (!e.matricula) return;

        const status = String(e.status || "").toUpperCase();

        map[e.matricula] ??= 0;

        if (status === "ABERTO") map[e.matricula] += 1;
        if (status === "IGNORADO") map[e.matricula] -= 0.5;
    });

    adminStore.scoreMap = map;
}

/**
 * SAFE DATE PARSER
 */
function extrairDia(data) {
    if (!data) return null;

    if (data.includes("/")) return data.split("/")[0];
    if (data.includes("-")) return data.split("-")[2];

    return null;
}

/**
 * TABLE
 */
function renderTabela(lista) {
    const tbody = document.getElementById("table");
    if (!tbody) return;

    const agrupado = {};

    lista.forEach(i => {
        const m = i.matricula || "S/M";
        agrupado[m] ??= { nome: (i.nome || "DESCONHECIDO"), total: 0 };
        agrupado[m].total++;
    });

    tbody.innerHTML = Object.entries(agrupado)
        .sort((a,b)=>b[1].total-a[1].total)
        .map(([m,v])=>{
            const s = adminStore.scoreMap[m] ?? 0;

            return `
<tr>
<td>${v.nome}<br><small>${m}</small></td>
<td style="text-align:center">${v.total}</td>
<td style="text-align:center;font-weight:bold">${s}</td>
</tr>`;
        }).join("");
}

/**
 * FILTER
 */
function renderFiltrado() {
    const t = (document.getElementById("search")?.value || "").toLowerCase();

    renderTabela(
        adminStore.listaOriginal.filter(i =>
            (i.nome || "").toLowerCase().includes(t) ||
            String(i.matricula || "").includes(t)
        )
    );
}

/**
 * KPIs
 */
function updateKPIs() {
    const total = adminStore.listaOriginal.length;

    document.getElementById("kpiTotal").textContent =
        new Set(adminStore.listaOriginal.map(i => i.matricula)).size;

    document.getElementById("kpiFolgas").textContent = total;

    const enviados = adminStore.eventosPush.length;
    const abertos = adminStore.eventosPush.filter(e => e.status === "ABERTO").length;

    document.getElementById("kpiPush").textContent = enviados;
    document.getElementById("kpiTaxa").textContent =
        enviados ? Math.round((abertos/enviados)*100) + "%" : "0%";
}

/**
 * CHART
 */
function renderChart(lista) {
    const canvas = document.getElementById("chart");
    if (!canvas || !window.Chart) return;

    const map = {};

    lista.forEach(i => {
        const dia = extrairDia(i.data);
        if (dia) map[dia.padStart(2,"0")] = (map[dia] || 0) + 1;
    });

    const labels = Object.keys(map).sort();
    const values = labels.map(l => map[l]);

    adminStore.grafico?.destroy();

    adminStore.grafico = new Chart(canvas, {
        type:"line",
        data:{
            labels,
            datasets:[{
                data:values,
                borderColor:"#3498db",
                fill:true
            }]
        }
    });
}

/**
 * CHART LIB
 */
async function garantirChartJS() {
    if (window.Chart) return;

    return new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js";
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
    });
}
