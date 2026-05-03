const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const { saveVibrationsBatch } = require('./database');

const app = express();
const PORT = 3000;
const ESP_WS_URL = 'ws://192.168.4.1:81';

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Buffer para acumular datos y evitar saturación de disco
let dataBuffer = [];

// Conexión WebSocket al ESP8266
const connectToESP = () => {
    const ws = new WebSocket(ESP_WS_URL);

    ws.on('open', () => {
        console.log(`[WebSocket] Conectado exitosamente al ESP8266 en ${ESP_WS_URL}`);
    });

    ws.on('message', (message) => {
        try {
            // Intentar parsear si viene como JSON, de lo contrario manejarlo según formato
            const data = JSON.parse(message);
            dataBuffer.push(data);
        } catch (err) {
            // Si no es JSON, podríamos procesarlo como string o binario si fuera necesario
            // Por ahora, asumimos formato compatible o log de error
            console.error('[WebSocket] Error parseando mensaje:', message.toString());
        }
    });

    ws.on('error', (error) => {
        console.error('[WebSocket] Error de conexión:', error.message);
    });

    ws.on('close', () => {
        console.log('[WebSocket] Conexión cerrada. Reintentando en 5 segundos...');
        setTimeout(connectToESP, 5000);
    });
};

// Iniciar conexión con el sensor
connectToESP();

// Lógica de Persistencia por Lotes (Batch Insert) cada 200ms
setInterval(() => {
    if (dataBuffer.length > 0) {
        const batchToSave = [...dataBuffer];
        dataBuffer = []; // Limpiar buffer inmediatamente
        
        try {
            saveVibrationsBatch(batchToSave);
            // console.log(`[DB] Guardados ${batchToSave.length} registros.`);
        } catch (err) {
            console.error('[DB] Error en inserción masiva:', err);
        }
    }
}, 200);

app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(` Servidor de Monitoreo Motor AC Listo`);
    console.log(` Interfaz web: http://localhost:${PORT}`);
    console.log(` Base de Datos: datos_motor.sqlite`);
    console.log(`=================================================\n`);
});
