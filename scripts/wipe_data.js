const fs = require('fs');
const path = require('path');
const db = require('../config/database');

console.log('--- Wiping All Data from Database ---');

// Disable foreign keys temporarily for clean truncation
db.pragma('foreign_keys = OFF');

// Get all user tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

db.transaction(() => {
  for (const table of tables) {
    db.prepare(`DELETE FROM "${table.name}"`).run();
    console.log(`Cleared table: ${table.name}`);
  }
  
  // Reset sqlite autoincrement sequence
  try {
    db.prepare("DELETE FROM sqlite_sequence").run();
    console.log('Reset sqlite_sequence.');
  } catch (e) {
    // sqlite_sequence might not exist if no autoincrement was used yet
  }
})();

// Re-enable foreign keys
db.pragma('foreign_keys = ON');

// Vacuum database to reclaim space and shrink db file
console.log('Vacuuming database...');
db.exec('VACUUM');

console.log('--- Cleaning Upload Files ---');
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  for (const file of files) {
    if (file === 'avatars') continue; // Keep author avatars safe!
    const filePath = path.join(uploadsDir, file);
    if (fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
      console.log(`Deleted upload: ${file}`);
    }
  }
}

console.log('\n--- Verification ---');
for (const table of tables) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM "${table.name}"`).get().c;
  console.log(`${table.name}: ${count} rows`);
}

const remainingUploads = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
console.log(`Remaining uploads: ${remainingUploads.length} files`);
console.log('\nAll project data has been completely wiped successfully.');
