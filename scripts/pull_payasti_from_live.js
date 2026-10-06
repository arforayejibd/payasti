const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');
const mysql = require('mysql2/promise');
const path = require('path');
const os = require('os');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const SSH_CONFIG = {
  host: '103.112.62.87',
  port: 22,
  username: 'payasti',
  privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa')),
};

const REMOTE_BASE = '/home/payasti/payasti';
const LOCAL_BASE = path.resolve(__dirname, '..');

const SYNC_DIRS = [
  'config',
  'controllers',
  'data',
  'helpers',
  'middleware',
  'public',
  'routes',
  'scripts',
  'services',
  'views'
];

const SYNC_FILES = [
  'server.js',
  'package.json',
  'package-lock.json'
];

async function pullCodeFiles() {
  const sftp = new Client();
  console.log(`\n🔌 1. Connecting via SFTP to Payasti Server (${SSH_CONFIG.host})...`);
  await sftp.connect(SSH_CONFIG);
  console.log(`✅ SFTP connected successfully!`);

  // 1. Sync Root Files
  console.log(`\n📄 Pulling root files...`);
  for (const file of SYNC_FILES) {
    const remoteFilePath = `${REMOTE_BASE}/${file}`;
    const localFilePath = path.join(LOCAL_BASE, file);

    const exists = await sftp.exists(remoteFilePath);
    if (exists) {
      await sftp.fastGet(remoteFilePath, localFilePath);
      console.log(`  ⬇️ Downloaded: ${file}`);
    } else {
      console.log(`  ⚠️ Remote file not found: ${file}`);
    }
  }

  // 2. Sync Directories
  for (const dir of SYNC_DIRS) {
    const remoteDir = `${REMOTE_BASE}/${dir}`;
    const localDir = path.join(LOCAL_BASE, dir);

    const dirExists = await sftp.exists(remoteDir);
    if (!dirExists) {
      console.log(`  ⚠️ Remote dir not found: ${dir}`);
      continue;
    }

    console.log(`📁 Syncing directory: ${dir}...`);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    await sftp.downloadDir(remoteDir, localDir, {
      filter: (itemPath) => {
        const basename = path.basename(itemPath);
        if (basename.includes('.before-') || basename.endsWith('.zip') || basename.endsWith('.log') || basename.endsWith('-wal') || basename.endsWith('-shm')) {
          return false;
        }
        return true;
      }
    });
    console.log(`  ✅ Synced directory: ${dir}`);
  }

  await sftp.end();
  console.log(`\n✅ All code & static asset files downloaded!`);
}

async function syncDatabase() {
  console.log(`\n🗄️ 2. Exporting live MySQL database (payasti_maindb) from server...`);

  const dumpSql = await new Promise((resolve, reject) => {
    const ssh = new SSHClient();
    ssh.on('ready', () => {
      // Export database dump using mysqldump
      const dumpCmd = 'mysqldump -u payasti_main -p"^9qzI6ksVX!6NN=!" payasti_maindb --default-character-set=utf8mb4 --single-transaction --quick';
      ssh.exec(dumpCmd, (err, stream) => {
        if (err) {
          ssh.end();
          return reject(err);
        }
        let sqlData = '';
        let errorData = '';
        stream.on('data', (d) => { sqlData += d.toString('utf8'); });
        stream.stderr.on('data', (d) => { errorData += d.toString(); });
        stream.on('close', (code) => {
          ssh.end();
          if (code === 0 && sqlData.length > 0) {
            resolve(sqlData);
          } else {
            reject(new Error(errorData || `mysqldump failed with code ${code}`));
          }
        });
      });
    }).on('error', reject).connect(SSH_CONFIG);
  });

  console.log(`✅ Received MySQL dump: ${(dumpSql.length / (1024 * 1024)).toFixed(2)} MB`);

  // Save dump backup locally
  const dumpFilePath = path.join(LOCAL_BASE, 'data', 'payasti_live_backup.sql');
  if (!fs.existsSync(path.dirname(dumpFilePath))) {
    fs.mkdirSync(path.dirname(dumpFilePath), { recursive: true });
  }
  fs.writeFileSync(dumpFilePath, dumpSql, 'utf8');
  console.log(`💾 Saved SQL dump to: data/payasti_live_backup.sql`);

  console.log(`\n🔄 Importing live dump into local MySQL database (payasti_db)...`);
  const localConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '258456',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    multipleStatements: true
  });

  await localConn.query(`CREATE DATABASE IF NOT EXISTS payasti_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await localConn.query(`USE payasti_db;`);
  
  // Disable foreign key checks during import
  await localConn.query(`SET foreign_key_checks = 0;`);
  await localConn.query(dumpSql);
  await localConn.query(`SET foreign_key_checks = 1;`);
  
  const [tables] = await localConn.query(`SHOW TABLES;`);
  console.log(`✅ Local database (payasti_db) synced successfully! Tables count: ${tables.length}`);

  const [postCount] = await localConn.query(`SELECT COUNT(*) as total FROM posts;`);
  console.log(`📊 Total Posts in Local DB: ${postCount[0].total}`);

  const [userCount] = await localConn.query(`SELECT COUNT(*) as total FROM users;`);
  console.log(`👥 Total Users in Local DB: ${userCount[0].total}`);

  await localConn.end();
}

async function main() {
  try {
    console.log(`=======================================================`);
    console.log(`   PULLING ALL LIVE DATA & CODE FROM PAYASTI.COM      `);
    console.log(`=======================================================`);

    await pullCodeFiles();
    await syncDatabase();

    console.log(`\n🎉🎉 ALL PAYASTI CODE & DATABASE SYNC COMPLETED SUCCESSFULLY! 🎉🎉\n`);
  } catch (err) {
    console.error(`\n❌ Error occurred during sync:`, err.message);
  }
}

main();
