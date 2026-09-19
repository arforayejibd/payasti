const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

dotenv.config();

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT_DIR, 'backup');
const CODE_BACKUP_DIR = path.join(BACKUP_DIR, 'code');

// Ensure directories exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
if (!fs.existsSync(CODE_BACKUP_DIR)) {
  fs.mkdirSync(CODE_BACKUP_DIR, { recursive: true });
}

// Items to copy (exclude node_modules, .git, backup, scratch)
const EXCLUDE = new Set(['node_modules', '.git', 'backup', 'scratch']);

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    for (const file of files) {
      if (EXCLUDE.has(file)) continue;
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function dumpDatabase(dbConfig, outputFile) {
  console.log(`📦 Exporting database [${dbConfig.database}] to SQL dump...`);
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
    charset: 'utf8mb4'
  });

  const writeStream = fs.createWriteStream(outputFile, { encoding: 'utf8' });
  writeStream.write(`-- Sera10 Database Backup\n`);
  writeStream.write(`-- Date: ${new Date().toISOString()}\n\n`);
  writeStream.write(`SET FOREIGN_KEY_CHECKS = 0;\n\n`);

  const [tables] = await connection.query('SHOW TABLES');
  const tableKey = `Tables_in_${dbConfig.database}`;

  for (const row of tables) {
    const tableName = row[tableKey] || Object.values(row)[0];
    
    // Get Create Table definition
    const [[createTableResult]] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
    const createSql = createTableResult['Create Table'];
    
    writeStream.write(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);
    writeStream.write(`${createSql};\n\n`);

    // Get Data
    const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
    if (rows.length > 0) {
      for (const dataRow of rows) {
        const columns = Object.keys(dataRow).map(k => `\`${k}\``).join(', ');
        const values = Object.values(dataRow).map(val => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return val;
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (val instanceof Date) {
            return `'${val.toISOString().replace('T', ' ').substring(0, 19)}'`;
          }
          const escaped = String(val)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\x00/g, '\\0');
          return `'${escaped}'`;
        }).join(', ');

        writeStream.write(`INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`);
      }
      writeStream.write(`\n`);
    }
  }

  writeStream.write(`SET FOREIGN_KEY_CHECKS = 1;\n`);
  writeStream.end();
  await connection.end();
  console.log(`✅ Database exported successfully to: ${outputFile}`);
}

async function main() {
  console.log('========================================');
  console.log('🚀 SERA10 FULL BACKUP GENERATION STARTED');
  console.log('========================================');

  // 1. Copy source code to backup/code/
  console.log('📂 Copying all project files into backup/code/...');
  const items = fs.readdirSync(ROOT_DIR);
  for (const item of items) {
    if (EXCLUDE.has(item)) continue;
    copyRecursive(path.join(ROOT_DIR, item), path.join(CODE_BACKUP_DIR, item));
  }
  console.log('✅ All code, views, routes, controllers, and assets copied to backup/code/');

  // 2. Dump Database
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sera10_db',
    port: parseInt(process.env.DB_PORT || '3306', 10)
  };

  const sqlDumpPath = path.join(BACKUP_DIR, 'sera10_database_backup.sql');
  try {
    await dumpDatabase(dbConfig, sqlDumpPath);
    // Also copy SQL dump inside backup/code
    fs.copyFileSync(sqlDumpPath, path.join(CODE_BACKUP_DIR, 'sera10_database_backup.sql'));
  } catch (err) {
    console.error('⚠️ Database dump warning:', err.message);
  }

  // 3. Create zip archive using PowerShell Compress-Archive
  console.log('🗜️ Creating backup.zip archive...');
  const zipPath = path.join(BACKUP_DIR, 'sera10_full_backup.zip');
  try {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${CODE_BACKUP_DIR}\\*' -DestinationPath '${zipPath}' -Force"`);
    const zipSizeMB = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
    console.log(`📦 Zip Archive created: ${zipPath} (${zipSizeMB} MB)`);
  } catch (err) {
    console.warn('⚠️ Zip compression note:', err.message);
  }

  console.log('\n========================================');
  console.log('🎉 FULL BACKUP COMPLETED SUCCESSFULLY!');
  console.log(`📁 Backup Folder: ${BACKUP_DIR}`);
  console.log(`📦 Standalone Zip: ${zipPath}`);
  console.log(`💾 Database Dump: ${sqlDumpPath}`);
  console.log('========================================');
}

main().catch(err => {
  console.error('❌ Backup process failed:', err);
  process.exit(1);
});
