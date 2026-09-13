const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data', 'payasti.db');
const db = new Database(dbPath, {
  // verbose: console.log
});

// Enable high-performance Pragmas
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB memory cache
db.pragma('temp_store = MEMORY');
db.pragma('mmap_size = 268435456'); // 256MB memory mapped I/O

// Ensure password_resets table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
`);

module.exports = db;
