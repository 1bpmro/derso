// features/admin.js

import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";
import { UI } from "../ui/manager.js";

/* ======================================
   🧠 STORE PRIVADA
====================================== */

const adminStore = {
    listaOriginal: [],
    eventosPush: [],
    scoreMap: {},
    grafico: null,
    carregado: false,
    processando: false
};

const getToken = () =>
    localStorage.getItem("adminToken");

/* ======================================
   🚀 INICIALIZAÇÃO
====================================== */

export async function iniciarPainelAdmin() {

    if (
        adminStore.carregado ||
        adminStore.processando
    ) {
        return;
    }

    const container =
        document.getElementById("formContent");

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

        registrarLog(
            "ADMIN",
            "Painel administrativo iniciado",
            "SUCESSO"
        );

    } catch (err) {

        adminStore.carregado = false;

        container.innerHTML =
            erroHTML(err.message);

        registrarLog(
            "ADMIN_ERRO",
            err.message,
            "ERRO"
        );

    } finally {

        adminStore.processando = false;
    }
}

/* ======================================
   🎨 HTML
====================================== */

function loadingHTML() {

    return `
    <div style="padding:50px;text-align:center;font-family:sans-serif;">
        <div style="
            width:40px;
            height:40px;
            border:4px solid #eee;
            border-top:4px solid #3498db;
            border-radius:50%;
            margin:auto;
            animation:spin 1s linear infinite;
        "></div>

        <p style="margin-top:15px;color:#666;">
            Sincronizando base administrativa...
        </p>
    </div>

    <style>
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
    </style>
    `;
}

function erroHTML(msg = "Erro desconhecido") {

    return `
    <div style="
        padding:20px;
        background:#f8d7da;
        color:#721c24;
        border-radius:8px;
        margin:10px;
        font-family:sans-serif;
    ">
        ❌ ${msg}
    </div>
    `;
}

function gerarHTMLAdmin() {

    const mesAtual =
        String(new Date().getMonth() + 1)
            .padStart(2, "0");

    return `
<div style="
    padding:20px;
    font-family:sans-serif;
    animation:fadeIn .3s ease;
">

    <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:20px;
        gap:10px;
        flex-wrap:wrap;
    ">

        <h2 style="
            margin:0;
            color:#2c3e50;
        ">
            🧠 Painel de Gestão
        </h2>

        <button
            id="btnExit"
            style="
                background:#e74c3c;
                color:#fff;
                border:none;
                padding:10px 16px;
                border-radius:8px;
                cursor:pointer;
                font-weight:bold;
            "
        >
            Sair
        </button>
    </div>

    <!-- PUSH -->

    <div style="
        background:#fff;
        padding:20px;
        border-radius:12px;
        border:1px solid #e0e6ed;
        margin-bottom:20px;
        box-shadow:0 4px 6px rgba(0,0,0,0.03);
    ">

        <h3 style="
            margin:0 0 15px 0;
            color:#34495e;
            font-size:16px;
        ">
            📢 Notificação em Massa
        </h3>

        <div style="
            display:flex;
            gap:10px;
            flex-wrap:wrap;
        ">

            <input
                id="pushMsg"
                placeholder="Digite a mensagem da notificação..."
                style="
                    flex:1;
                    min-width:220px;
                    padding:12px;
                    border-radius:8px;
                    border:1px solid #dcdfe6;
                    outline:none;
                "
            >

            <button
                id="btnSendPush"
                style="
                    background:#3498db;
                    color:#fff;
                    border:none;
                    padding:12px 20px;
                    border-radius:8px;
                    cursor:pointer;
                    font-weight:bold;
                "
            >
                ENVIAR DISPARO
            </button>
        </div>
    </div>

    <!-- KPIs -->

    <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
        gap:15px;
        margin-bottom:25px;
    ">

        ${kpiBox("kpiTotal", "Militares")}
        ${kpiBox("kpiFolgas", "Total Folgas")}
        ${kpiBox("kpiPush", "Push Enviados")}
        ${kpiBox("kpiTaxa", "Taxa Abertura", "#3498db")}

    </div>

    <!-- FILTROS -->

    <div style="
        display:flex;
        gap:10px;
        margin-bottom:20px;
        flex-wrap:wrap;
    ">

        <input
            id="search"
            placeholder="🔍 Buscar..."
            style="
                flex:2;
                min-width:200px;
                padding:10px;
                border-radius:8px;
                border:1px solid #ddd;
            "
        >

        <select
            id="mes"
            style="
                padding:10px;
                border-radius:8px;
                border:1px solid #ddd;
            "
        >
            ${
                Array.from(
                    { length: 12 },
                    (_, i) => {

                        const v =
                            String(i + 1)
                                .padStart(2, "0");

                        return `
                        <option
                            value="${v}"
                            ${
                                v === mesAtual
                                    ? "selected"
                                    : ""
                            }
                        >
                            Mês ${v}
                        </option>
                        `;
                    }
                ).join("")
            }
        </select>

        <button
            id="refresh"
            style="
                padding:10px 14px;
                border-radius:8px;
                border:1px solid #ddd;
                background:#fff;
                cursor:pointer;
            "
        >
            🔄 Atualizar
        </button>

        <button
            id="export"
            style="
                padding:10px 14px;
                border-radius:8px;
                border:none;
                background:#27ae60;
                color:#fff;
                cursor:pointer;
                font-weight:bold;
            "
        >
            📤 Exportar CSV
        </button>
    </div>

    <!-- TABELA -->

    <div style="
        background:#fff;
        border-radius:12px;
        overflow:auto;
        box-shadow:0 2px 10px rgba(0,0,0,0.05);
        border:1px solid #eee;
    ">

        <table width="100%" style="border-collapse:collapse;min-width:650px;">

            <thead style="background:#f8f9fa;">

                <tr style="
                    text-align:left;
                    color:#7f8c8d;
                    font-size:13px;
                ">

                    <th style="padding:15px;">
                        NOME / MATRÍCULA
                    </th>

                    <th style="
                        padding:15px;
                        text-align:center;
                    ">
                        FOLGAS
                    </th>

                    <th style="
                        padding:15px;
                        text-align:center;
                    ">
                        SCORE
                    </th>
                </tr>
            </thead>

            <tbody id="table"></tbody>

        </table>
    </div>

    <!-- GRÁFICO -->

    <div style="
        margin-top:20px;
        background:#fff;
        padding:15px;
        border-radius:12px;
        box-shadow:0 2px 10px rgba(0,0,0,0.05);
        border:1px solid #eee;
    ">
        <canvas
            id="chart"
            style="max-height:300px;"
        ></canvas>
    </div>

</div>

<style>
@keyframes fadeIn {
    from {
        opacity:0;
        transform:translateY(10px);
    }

    to {
        opacity:1;
        transform:translateY(0);
    }
}
</style>
`;
}

function kpiBox(
    id,
    label,
    color = "#2c3e50"
) {

    return `
    <div style="
        background:#fff;
        padding:15px;
        border-radius:12px;
        box-shadow:0 2px 6px rgba(0,0,0,0.05);
        text-align:center;
        border:1px solid #eee;
    ">

        <strong
            id="${id}"
            style="
                font-size:24px;
                display:block;
                color:${color};
            "
        >
            0
        </strong>

        <small style="color:#7f8c8d;">
            ${label}
        </small>

    </div>
    `;
}

/* ======================================
   📦 DADOS
====================================== */

async function carregarDados() {

    const token = getToken();

    if (!token) {
        throw new Error(
            "Sessão administrativa inválida."
        );
    }

    const mes =
        document.getElementById("mes")?.value;

    try {

        UI.loading.show(
            "Sincronizando painel..."
        );

        const controller =
            new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            15000
        );

        const [r1, r2] = await Promise.all([

            fetch(
                `${CONFIG.API_URL}?action=readall_admin&token=${token}&mes=${mes}`,
                {
                    signal: controller.signal,
                    cache: "no-store"
                }
            ),

            fetch(
                `${CONFIG.API_URL}?action=push_eventos&token=${token}`,
                {
                    signal: controller.signal,
                    cache: "no-store"
                }
            )
        ]);

        clearTimeout(timeout);

        if (!r1.ok) {
            throw new Error(
                `Falha HTTP ${r1.status}`
            );
        }

        if (!r2.ok) {
            throw new Error(
                `Falha HTTP ${r2.status}`
            );
        }

        const dadosAdmin =
            await r1.json();

        const eventosPush =
            await r2.json();

        if (dadosAdmin?.error) {
            throw new Error(dadosAdmin.error);
        }

        adminStore.listaOriginal =
            Array.isArray(dadosAdmin)
                ? dadosAdmin
                : [];

        adminStore.eventosPush =
            Array.isArray(eventosPush)
                ? eventosPush
                : [];

        processar();

        registrarLog(
            "ADMIN_SYNC",
            `Painel atualizado (${adminStore.listaOriginal.length} registros)`,
            "INFO"
        );

    } catch (err) {

        console.error(err);

        UI.modal.show(
            "ERRO",
            err.name === "AbortError"
                ? "O servidor demorou para responder."
                : err.message,
            "❌",
            "red"
        );

    } finally {

        UI.loading.hide();
    }
}

function processar() {

    calcularScore();

    renderTabela(
        adminStore.listaOriginal
    );

    renderChart(
        adminStore.listaOriginal
    );

    updateKPIs();
}

function calcularScore() {

    const map = {};

    (
        adminStore.eventosPush || []
    ).forEach((evento) => {

        if (!evento?.matricula) return;

        const matricula =
            String(evento.matricula);

        const status =
            String(
                evento.status || ""
            ).toUpperCase();

        map[matricula] ??= 0;

        if (status === "ABERTO") {
            map[matricula] += 1;
        }

        if (status === "IGNORADO") {
            map[matricula] -= 0.5;
        }
    });

    adminStore.scoreMap = map;
}

/* ======================================
   📢 PUSH GLOBAL
====================================== */

async function dispararPushGlobal() {

    const input =
        document.getElementById("pushMsg");

    const btn =
        document.getElementById("btnSendPush");

    if (!input || !btn) return;

    const mensagem =
        input.value.trim();

    if (!mensagem) {

        UI.modal.show(
            "AVISO",
            "Digite uma mensagem.",
            "⚠️",
            "orange"
        );

        input.focus();

        return;
    }

    const confirmar = confirm(
        "Confirmar envio do push global?"
    );

    if (!confirmar) return;

    const token = getToken();

    try {

        btn.disabled = true;

        btn.textContent =
            "DISPARANDO...";

        const controller =
            new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            30000
        );

        const params =
            new URLSearchParams({
                action: "push_manual",
                token,
                mensagem
            });

        const response =
            await fetch(
                `${CONFIG.API_URL}?${params.toString()}`,
                {
                    method: "GET",
                    signal: controller.signal,
                    cache: "no-store"
                }
            );

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        if (data?.error) {
            throw new Error(data.error);
        }

        if (!data?.success) {
            throw new Error(
                data?.message ||
                "Falha desconhecida."
            );
        }

        input.value = "";

        UI.modal.show(
            "PUSH ENVIADO",
            `Dispositivos alcançados: ${data.enviados || 0}`,
            "🚀",
            "#3498db"
        );

        registrarLog(
            "PUSH_GLOBAL",
            `Push enviado (${data.enviados || 0} dispositivos)`,
            "SUCESSO"
        );

        await carregarDados();

    } catch (err) {

        console.error(err);

        UI.modal.show(
            "ERRO",
            err.name === "AbortError"
                ? "O servidor demorou para responder."
                : err.message,
            "❌",
            "red"
        );

    } finally {

        btn.disabled = false;

        btn.textContent =
            "ENVIAR DISPARO";
    }
}

/* ======================================
   🎯 EVENTOS
====================================== */

function bindEventos() {

    const $ = (id) =>
        document.getElementById(id);

    $("btnExit")
        ?.addEventListener(
            "click",
            sairPainel
        );

    $("refresh")
        ?.addEventListener(
            "click",
            carregarDados
        );

    $("export")
        ?.addEventListener(
            "click",
            exportCSV
        );

    $("search")
        ?.addEventListener(
            "input",
            renderFiltrado
        );

    $("mes")
        ?.addEventListener(
            "change",
            carregarDados
        );

    $("btnSendPush")
        ?.addEventListener(
            "click",
            dispararPushGlobal
        );
}

function sairPainel() {

    localStorage.removeItem(
        "adminToken"
    );

    location.reload();
}

/* ======================================
   📋 TABELA
====================================== */

function renderTabela(lista) {
    const tbody = document.getElementById("table");
    if (!tbody) return;

    tbody.innerHTML = lista.map(v => {

        const s = adminStore.scoreMap[v.matricula] ?? 0;

        const corScore =
            s > 0 ? "#27ae60" :
            s < 0 ? "#e74c3c" :
            "#7f8c8d";

        const datas = Array.isArray(v.datas) ? v.datas : [];

        const tooltipDatas = datas.length
            ? datas.join(" • ")
            : "Sem registros";

        return `
        <tr style="border-bottom:1px solid #f4f7f6;">

            <!-- 👤 NOME / MATRÍCULA + HOVER -->
            <td style="padding:15px;">
                <div style="font-weight:bold;color:#2c3e50;">
                    ${v.nome}
                </div>

                <div style="font-size:11px;color:#95a5a6;">
                    ${v.matricula}
                </div>
            </td>

            <!-- 📊 SOLICITAÇÕES -->
            <td style="text-align:center;">
                <span
                    title="${tooltipDatas}"
                    style="
                        cursor: help;
                        display:inline-block;
                        background: #eaf4ff;
                        color:#1a73e8;
                        padding:5px 12px;
                        border-radius:999px;
                        font-weight:700;
                        font-size:13px;
                        border:1px solid #d6eaff;
                        transition: all .2s ease;
                    "
                    onmouseover="this.style.transform='scale(1.05)'"
                    onmouseout="this.style.transform='scale(1)'"
                >
                    ${v.total || 0}
                </span>
            </td>

            <!-- 🎯 SCORE -->
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

    const termo =
        document
            .getElementById("search")
            ?.value
            ?.toLowerCase()
            ?.trim() || "";

    const filtrados =
        adminStore.listaOriginal.filter(
            (item) => {

                const nome =
                    (item.nome || "")
                        .toLowerCase();

                const matricula =
                    String(
                        item.matricula || ""
                    );

                return (
                    nome.includes(termo) ||
                    matricula.includes(termo)
                );
            }
        );

    renderTabela(filtrados);
}

/* ======================================
   📊 KPI
====================================== */

function updateKPIs() {

    const totalFolgas =
        adminStore.listaOriginal.reduce(
            (acc, item) =>
                acc + (item.total || 0),
            0
        );

    const militaresUnicos =
        new Set(
            adminStore.listaOriginal.map(
                (i) => i.matricula
            )
        ).size;

    const enviados =
        adminStore.eventosPush.length;

    const abertos =
        adminStore.eventosPush.filter(
            (e) =>
                String(
                    e.status || ""
                ).toUpperCase() === "ABERTO"
        ).length;

    const taxa =
        enviados > 0
            ? Math.round(
                (abertos / enviados) * 100
            )
            : 0;

    setText("kpiTotal", militaresUnicos);

    setText("kpiFolgas", totalFolgas);

    setText("kpiPush", enviados);

    setText("kpiTaxa", `${taxa}%`);
}

function setText(id, value) {

    const el =
        document.getElementById(id);

    if (el) {
        el.textContent = value;
    }
}

/* ======================================
   📤 EXPORTAÇÃO
====================================== */

function exportCSV() {

    if (
        !adminStore.listaOriginal.length
    ) {

        UI.modal.show(
            "AVISO",
            "Não há dados para exportar.",
            "⚠️",
            "orange"
        );

        return;
    }

    let csv =
        "\ufeffMilitar,Matrícula,Total,Datas\n";

    adminStore.listaOriginal.forEach(
        (item) => {

            csv += `"${item.nome || ""}",`;

            csv += `"${item.matricula || ""}",`;

            csv += `"${item.total || 0}",`;

            csv += `"${(item.datas || []).join(" | ")}"\n`;
        }
    );

    const blob = new Blob(
        [csv],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const link =
        document.createElement("a");

    link.href =
        URL.createObjectURL(blob);

    link.download =
        `gestao_derso_${Date.now()}.csv`;

    link.click();

    URL.revokeObjectURL(link.href);
}

/* ======================================
   📈 CHART
====================================== */

async function garantirChartJS() {

    if (window.Chart) return;

    return new Promise(
        (resolve, reject) => {

            const script =
                document.createElement("script");

            script.src =
                "https://cdn.jsdelivr.net/npm/chart.js";

            script.onload = resolve;

            script.onerror = reject;

            document.head.appendChild(script);
        }
    );
}

function renderChart(lista = []) {

    const canvas =
        document.getElementById("chart");

    if (
        !canvas ||
        !window.Chart
    ) {
        return;
    }

    const mapa = {};

    lista.forEach((item) => {

        (item.datas || []).forEach(
            (data) => {

                const dia =
                    extrairDia(data);

                if (!dia) return;

                mapa[dia] =
                    (mapa[dia] || 0) + 1;
            }
        );
    });

    const labels =
        Object.keys(mapa).sort();

    const values =
        labels.map(
            (label) => mapa[label]
        );

    adminStore.grafico?.destroy();

    adminStore.grafico =
        new Chart(canvas, {

            type: "line",

            data: {

                labels,

                datasets: [{
                    label: "Volume de Pedidos",
                    data: values,
                    borderColor: "#3498db",
                    backgroundColor:
                        "rgba(52,152,219,0.08)",
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
}

/* ======================================
   🧩 HELPERS
====================================== */

function extrairDia(data) {

    if (!data) return null;

    if (typeof data === "string") {

        if (data.includes("/")) {

            return data
                .split("/")[0]
                .padStart(2, "0");
        }

        if (data.includes("-")) {

            return data
                .split("-")[2]
                ?.padStart(2, "0");
        }
    }

    if (
        data instanceof Date &&
        !isNaN(data.getTime())
    ) {

        return String(
            data.getDate()
        ).padStart(2, "0");
    }

    return null;
}
