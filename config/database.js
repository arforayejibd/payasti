const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data', 'payasti.db');
const db = new Database(dbPath, {
  // verbose: console.log
});

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

module.exports = db;
