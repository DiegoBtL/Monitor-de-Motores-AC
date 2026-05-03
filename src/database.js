const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'datos_motor.sqlite');
const db = new Database(dbPath);

// ==============================================================
// 1. INICIALIZACIÓN SÍNCRONA DIRECTA
// Se ejecuta al instante. Garantiza que la tabla existe ANTES
// de que preparemos cualquier sentencia SQL.
// ==============================================================
db.exec(`
    CREATE TABLE IF NOT EXISTS mediciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        rpm INTEGER,
        accX REAL,
        accY REAL,
        vibRMS REAL
    );
`);
console.log("[DB] Tabla 'mediciones' verificada/creada correctamente.");

// ==============================================================
// 2. PREPARACIÓN DE SENTENCIAS
// Ahora es seguro prepararlas porque la tabla existe sí o sí.
// ==============================================================
const insertStmt = db.prepare(`
  INSERT INTO mediciones (rpm, accX, accY, vibRMS)
  VALUES (?, ?, ?, ?)
`);

// ==============================================================
// 3. FUNCIONES DE EXPORTACIÓN
// ==============================================================

/**
 * Inserta un lote de datos en una sola transacción para optimizar el I/O de disco.
 * @param {Array} dataBatch - Array de objetos con los datos del motor
 */
const saveVibrationsBatch = db.transaction((dataBatch) => {
  for (const data of dataBatch) {
    insertStmt.run(
      data.rpm || 0,
      data.accX || 0,
      data.accY || 0,
      data.vibRMS || 0
    );
  }
});

/**
 * Obtiene los registros de la base de datos con filtros opcionales.
 * @param {string} inicio - Fecha de inicio para el filtro.
 * @param {string} fin - Fecha de fin para el filtro.
 * @param {number} limit - Cantidad de registros a recuperar.
 */
const getHistoricalData = (inicio, fin, limit) => {
    let query = `
        SELECT timestamp, rpm, accX, accY, vibRMS
        FROM mediciones
    `;

    let params = [];

    if (inicio && fin) {
        query += ` WHERE timestamp BETWEEN ? AND ?`;
        params = [inicio, fin];
    }   

    query += ` ORDER BY timestamp DESC`;

    if (limit) {
        query += ` LIMIT ?`;
        params.push(limit);
    }

    const stmt = db.prepare(query);
    // Retornamos el array revertido (reverse) para que el gráfico de uPlot 
    // lo pinte de izquierda a derecha (del dato más antiguo al más reciente)
    return stmt.all(...params).reverse();
};

/**
 * Mantenemos la función initDatabase para no romper el backend.js
 * si es que este intenta llamarla en su arranque.
 */
const initDatabase = async () => {
    // Ya está inicializada arriba de forma síncrona, así que solo resolvemos
    return Promise.resolve(true);
};

module.exports = {
  saveVibrationsBatch,
  getHistoricalData,
  initDatabase
};