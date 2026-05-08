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
 * INICIALIZAÇÃO E CONTROLE DE UI
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
 * COMPONENTES DE INTERFACE (HTML)
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
    return `
    <div style="padding:20px;background:#f8d7da;color:#721c24;border-radius:8px;border:1px solid #f5c6cb;margin:10px;">
        <h3>❌ Falha no Painel</h3>
        <p>${msg}</p>
        <button onclick="location.reload()" style="padding:8px 15px;cursor:pointer;">Tentar Novamente</button>
    </div>`;
}

function gerarHTMLAdmin() {
    const mesAtual = String(new Date().getMonth() + 1).padStart(2, "0");

    return `
<div style="padding:20px;font-family:sans-serif;animation: fadeIn 0.3s ease;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 style="margin:0;color:#2c3e50;">🧠 Painel de Gestão</h2>
        <button id="btnExit" style="background:#e74c3c;color:#fff;border:none;padding:8px 15px;border-radius:5px;cursor:pointer;">Sair</button>
    </div>

    <div style="background:#f0f7ff; padding:15px; border-radius:8px; border:1px solid #3498db; margin-bottom:20px;">
        <h3 style="margin-top:0; color:#2980b9; font-size:16px;">📢 Enviar Notificação Geral (Push)</h3>
        <div style="display:flex; gap:10px;">
            <input id="pushMsg" placeholder="Digite o aviso para todos os militares..." style="flex:1; padding:10px; border-radius:6px; border:1px solid #ddd;">
            <button id="btnSendPush" style="background:#3498db; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:bold;">ENVIAR</button>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));gap:15px;margin-bottom:25px;">
        <div style="background:#fff;padding:15px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center;">
            <strong id="kpiTotal" style="font-size:24px;display:block;">0</strong><small style="color:#7f8c8d;">Efetivo</small>
        </div>
        <div style="background:#fff;padding:15px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center;">
            <strong id="kpiFolgas" style="font-size:24px;display:block;">0</strong><small style="color:#7f8c8d;">Folgas</small>
        </div>
        <div style="background:#fff;padding:15px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center;">
            <strong id="kpiPush" style="font-size:24px;display:block;">0</strong><small style="color:#7f8c8d;">Push</small>
        </div>
        <div style="background:#fff;padding:15px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);text-align:center;">
            <strong id="kpiTaxa" style="font-size:24px;display:block;color:#3498db;">0%</strong><small style="color:#7f8c8d;">Taxa</small>
        </div>
    </div>

    <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
        <input id="search" placeholder="🔍 Buscar..." style="flex:2;padding:10px;border-radius:6px;border:1px solid #ddd;min-width:200px;">
        <select id="mes" style="padding:10px;border-radius:6px;border:1px solid #ddd;">
            ${Array.from({length:12},(_,i)=>{
                const v = String(i+1).padStart(2,"0");
                return `<option value="${v}" ${v===mesAtual?"selected":""}>Mês ${v}</option>`;
            }).join("")}
        </select>
        <button id="refresh" style="padding:10px;cursor:pointer;border-radius:6px;border:1px solid #ddd;background:#fff;">🔄</button>
        <button id="export" style="padding:10px;cursor:pointer;border-radius:6px;border:none;background:#27ae60;color:#fff;">📤 CSV</button>
    </div>

    <div style="background:#fff;border-radius:8px;overflow-x:auto;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <table width="100%" style="border-collapse:collapse;">
            <thead style="background:#f8f9fa;">
                <tr style="text-align:left;">
                    <th style="padding:12px;border-bottom:2px solid #eee;">Nome / Matrícula</th>
                    <th style="padding:12px;border-bottom:2px solid #eee;text-align:center;">Folgas</th>
                    <th style="padding:12px;border-bottom:2px solid #eee;text-align:center;">Score</th>
                </tr>
            </thead>
            <tbody id="table"></tbody>
        </table>
    </div>

    <div style="margin-top:20px;background:#fff;padding:15px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <canvas id="chart" style="max-height:300px;"></canvas>
    </div>
</div>
<style>@keyframes fadeIn {from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}</style>`;
}

/**
 * =========================================================================
 * DATA E LOGICA
 * =========================================================================
 */
async function carregarDados(retry = 0) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const token = getToken();
        const mes = document.getElementById("mes")?.value || String(new Date().getMonth() + 1).padStart(2, "0");

        const [r1, r2] = await Promise.all([
            fetch(`${CONFIG.API_URL}?action=readall_admin&token=${token}&mes=${mes}`, { signal: controller.signal }),
            fetch(`${CONFIG.API_URL}?action=push_eventos&token=${token}`, { signal: controller.signal })
        ]);

        clearTimeout(timeout);
        if (!r1.ok || !r2.ok) throw new Error("Erro de resposta da API.");

        const d = await r1.json();
        const e = await r2.json();

        adminStore.listaOriginal = Array.isArray(d) ? d : [];
        adminStore.eventosPush = Array.isArray(e) ? e : [];

        processar();

    } catch (err) {
        clearTimeout(timeout);
        if (err.name === "AbortError" && retry < 1) return carregarDados(retry + 1);
        alert("Falha ao sincronizar: " + err.message);
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
 * FUNÇÃO ENVIAR PUSH
 * =========================================================================
 */
async function enviarPushGlobal() {
    const input = document.getElementById("pushMsg");
    const msg = input?.value.trim();
    if (!msg) return alert("Digite uma mensagem primeiro.");

    const btn = document.getElementById("btnSendPush");
    const originalText = btn.textContent;
    
    try {
        btn.disabled = true;
        btn.textContent = "ENVIANDO...";

        const response = await fetch(`${CONFIG.API_URL}?action=enviar_push_admin`, {
            method: "POST",
            body: JSON.stringify({
                token: getToken(),
                mensagem: msg
            })
        });

        const res = await response.json();

        if (res.success) {
            alert("🚀 Notificação enviada com sucesso para " + (res.count || "todos") + " dispositivos!");
            input.value = "";
            carregarDados(); // Atualiza KPIs de Push
        } else {
            throw new Error(res.error || "Erro desconhecido no servidor");
        }

    } catch (err) {
        alert("❌ Erro ao enviar: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

/**
 * =========================================================================
 * INTERFACE E EVENTOS
 * =========================================================================
 */
function bindEventos() {
    const $ = (id) => document.getElementById(id);

    $("btnExit")?.addEventListener("click", () => {
        localStorage.removeItem("adminToken");
        adminStore.carregado = false;
        location.reload();
    });

    $("refresh")?.addEventListener("click", () => carregarDados());
    $("export")?.addEventListener("click", exportCSV);
    $("search")?.addEventListener("input", renderFiltrado);
    $("mes")?.addEventListener("change", () => carregarDados());
    $("btnSendPush")?.addEventListener("click", enviarPushGlobal);
}

function renderTabela(lista) {
    const tbody = document.getElementById("table");
    if (!tbody) return;

    const agrupado = {};

    // IMPORTANTE: Aqui percorremos TODOS os registros retornados
    lista.forEach(i => {
        const m = i.matricula || "S/M";
        
        if (!agrupado[m]) {
            agrupado[m] = { 
                nome: (i.nome || "DESCONHECIDO"), 
                total: 0, 
                datas: [] 
            };
        }
        
        // Incrementa o contador para cada vez que a matrícula aparece
        agrupado[m].total++;
        
        // Adiciona a data ao array de datas (se houver data no registro)
        if (i.data) {
            agrupado[m].datas.push(i.data);
        }
    });

    tbody.innerHTML = Object.entries(agrupado)
        .sort((a, b) => b[1].total - a[1].total) // Ordena por quem tem mais folgas
        .map(([m, v]) => {
            const s = adminStore.scoreMap[m] ?? 0;
            const corScore = s > 0 ? "#27ae60" : (s < 0 ? "#e74c3c" : "#7f8c8d");
            
            // Limpa e ordena as datas para o hover
            const datasOrdenadas = [...new Set(v.datas)].sort().join(" | ");

            return `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:12px;">
                    <strong>${v.nome}</strong><br>
                    <small style="color:#999">${m}</small>
                </td>
                <td style="text-align:center; font-weight:bold;">
                    <span title="Dias solicitados: ${datasOrdenadas}" 
                          style="cursor:help; border-bottom:1px dotted #3498db; color:#3498db; padding:2px 5px; background:rgba(52,152,219,0.05); border-radius:4px;">
                        ${v.total}
                    </span>
                </td>
                <td style="text-align:center; font-weight:bold; color:${corScore}">${s}</td>
            </tr>`;
        }).join("");
}

function renderFiltrado() {
    const t = (document.getElementById("search")?.value || "").toLowerCase();
    renderTabela(
        adminStore.listaOriginal.filter(i =>
            (i.nome || "").toLowerCase().includes(t) ||
            String(i.matricula || "").includes(t)
        )
    );
}

function updateKPIs() {
    const totalFolgas = adminStore.listaOriginal.length;
    const efetivoUnico = new Set(adminStore.listaOriginal.map(i => i.matricula)).size;
    const enviados = adminStore.eventosPush.length;
    const abertos = adminStore.eventosPush.filter(e => e.status === "ABERTO").length;

    const ids = {
        "kpiTotal": efetivoUnico,
        "kpiFolgas": totalFolgas,
        "kpiPush": enviados,
        "kpiTaxa": enviados ? Math.round((abertos/enviados)*100) + "%" : "0%"
    };

    Object.entries(ids).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });
}

function exportCSV() {
    if (!adminStore.listaOriginal.length) return alert("Sem dados.");
    let csv = "\ufeffNome,Matrícula,Data\n";
    adminStore.listaOriginal.forEach(i => {
        const n = (i.nome || "").replace(/,/g, " ");
        csv += `${n},${i.matricula},${i.data}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escala_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * =========================================================================
 * UTILITÁRIOS E LIBS EXTERNAS
 * =========================================================================
 */
async function garantirChartJS() {
    if (window.Chart) return;
    return new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js";
        s.async = true;
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
    });
}

function renderChart(lista) {
    const canvas = document.getElementById("chart");
    if (!canvas || !window.Chart) return;

    const map = {};
    lista.forEach(i => {
        const dia = extrairDia(i.data);
        if (dia) {
            const d = dia.padStart(2,"0");
            map[d] = (map[d] || 0) + 1;
        }
    });

    const labels = Object.keys(map).sort();
    const values = labels.map(l => map[l]);

    adminStore.grafico?.destroy();
    adminStore.grafico = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Folgas",
                data: values,
                borderColor: "#3498db",
                backgroundColor: "rgba(52, 152, 219, 0.1)",
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

function extrairDia(data) {
    if (!data) return null;
    if (data.includes("/")) return data.split("/")[0];
    if (data.includes("-")) return data.split("-")[2];
    return null;
}
