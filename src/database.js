const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'datos_motor.sqlite');
const db = new Database(dbPath);

// Configuración de la tabla
db.exec(`
  CREATE TABLE IF NOT EXISTS vibraciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    rpm INTEGER,
    accX REAL,
    accY REAL,
    vibRMS REAL
  )
`);

// Preparar la sentencia de inserción
const insertStmt = db.prepare(`
  INSERT INTO vibraciones (timestamp, rpm, accX, accY, vibRMS)
  VALUES (?, ?, ?, ?, ?)
`);

/**
 * Inserta un lote de datos en una sola transacción para optimizar el I/O de disco.
 * @param {Array} dataBatch - Array de objetos con los datos del motor
 */
const saveVibrationsBatch = db.transaction((dataBatch) => {
  for (const data of dataBatch) {
    // Asumimos que los datos vienen mapeados o los extraemos aquí
    insertStmt.run(
      data.timestamp || new Date().toISOString(),
      data.rpm || 0,
      data.accX || 0,
      data.accY || 0,
      data.vibRMS || 0
    );
  }
});

module.exports = {
  saveVibrationsBatch
};
