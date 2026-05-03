# 🤖 Project Context: VibSensor (Vibration & RPM Monitor)

Sistema de monitoreo de condición para motores de corriente alterna (AC) con visualización en tiempo real y análisis histórico.

## 🛠 Stack Tecnológico

| Capa | Tecnología |
|------|-------------|
| **Backend** | Node.js (Express) + `ws` (WebSocket) + `better-sqlite3` |
| **Frontend** | HTML5, TailwindCSS, uPlot.js (gráficos de alto rendimiento) |
| **Hardware** | ESP8266/ESP32 (sensor emulado: Access Point `VibSensor_Emulador`) |

## 📡 Conectividad

- **Puerto 3000:** Servidor HTTP (Interfaz web)
- **Puerto 8080:** WebSocket → Frontend (datos en tiempo real)
- **WebSocket ESP:** `ws://192.168.4.1:81` (desde ESP8266)
- **Base de datos:** `datos_motor.sqlite` (persistencia SQLite)

## 📊 Arquitectura de Datos

- **Frecuencia de adquisición:** ~200 Hz (del sensor)
- **Buffer de insertion:** Lotes cada 200ms (~40 registros por lote)
- **Gráficas:** 60 FPS (desacoplado de la frecuencia de recepción)
- **UI gauges:** 2 Hz (500ms) para texto/barras

## 📋 Estado Actual del Proyecto

### ✅ Completado

1. **Monitoreo en Vivo (Phase 1-3)**
   - WebSocket servidor en puerto 8080
   - Gráfica uPlot con ventana deslizante (1000 puntos)
   - Indicador RPM con barra de progreso
   - Gauge ISO 2372 con umbrales de severidad (verde/amarillo/naranja/rojo)
   - Estado de conexión en tiempo real

2. **Base de Datos (Phase 4)**
   - Schema SQLite con columna `timestamp`
   - Inserción por lotes (transaction) para performance
   - Endpoint `/api/historico` con filtros de fecha y límite

3. **Interfaz de Análisis Histórico (Phase 5 - En desarrollo)**
   - Panel de filtros de fecha (inicio/fin)
   - Gráfica uPlot histórica (instancia separada)
   - Controles de reproducción: Play/Pause
   - Slider de navegación temporal
   - Selector de velocidad (x1, x2, x5, x10)
   - Contador de puntos reproducidos

### 🔄 En Progreso

- **Playback histórico:** Lógica de reproducción con `requestAnimationFrame`
- **Navegación temporal:** Slider vinculado a datos históricos
- **Sincronización de UI:** Indicadores RPM/ISO durante playback

### ⏳ Pendiente

- Exportación de datos a CSV
- Análisis ISO 2372 visual en gráficas (overlays de zonas)
- Empaquetado multiplataforma (Tauri para Windows, Capacitor para Android)
- Selección de directorio de almacenamiento

## 🎯 Reglas Críticas para Desarrollo

1. **Gráficas uPlot:**
   - Contenedores con `height` FIJA (400px) en CSS
   - Instancias separadas: `uplotVivo` (verde) y `uplotHistorico` (azul)
   - Usar `requestAnimationFrame` para renderizado

2. **Performance:**
   - Buffer de datos desacoplado del renderizado
   - UI text/gauge a 2Hz, charts a 60FPS
   - Batch inserts a SQLite cada 200ms

3. **Sincronización:**
   - `currentMode` ('vivo' | 'historico') controla flujo de datos
   - Pause playback al cambiar a pestaña Vivo

## 📁 Archivos Clave

| Archivo | Propósito |
|---------|------------|
| `src/backend.js` | Servidor Express + WebSocket + API |
| `src/database.js` | Schema SQLite + queries + batch insert |
| `public/app.js` | Lógica frontend, uPlot, playback |
| `public/index.html` | UI con TailwindCSS |
| `public/style.css` | Estilos específicos de gráficas |

## 🚀 Próximos Pasos

1. **Finalizar playback histórico:**
   - Validar que la navegación con slider actualice la gráfica
   - Mostrar marcas de tiempo en el slider (inicio/fin)
   - Sincronizar gauge RPM/ISO durante reproducción

2. **Refinar endpoint histórico:**
   - Integrar filtros de fecha (`inicio`/`fin`)
   - Optimizar queries para grandes rangos de tiempo

3. **Testing:**
   - Probar con emulador ESP8266
   - Verificar persistsencia de datos en SQLite