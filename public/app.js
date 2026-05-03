// Elementos del DOM
const tabVivo = document.getElementById('tab-vivo');
const tabHistorico = document.getElementById('tab-historico');
const containerVivo = document.getElementById('container-vivo');
const containerHistorico = document.getElementById('container-historico');

const rpmValor = document.getElementById('rpm-valor');
const rpmBar = document.getElementById('rpm-bar');
const isoValor = document.getElementById('iso-valor');
const gaugeIndicator = document.getElementById('gauge-indicator');
const connectionDot = document.getElementById('connection-dot');
const connectionStatus = document.getElementById('connection-status');

// Gráficas
const graficaContenedorVivo = document.getElementById('grafica-principal');
const graficaContenedorHistorico = document.getElementById('grafica-historico');

// Controles Histórico
const btnLoadData = document.getElementById('btn-load-data');
const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const playbackSlider = document.getElementById('playback-slider');
const selectSpeed = document.getElementById('select-speed');
const playbackInfo = document.getElementById('playback-info');

// Configuración de uPlot
let uplotVivo;
let uplotHistorico;
const windowSize = 1000; 
let currentMode = 'vivo'; // 'vivo' o 'historico'

// Datos
let chartDataVivo = [
    Array.from({length: windowSize}, (_, i) => i),
    new Array(windowSize).fill(0)
];

let historicalDataRaw = [];
let chartDataHistorico = [[], []];

// --- INICIALIZACIÓN ---

function initVivoChart() {
    graficaContenedorVivo.innerHTML = '';
    const rectVivo = graficaContenedorVivo.getBoundingClientRect();
    
    const optsVivo = {
        width: rectVivo.width,
        height: rectVivo.height,
        scales: { x: { time: false }, y: { range: [0, 20] } },
        series: [{}, { stroke: "#10b981", width: 2, points: { show: false } }],
        axes: [{ grid: { stroke: "#374151" }, stroke: "#9ca3af" }, { grid: { stroke: "#374151" }, stroke: "#9ca3af" }],
        cursor: { show: false }
    };
    window.uplotVivo = new uPlot(optsVivo, chartDataVivo, graficaContenedorVivo);
}

function initHistoricoChart() {
    graficaContenedorHistorico.innerHTML = '';
    const rectHist = graficaContenedorHistorico.getBoundingClientRect();
    const optsHist = {
        width: rectHist.width,
        height: rectHist.height,
        scales: { x: { time: false }, y: { range: [0, 20] } },
        series: [{}, { stroke: "#3b82f6", width: 2, points: { show: false } }],
        axes: [{ grid: { stroke: "#374151" }, stroke: "#9ca3af" }, { grid: { stroke: "#374151" }, stroke: "#9ca3af" }],
        cursor: { show: true }
    };
    window.uplotHistorico = new uPlot(optsHist, [[], []], graficaContenedorHistorico);
}

// --- LÓGICA DE WEBSOCKET (VIVO) ---

let incomingDataBuffer = [];
let uiBuffer = { rpm: [], vib: [] };

function connectWS() {
    const ws = new WebSocket(`ws://${window.location.hostname}:8080`);
    ws.onopen = () => updateConnectionStatus(true);
    ws.onmessage = (event) => {
        if (currentMode !== 'vivo') return;
        try {
            const data = JSON.parse(event.data);
            uiBuffer.rpm.push(data.rpm || 0);
            uiBuffer.vib.push(data.vibRMS || 0);
            incomingDataBuffer.push(data.vibRMS || 0);
        } catch (e) {}
    };
    ws.onclose = () => { updateConnectionStatus(false); setTimeout(connectWS, 2000); };
}

// --- LÓGICA DE PLAYBACK (HISTÓRICO) ---

let playbackIndex = 0;
let isPlaying = false;
let playbackTimer = null;

async function loadHistoricalData() {
    btnLoadData.textContent = "Cargando...";
    try {
        const res = await fetch('/api/historico?limit=10000');
        historicalDataRaw = await res.json();
        
        playbackSlider.max = historicalDataRaw.length - 1;
        playbackSlider.value = 0;
        playbackIndex = 0;
        
        // Inicializar gráfica con ventana vacía
        chartDataHistorico = [
            Array.from({length: windowSize}, (_, i) => i),
            new Array(windowSize).fill(0)
        ];
        initHistoricoChart();
        window.uplotHistorico.setData(chartDataHistorico);
        
        playbackInfo.textContent = `Puntos: 0 / ${historicalDataRaw.length}`;
        btnLoadData.textContent = "Cargar Histórico";
        alert(`Se cargaron ${historicalDataRaw.length} registros.`);
    } catch (e) {
        console.error(e);
        btnLoadData.textContent = "Error";
    }
}

function startPlayback() {
    if (isPlaying || historicalDataRaw.length === 0) return;
    isPlaying = true;
    btnPlay.classList.add('hidden');
    btnPause.classList.remove('hidden');
    
    const run = () => {
        if (!isPlaying) return;
        
        const speed = parseInt(selectSpeed.value);
        for (let i = 0; i < speed; i++) {
            if (playbackIndex >= historicalDataRaw.length) {
                pausePlayback();
                return;
            }
            
            const data = historicalDataRaw[playbackIndex];
            
            // Actualizar UI
            updateRPM(data.rpm);
            updateISO(data.vibRMS);
            
            // Actualizar Gráfica
            chartDataHistorico[1].push(data.vibRMS);
            if (chartDataHistorico[1].length > windowSize) chartDataHistorico[1].shift();
            
            playbackIndex++;
        }
        
        window.uplotHistorico.setData(chartDataHistorico);
        playbackSlider.value = playbackIndex;
        playbackInfo.textContent = `Puntos: ${playbackIndex} / ${historicalDataRaw.length}`;
        
        playbackTimer = requestAnimationFrame(run);
    };
    playbackTimer = requestAnimationFrame(run);
}

function pausePlayback() {
    isPlaying = false;
    btnPlay.classList.remove('hidden');
    btnPause.classList.add('hidden');
    if (playbackTimer) cancelAnimationFrame(playbackTimer);
}

playbackSlider.oninput = () => {
    playbackIndex = parseInt(playbackSlider.value);
    playbackInfo.textContent = `Puntos: ${playbackIndex} / ${historicalDataRaw.length}`;
    // Opcional: Actualizar gráfica al mover slider
    if (!isPlaying && historicalDataRaw[playbackIndex]) {
        updateRPM(historicalDataRaw[playbackIndex].rpm);
        updateISO(historicalDataRaw[playbackIndex].vibRMS);
    }
};

// --- CICLOS Y EVENTOS ---

function renderLoopVivo() {
    if (currentMode === 'vivo' && incomingDataBuffer.length > 0) {
        const newPoints = [...incomingDataBuffer];
        incomingDataBuffer = [];
        newPoints.forEach(val => {
            chartDataVivo[1].push(val);
            if (chartDataVivo[1].length > windowSize) chartDataVivo[1].shift();
        });
        if (window.uplotVivo) window.uplotVivo.setData(chartDataVivo);
    }
    requestAnimationFrame(renderLoopVivo);
}

setInterval(() => {
    if (currentMode === 'vivo' && uiBuffer.rpm.length > 0) {
        const avgRPM = uiBuffer.rpm.reduce((a, b) => a + b, 0) / uiBuffer.rpm.length;
        const avgVib = uiBuffer.vib.reduce((a, b) => a + b, 0) / uiBuffer.vib.length;
        updateRPM(avgRPM);
        updateISO(avgVib);
        uiBuffer.rpm = []; uiBuffer.vib = [];
    }
}, 500);

// Pestañas
tabVivo.onclick = () => {
    currentMode = 'vivo';
    containerVivo.classList.remove('hidden');
    containerHistorico.classList.add('hidden');
    tabVivo.className = "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-lg";
    tabHistorico.className = "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all text-gray-400 hover:text-white hover:bg-dashboard-card";
    pausePlayback();
};

tabHistorico.onclick = () => {
    currentMode = 'historico';
    containerVivo.classList.add('hidden');
    containerHistorico.classList.remove('hidden');
    tabHistorico.className = "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-lg";
    tabVivo.className = "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all text-gray-400 hover:text-white hover:bg-dashboard-card";
};

// Auxiliares UI
function updateRPM(rpm) {
    const val = Math.round(rpm);
    rpmValor.textContent = val;
    rpmBar.style.width = `${Math.min((val / 4000) * 100, 100)}%`;
}

function updateISO(vibRMS) {
    isoValor.textContent = vibRMS.toFixed(2);
    gaugeIndicator.style.strokeDashoffset = 314 * (1 - Math.min(vibRMS / 20, 1));
    if (vibRMS < 4.5) gaugeIndicator.style.stroke = '#22c55e';
    else if (vibRMS < 7.1) gaugeIndicator.style.stroke = '#f59e0b';
    else if (vibRMS < 11.2) gaugeIndicator.style.stroke = '#f97316';
    else gaugeIndicator.style.stroke = '#ef4444';
}

function updateConnectionStatus(connected) {
    connectionDot.className = `w-3.5 h-3.5 rounded-full ring-2 ring-dashboard-card ${connected ? 'connection-connected' : 'connection-disconnected'}`;
    connectionStatus.textContent = connected ? 'ESP8266 Conectado' : 'Desconectado';
}

// Init
initVivoChart();
initHistoricoChart();
connectWS();
renderLoopVivo();

btnLoadData.onclick = loadHistoricalData;
btnPlay.onclick = startPlayback;
btnPause.onclick = pausePlayback;
