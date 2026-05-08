// features/admin.js
import { STATE } from "../core/state.js";
import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";

/**
 * =========================================================================
 * ESTADO DO MÓDULO (STORE PRIVADA)
 * =========================================================================
 */
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
 * =========================================================================
 * INICIALIZAÇÃO
 * =========================================================================
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
 * =========================================================================
 * UI - COMPONENTES
 * =========================================================================
 */
function loadingHTML() {
    return `
    <div style="padding:50px;text-align:center;font-family:sans-serif;">
        <div style="width:40px;height:40px;border:4px solid #eee;border-top:4px solid #3498db;border-radius:50%;margin:auto;animation:spin 1s linear infinite;"></div>
        <p style="margin-top:15px;color:#666;">Sincronizando base administrativa...</p>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg);}}</style>`;
}

function erroHTML(msg) {
    return `<div style="padding:20px;background:#f8d7da;color:#721c24;border-radius:8px;margin:10px;">❌ ${msg}</div>`;
}

function gerarHTMLAdmin() {
    const mesAtual = String(new Date().getMonth() + 1).padStart(2, "0");

    return `
<div style="padding:20px;font-family:sans-serif;animation: fadeIn 0.3s ease;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="margin:0;color:#2c3e50;">🧠 Painel de Gestão</h2>
        <button id="btnExit" style="background:#e74c3c;color:#fff;border:none;padding:8px 15px;border-radius:5px;cursor:pointer;">Sair</button>
    </div>

    <div style="background:#fff; padding:20px; border-radius:12px; border:1px solid #e0e6ed; margin-bottom:20px; box-shadow:0 4px 6px rgba(0,0,0,0.02);">
        <h3 style="margin:0 0 15px 0; color:#34495e; font-size:16px; display:flex; align-items:center; gap:8px;">
            <span>📢 Notificação em Massa</span>
        </h3>
        <div style="display:flex; gap:10px;">
            <input id="pushMsg" placeholder="Ex: A escala de Junho já está disponível para consulta..." 
                   style="flex:1; padding:12px; border-radius:8px; border:1px solid #dcdfe6; outline:none;">
            <button id="btnSendPush" style="background:#3498db; color:#fff; border:none; padding:0 25px; border-radius:8px; cursor:pointer; font-weight:bold; transition:0.2s;">ENVIAR DISPARO</button>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));gap:15px;margin-bottom:25px;">
        <div style="background:#fff;padding:15px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center;">
            <strong id="kpiTotal" style="font-size:24px;display:block;">0</strong><small style="color:#7f8c8d;">Militares</small>
        </div>
        <div id="kpiFolgasBox" style="background:#fff;padding:15px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center;">
            <strong id="kpiFolgas" style="font-size:24px;display:block;">0</strong><small style="color:#7f8c8d;">Total Folgas</small>
        </div>
        <div style="background:#fff;padding:15px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center;">
            <strong id="kpiPush" style="font-size:24px;display:block;">0</strong><small style="color:#7f8c8d;">Push Enviados</small>
        </div>
        <div style="background:#fff;padding:15px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center;">
            <strong id="kpiTaxa" style="font-size:24px;display:block;color:#3498db;">0%</strong><small style="color:#7f8c8d;">Abertura</small>
        </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
        <input id="search" placeholder="🔍 Buscar por nome ou matrícula..." style="flex:2;padding:10px;border-radius:6px;border:1px solid #ddd;min-width:200px;">
        <select id="mes" style="padding:10px;border-radius:6px;border:1px solid #ddd;">
            ${Array.from({length:12},(_,i)=>{
                const v = String(i+1).padStart(2,"0");
                return `<option value="${v}" ${v===mesAtual?"selected":""}>Mês ${v}</option>`;
            }).join("")}
        </select>
        <button id="refresh" style="padding:10px;cursor:pointer;border-radius:6px;border:1px solid #ddd;background:#fff;">🔄 Atualizar</button>
        <button id="export" style="padding:10px;cursor:pointer;border-radius:6px;border:none;background:#27ae60;color:#fff;">📤 Exportar CSV</button>
    </div>

    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.05); border:1px solid #eee;">
        <table width="100%" style="border-collapse:collapse;">
            <thead style="background:#f8f9fa;">
                <tr style="text-align:left; color:#7f8c8d; font-size:13px;">
                    <th style="padding:15px;border-bottom:2px solid #eee;">NOME / MATRÍCULA</th>
                    <th style="padding:15px;border-bottom:2px solid #eee;text-align:center;">FOLGAS</th>
                    <th style="padding:15px;border-bottom:2px solid #eee;text-align:center;">SCORE</th>
                </tr>
            </thead>
            <tbody id="table"></tbody>
        </table>
    </div>

    <div style="margin-top:20px;background:#fff;padding:15px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.05);border:1px solid #eee;">
        <canvas id="chart" style="max-height:280px;"></canvas>
    </div>
</div>
<style>@keyframes fadeIn {from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}</style>`;
}

/**
 * =========================================================================
 * CORE - PROCESSAMENTO DE DADOS
 * =========================================================================
 */


async function carregarDados() {
    try {
        const token = getToken();
        const mes = document.getElementById("mes")?.value;

        const [r1, r2] = await Promise.all([
            fetch(`${CONFIG.API_URL}?action=readall_admin&token=${token}&mes=${mes}`),
            fetch(`${CONFIG.API_URL}?action=push_eventos&token=${token}`)
        ]);

        const d = await r1.json();
        const e = await r2.json();

        if (d?.error) throw new Error(d.error);
        if (e?.error) console.warn(e.error);

        adminStore.listaOriginal = Array.isArray(d) ? d : [];
        adminStore.eventosPush = Array.isArray(e) ? e : [];

        processar();

    } catch (err) {
        console.error(err);
        alert("Erro ao carregar dados: " + err.message);
    }
}

function processar() {
    calcularScore();

    renderTabela(adminStore.listaOriginal);
    renderChart(adminStore.listaOriginal);
    updateKPIs();
}

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
 * =========================================================================
 * FUNÇÕES DE AÇÃO (PUSH / EVENTOS)
 * =========================================================================
 */
async function dispararPushGlobal() {

    const input = document.getElementById("pushMsg");
    const btn = document.getElementById("btnSendPush");

    if (!input || !btn) {
        alert("Componentes do painel não encontrados.");
        return;
    }

    const mensagem = input.value.trim();

    if (!mensagem) {
        alert("Digite a mensagem da notificação.");
        input.focus();
        return;
    }

    const token = getToken();

    if (!token) {
        alert("Sessão administrativa inválida.");
        return;
    }

    const confirmar = confirm(
        `Confirmar envio da notificação para todos os dispositivos registrados?`
    );

    if (!confirmar) return;

    const originalText = btn.textContent;

    try {

        btn.disabled = true;
        btn.textContent = "DISPARANDO...";
        btn.style.opacity = "0.7";
        btn.style.cursor = "wait";

        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 30000);

        const params = new URLSearchParams({
            action: "push_manual",
            token,
            mensagem
        });

        const response = await fetch(
            `${CONFIG.API_URL}?${params.toString()}`,
            {
                method: "GET",
                signal: controller.signal,
                cache: "no-store"
            }
        );

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data || typeof data !== "object") {
            throw new Error("Resposta inválida do servidor.");
        }

        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.success) {
            throw new Error(data.message || "Falha desconhecida.");
        }

        alert(
            `🚀 Push enviado com sucesso!\n\nDispositivos alcançados: ${data.enviados || 0}`
        );

        input.value = "";

        registrarLog?.(
            "PUSH_MANUAL",
            `Disparo global realizado (${data.enviados || 0} dispositivos)`,
            "INFO"
        );

    } catch (err) {

        console.error("Erro dispararPushGlobal:", err);

        if (err.name === "AbortError") {
            alert("O servidor demorou para responder.");
        } else {
            alert("Erro ao enviar push: " + err.message);
        }

    } finally {

        btn.disabled = false;
        btn.textContent = originalText;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    }
}

function bindEventos() {
    const $ = (id) => document.getElementById(id);
    $("btnExit")?.addEventListener("click", () => {
        localStorage.removeItem("adminToken");
        location.reload();
    });
    $("refresh")?.addEventListener("click", () => carregarDados());
    $("export")?.addEventListener("click", exportCSV);
    $("search")?.addEventListener("input", renderFiltrado);
    $("mes")?.addEventListener("change", () => carregarDados());
    $("btnSendPush")?.addEventListener("click", dispararPushGlobal);
}

/**
 * =========================================================================
 * RENDERIZAÇÃO DA TABELA (COM CORREÇÃO DE AGRUPAMENTO)
 * =========================================================================
 */
function renderTabela(lista) {
    const tbody = document.getElementById("table");
    if (!tbody) return;

    tbody.innerHTML = lista.map(v => {

        const s = adminStore.scoreMap[v.matricula] ?? 0;

        const corScore =
            s > 0 ? "#27ae60" :
            s < 0 ? "#e74c3c" :
            "#7f8c8d";

        const listaDatas = (v.datas || []).join(" | ");

        return `
        <tr style="border-bottom:1px solid #f4f7f6;">
            <td style="padding:15px;">
                <div style="font-weight:bold;color:#2c3e50;">
                    ${v.nome}
                </div>
                <div style="font-size:11px;color:#95a5a6;">
                    ${v.matricula}
                </div>
            </td>

            <td style="text-align:center;">
                <span
                    title="Datas: ${listaDatas}"
                    style="
                        cursor:help;
                        background:#ebf5ff;
                        color:#3498db;
                        padding:4px 10px;
                        border-radius:20px;
                        font-weight:bold;
                        font-size:14px;
                        border:1px solid #d6eaff;
                    ">
                    ${v.total}
                </span>
            </td>

            <td style="
                text-align:center;
                font-weight:bold;
                color:${corScore};
                font-size:15px;
            ">
                ${s}
            </td>
        </tr>`;
    }).join("");
}

function renderFiltrado() {
    const term = document.getElementById("search").value.toLowerCase();
    const filtrados = adminStore.listaOriginal.filter(i => 
        (i.nome || "").toLowerCase().includes(term) || 
        String(i.matricula).includes(term)
    );
    renderTabela(filtrados);
}

/**
 * =========================================================================
 * UTILITÁRIOS (KPI, CHART, EXPORT)
 * =========================================================================
 */
function updateKPIs() {
    const totalFolgas = adminStore.listaOriginal.reduce(
    (acc, item) => acc + (item.total || 0),
    0
);
    const militaresUnicos = new Set(adminStore.listaOriginal.map(i => i.matricula)).size;
    const enviados = adminStore.eventosPush.length;
    const abertos = adminStore.eventosPush.filter(e => e.status === "ABERTO").length;

    document.getElementById("kpiTotal").textContent = militaresUnicos;
    document.getElementById("kpiFolgas").textContent = totalFolgas;
    document.getElementById("kpiPush").textContent = enviados;
    document.getElementById("kpiTaxa").textContent = enviados ? Math.round((abertos/enviados)*100) + "%" : "0%";
}

function exportCSV() {
    if (!adminStore.listaOriginal.length) return;
    let csv = "\ufeffMilitar,Matricula,Data\n";
    adminStore.listaOriginal.forEach(i => {
        csv += `"${i.nome}","${i.matricula}","${i.data}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `gestao_derso_${new Date().toLocaleDateString()}.csv`;
    link.click();
}

async function garantirChartJS() {
    if (window.Chart) return;
    return new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
    });
}

function renderChart(lista) {
    const canvas = document.getElementById("chart");
    if (!canvas || !window.Chart) return;

    const map = {};

    lista.forEach(i => {
        (i.datas || []).forEach(data => {
            const dia = extrairDia(data);

            if (dia) {
                map[dia.padStart(2, "0")] =
                    (map[dia.padStart(2, "0")] || 0) + 1;
            }
        });
    });

    const labels = Object.keys(map).sort();
    const values = labels.map(l => map[l]);

    adminStore.grafico?.destroy();

    adminStore.grafico = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Volume de Pedidos",
                data: values,
                borderColor: "#3498db",
                backgroundColor: "rgba(52, 152, 219, 0.05)",
                borderWidth: 3,
                pointBackgroundColor: "#fff",
                pointRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function extrairDia(data) {
    if (!data) return null;

    if (typeof data === "string") {
        if (data.includes("/")) {
            return data.split("/")[0];
        }

        if (data.includes("-")) {
            return data.split("-")[2];
        }
    }

    if (data instanceof Date && !isNaN(data.getTime())) {
        return String(data.getDate()).padStart(2, "0");
    }

    return null;
}
