const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const db = require('../config/database');

const sqlitePath = path.join(__dirname, '..', 'data', 'payasti.db');

if (!fs.existsSync(sqlitePath)) {
  console.error('❌ SQLite database not found at:', sqlitePath);
  process.exit(1);
}

const sqlite = new Database(sqlitePath);

async function runMigration() {
  console.log('🚀 Starting SQLite -> MySQL Data Migration...\n');

  // 1. Ensure MySQL schema is ready
  await db.initDatabase();

  const tables = [
    'users',
    'categories',
    'tags',
    'posts',
    'post_tags',
    'books',
    'comments',
    'notices',
    'settings',
    'password_resets'
  ];

  for (const tableName of tables) {
    try {
      const rows = sqlite.prepare(`SELECT * FROM "${tableName}"`).all();
      if (rows.length === 0) {
        console.log(`ℹ Table \`${tableName}\`: 0 rows (skipping)`);
        continue;
      }

      console.log(`⏳ Seeding \`${tableName}\` (${rows.length} rows)...`);
      const columns = Object.keys(rows[0]);
      const escapedCols = columns.map(c => `\`${c}\``).join(', ');
      const placeholders = columns.map(() => '?').join(', ');

      const sql = `REPLACE INTO \`${tableName}\` (${escapedCols}) VALUES (${placeholders})`;

      // Batch insert in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await Promise.all(chunk.map(row => {
          const values = columns.map(c => row[c]);
          return db.query(sql, values);
        }));
      }

      console.log(`✅ Table \`${tableName}\` successfully seeded with ${rows.length} rows!`);
    } catch (err) {
      console.error(`❌ Error seeding table \`${tableName}\`:`, err.message);
    }
  }

  console.log('\n🎉 ALL DATA SUCCESSFULLY SEEDED INTO MYSQL!');
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal Migration Error:', err);
      process.exit(1);
    });
}

module.exports = runMigration;
