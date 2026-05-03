// ==========================================
// ELEMENTOS DEL DOM
// ==========================================
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
const btnLoadData = document.getElementById('btn-load-data'); // Botón "Cargar"
const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const playbackSlider = document.getElementById('playback-slider');
const selectSpeed = document.getElementById('select-speed');
const playbackInfo = document.getElementById('playback-info');

// Inputs de Fecha (Nuevos para la Fase 5)
const inputFechaInicio = document.getElementById('fecha-inicio');
const inputFechaFin = document.getElementById('fecha-fin');

// ==========================================
// CONFIGURACIÓN UPLOT Y ESTADO GLOBAL
// ==========================================
const windowSize = 1000; 
let currentMode = 'vivo'; // 'vivo' o 'historico'

// Variables de Instancias
window.uplotVivo = null;
window.uplotHistorico = null;

// Buffers de Datos
let chartDataVivo = [
    Array.from({length: windowSize}, (_, i) => i),
    new Array(windowSize).fill(0)
];

let historicalDataRaw = [];
let chartDataHistorico = [[], []];

// ==========================================
// INICIALIZACIÓN DE GRÁFICAS
// ==========================================

function initVivoChart() {
    graficaContenedorVivo.innerHTML = '';
    const rectVivo = graficaContenedorVivo.getBoundingClientRect();
    
    const optsVivo = {
        width: rectVivo.width || 800,
        height: rectVivo.height || 400,
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
        width: rectHist.width || 800,
        height: rectHist.height || 400,
        scales: { x: { time: false }, y: { range: [0, 20] } },
        series: [{}, { stroke: "#3b82f6", width: 2, points: { show: false } }],
        axes: [{ grid: { stroke: "#374151" }, stroke: "#9ca3af" }, { grid: { stroke: "#374151" }, stroke: "#9ca3af" }],
        cursor: { show: true }
    };
    // Inicializar vacía
    chartDataHistorico = [
        Array.from({length: windowSize}, (_, i) => i),
        new Array(windowSize).fill(0)
    ];
    window.uplotHistorico = new uPlot(optsHist, chartDataHistorico, graficaContenedorHistorico);
}

// ==========================================
// LÓGICA DE WEBSOCKET (MODO VIVO)
// ==========================================

let incomingDataBuffer = [];
let uiBuffer = { rpm: [], vib: [] };

function connectWS() {
    const ws = new WebSocket(`ws://${window.location.hostname}:8080`);
    ws.onopen = () => updateConnectionStatus(true);
    ws.onmessage = (event) => {
        if (currentMode !== 'vivo') return; // Cortafuegos para no saturar CPU en modo histórico
        try {
            const data = JSON.parse(event.data);
            uiBuffer.rpm.push(data.rpm || 0);
            uiBuffer.vib.push(data.vibRMS || 0);
            incomingDataBuffer.push(data.vibRMS || 0);
        } catch (e) {}
    };
    ws.onclose = () => { updateConnectionStatus(false); setTimeout(connectWS, 2000); };
}

// ==========================================
// LÓGICA DE PLAYBACK (MODO HISTÓRICO)
// ==========================================

let playbackIndex = 0;
let isPlaying = false;
let playbackTimer = null;

async function loadHistoricalData() {
    if (!btnLoadData) return;
    btnLoadData.textContent = "Cargando...";
    
    try {
        let url = '/api/historico';
        const params = new URLSearchParams();
        
        // Capturar fechas si existen en el HTML
        if (inputFechaInicio && inputFechaInicio.value) params.append('inicio', inputFechaInicio.value);
        if (inputFechaFin && inputFechaFin.value) params.append('fin', inputFechaFin.value);
        
        if (params.toString()) url += `?${params.toString()}`;
        
        const res = await fetch(url);
        historicalDataRaw = await res.json();
        
        if (historicalDataRaw.length === 0) {
            alert("No hay datos en el rango seleccionado.");
            btnLoadData.textContent = "Cargar Histórico";
            return;
        }

        // Configurar Slider
        playbackSlider.max = historicalDataRaw.length - 1;
        playbackSlider.value = 0;
        playbackIndex = 0;
        
        // Resetear la gráfica histórica (Efecto Rolling Window)
        chartDataHistorico = [
            Array.from({length: windowSize}, (_, i) => i),
            new Array(windowSize).fill(0)
        ];
        
        if (!window.uplotHistorico) initHistoricoChart();
        window.uplotHistorico.setData(chartDataHistorico);
        
        playbackInfo.textContent = `Puntos: 0 / ${historicalDataRaw.length}`;
        btnLoadData.textContent = "Cargar Histórico";
        alert(`Éxito: Se cargaron ${historicalDataRaw.length} registros para analizar.`);
        
    } catch (e) {
        console.error("Error cargando historial:", e);
        btnLoadData.textContent = "Error al Cargar";
        alert("Hubo un error de conexión con la base de datos.");
    }
}

function startPlayback() {
    if (isPlaying || historicalDataRaw.length === 0) return;
    isPlaying = true;
    
    if (btnPlay) btnPlay.classList.add('hidden');
    if (btnPause) btnPause.classList.remove('hidden');
    
    const run = () => {
        if (!isPlaying) return;
        
        const speed = selectSpeed ? parseInt(selectSpeed.value) : 1;
        
        // Avanzar N puntos por frame dependiendo de la velocidad
        for (let i = 0; i < speed; i++) {
            if (playbackIndex >= historicalDataRaw.length) {
                pausePlayback();
                return;
            }
            
            const data = historicalDataRaw[playbackIndex];
            
            // Compatibilidad robusta: Soporta si la DB devuelve 'vibRMS' o 'valor_vibracion'
            const vibValue = data.vibRMS !== undefined ? data.vibRMS : (data.valor_vibracion || 0);
            const rpmValue = data.rpm || 0;
            
            // Actualizar Textos y UI
            updateRPM(rpmValue);
            updateISO(vibValue);
            
            // Empujar al array de la gráfica
            chartDataHistorico[1].push(vibValue);
            if (chartDataHistorico[1].length > windowSize) {
                chartDataHistorico[1].shift();
            }
            
            playbackIndex++;
        }
        
        // Renderizar gráfica y slider
        window.uplotHistorico.setData(chartDataHistorico);
        if (playbackSlider) playbackSlider.value = playbackIndex;
        if (playbackInfo) playbackInfo.textContent = `Puntos: ${playbackIndex} / ${historicalDataRaw.length}`;
        
        playbackTimer = requestAnimationFrame(run);
    };
    
    playbackTimer = requestAnimationFrame(run);
}

function pausePlayback() {
    isPlaying = false;
    if (btnPlay) btnPlay.classList.remove('hidden');
    if (btnPause) btnPause.classList.add('hidden');
    if (playbackTimer) cancelAnimationFrame(playbackTimer);
}

// Salto manual en el tiempo al mover el slider
if (playbackSlider) {
    playbackSlider.oninput = () => {
        playbackIndex = parseInt(playbackSlider.value);
        if (playbackInfo) playbackInfo.textContent = `Puntos: ${playbackIndex} / ${historicalDataRaw.length}`;
        
        if (historicalDataRaw[playbackIndex]) {
            const data = historicalDataRaw[playbackIndex];
            const vibValue = data.vibRMS !== undefined ? data.vibRMS : (data.valor_vibracion || 0);
            updateRPM(data.rpm || 0);
            updateISO(vibValue);
            
            // Actualizamos la gráfica inyectando este dato
            chartDataHistorico[1].push(vibValue);
            if (chartDataHistorico[1].length > windowSize) chartDataHistorico[1].shift();
            if (window.uplotHistorico) window.uplotHistorico.setData(chartDataHistorico);
        }
    };
}

// ==========================================
// CICLOS Y EVENTOS GENERALES
// ==========================================

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

// Suavizador visual de RPM/ISO (Throttle a 2Hz)
setInterval(() => {
    if (currentMode === 'vivo' && uiBuffer.rpm.length > 0) {
        const avgRPM = uiBuffer.rpm.reduce((a, b) => a + b, 0) / uiBuffer.rpm.length;
        const avgVib = uiBuffer.vib.reduce((a, b) => a + b, 0) / uiBuffer.vib.length;
        updateRPM(avgRPM);
        updateISO(avgVib);
        uiBuffer.rpm = []; uiBuffer.vib = [];
    }
}, 500);

// Control de Pestañas
tabVivo.onclick = () => {
    currentMode = 'vivo';
    containerVivo.classList.remove('hidden');
    containerHistorico.classList.add('hidden');
    tabVivo.className = "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-lg";
    tabHistorico.className = "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all text-gray-400 hover:text-white hover:bg-dashboard-card";
    pausePlayback(); // Asegurar que el playback se detiene al ver en vivo
    
    // Forzar redibujado de la gráfica por si cambió de tamaño estando oculta
    setTimeout(() => { if (window.uplotVivo) window.uplotVivo.setSize(graficaContenedorVivo.getBoundingClientRect()); }, 50);
};

tabHistorico.onclick = () => {
    currentMode = 'historico';
    containerVivo.classList.add('hidden');
    containerHistorico.classList.remove('hidden');
    tabHistorico.className = "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-lg";
    tabVivo.className = "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all text-gray-400 hover:text-white hover:bg-dashboard-card";
    
    // Forzar redibujado de la gráfica histórica
    setTimeout(() => { if (window.uplotHistorico) window.uplotHistorico.setSize(graficaContenedorHistorico.getBoundingClientRect()); }, 50);
};

// ==========================================
// UTILIDADES UI
// ==========================================

function updateRPM(rpm) {
    const val = Math.round(rpm);
    rpmValor.textContent = val;
    rpmBar.style.width = `${Math.min((val / 4000) * 100, 100)}%`;
}

function updateISO(vibRMS) {
    isoValor.textContent = vibRMS.toFixed(2);
    // Lógica del Gauge SVG
    if(gaugeIndicator) {
        gaugeIndicator.style.strokeDashoffset = 314 * (1 - Math.min(vibRMS / 20, 1));
        if (vibRMS < 4.5) gaugeIndicator.style.stroke = '#22c55e'; // Verde
        else if (vibRMS < 7.1) gaugeIndicator.style.stroke = '#f59e0b'; // Amarillo
        else if (vibRMS < 11.2) gaugeIndicator.style.stroke = '#f97316'; // Naranja
        else gaugeIndicator.style.stroke = '#ef4444'; // Rojo
    }
}

function updateConnectionStatus(connected) {
    connectionDot.className = `w-3.5 h-3.5 rounded-full ring-2 ring-dashboard-card ${connected ? 'connection-connected' : 'connection-disconnected'}`;
    connectionStatus.textContent = connected ? 'ESP Emulador Conectado' : 'Desconectado (Esperando...)';
}

// ==========================================
// ARRANQUE DEL SISTEMA
// ==========================================

// Inicializar gráficas primero
initVivoChart();
initHistoricoChart();

// Conectar WebSockets y arrancar bucle de renderizado principal
connectWS();
renderLoopVivo();

// Bindear botones a funciones
if (btnLoadData) btnLoadData.onclick = loadHistoricalData;
if (btnPlay) btnPlay.onclick = startPlayback;
if (btnPause) btnPause.onclick = pausePlayback;