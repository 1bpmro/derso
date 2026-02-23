// features/admin.js

import { STATE } from "../core/state.js";
import { CONFIG } from "../core/config.js";
import { registrarLog } from "../services/logger.js";

export async function iniciarPainelAdmin() {
    window.__ADMIN_MODE__ = true;
    
    // Carregar biblioteca de gráficos dinamicamente
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
                    <h3 style="margin:0; color:var(--azul-marinho);">📊 DASHBOARD ESTRATÉGICO</h3>
                    <small>1º BPM - Gestão de Efetivo</small>
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

            <div style="background:white; padding:15px; border-radius:12px; margin-bottom:20px; box-shadow: var(--sombra-suave);">
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
                        </tr>
                    </thead>
                    <tbody id="adminTableBody">
                        <tr><td colspan="3" style="text-align:center; padding:20px;">Sincronizando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById("btnAdminExit").onclick = () => location.reload();
    document.getElementById("adminSearch").oninput = filtrarPainel;
    document.getElementById("filterMes").onchange = filtrarPainel;
    document.getElementById("btnExportCSV").onclick = exportarParaEscala;

    await carregarDadosGlobais();
}

async function carregarDadosGlobais() {
    try {
        const token = localStorage.getItem("derso_session_token");
        const resp = await fetch(`${CONFIG.API_URL}?action=readall&token=${token}`);
        const dados = await resp.json();

        if (dados.error) throw new Error(dados.error);

        STATE.listaCompletaAdmin = dados;
        renderizarTudo(dados);
        inicializarGrafico(dados);

    } catch (err) {
        registrarLog("ADMIN_ERRO", err.message, "ERRO");
    }
}

function renderizarTudo(lista) {
    const tbody = document.getElementById("adminTableBody");
    document.getElementById("countTotal").textContent = lista.length;
    
    const mesAtual = (new Date().getMonth() + 1).toString().padStart(2, '0');
    document.getElementById("countMes").textContent = lista.filter(i => i.data.split('/')[1] === mesAtual).length;

    tbody.innerHTML = lista.map(item => `
        <tr>
            <td>
                <div style="font-weight:700; font-size:13px;">${item.nome}</div>
                <div style="font-size:10px; color:#777;">Mat: ${item.matricula}</div>
            </td>
            <td style="font-size:11px; font-weight:bold;">${item.data}</td>
            <td><span class="tag-folga">${item.folga}</span></td>
        </tr>
    `).join("");
}

function inicializarGrafico(dados) {
    const ctx = document.getElementById('chartFolgas').getContext('2d');
    const tipos = {};
    dados.forEach(d => tipos[d.folga] = (tipos[d.folga] || 0) + 1);

    if (window.meuGrafico) window.meuGrafico.destroy();

    window.meuGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(tipos),
            datasets: [{
                label: 'Solicitações por Tipo',
                data: Object.values(tipos),
                backgroundColor: ['#1A3C6E', '#FFD700', '#2E7D32', '#ef6c00'],
                borderRadius: 5
            }]
        },
        options: { plugins: { legend: { display: false } } }
    });
}

function filtrarPainel() {
    const termo = document.getElementById("adminSearch").value.toLowerCase();
    const mes = document.getElementById("filterMes").value;
    
    const filtrados = STATE.listaCompletaAdmin.filter(i => {
        const bateTexto = i.nome.toLowerCase().includes(termo) || i.matricula.includes(termo);
        const bateMes = mes === "" || i.data.split('/')[1] === mes;
        return bateTexto && bateMes;
    });

    renderizarTudo(filtrados);
}

function exportarParaEscala() {
    const dados = STATE.listaCompletaAdmin;
    if (!dados || dados.length === 0) return;

    let csv = "\ufeffDATA;MATRICULA;NOME;TIPO_FOLGA\n";
    dados.forEach(i => {
        csv += `${i.data};${i.matricula};${i.nome};${i.folga || i.tipo}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `DERSO_1BPM_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
}
