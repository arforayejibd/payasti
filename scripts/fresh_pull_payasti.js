const Client = require('ssh2-sftp-client');
const { Client: SSHClient } = require('ssh2');
const mysql = require('mysql2/promise');
const path = require('path');
const os = require('os');
const fs = require('fs');

const SSH_CONFIG = {
  host: '103.112.62.87',
  port: 22,
  username: 'payasti',
  privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa')),
};

const REMOTE_BASE = '/home/payasti/payasti';
const LOCAL_BASE = path.resolve(__dirname, '..');

const DIRS_TO_SYNC = [
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

const ROOT_FILES_TO_SYNC = [
  'server.js',
  'package.json',
  'package-lock.json'
];

async function removeLocalFiles() {
  console.log('🧹 1. Cleaning local project directories (preserving .git and node_modules)...');
  
  for (const dir of DIRS_TO_SYNC) {
    const dirPath = path.join(LOCAL_BASE, dir);
    if (fs.existsSync(dirPath) && dir !== 'scripts') {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`  🗑️ Removed local ${dir}/`);
      } catch (e) {
        console.warn(`  ⚠️ Could not remove ${dir}:`, e.message);
      }
    }
  }

  for (const file of ROOT_FILES_TO_SYNC) {
    const filePath = path.join(LOCAL_BASE, file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`  🗑️ Removed local ${file}`);
      } catch (e) {}
    }
  }
}

async function downloadLiveFiles() {
  const sftp = new Client();
  console.log(`\n🔌 2. Connecting via SFTP to ${SSH_CONFIG.host} (user: ${SSH_CONFIG.username})...`);
  await sftp.connect(SSH_CONFIG);
  console.log('✅ SFTP connection established!');

  // Root files
  console.log('\n📄 Downloading root files from live server...');
  for (const file of ROOT_FILES_TO_SYNC) {
    const remoteFile = `${REMOTE_BASE}/${file}`;
    const localFile = path.join(LOCAL_BASE, file);
    if (await sftp.exists(remoteFile)) {
      await sftp.fastGet(remoteFile, localFile);
      console.log(`  ⬇️ [Downloaded] ${file}`);
    }
  }

  // Directories
  for (const dir of DIRS_TO_SYNC) {
    const remoteDir = `${REMOTE_BASE}/${dir}`;
    const localDir = path.join(LOCAL_BASE, dir);

    if (await sftp.exists(remoteDir)) {
      console.log(`\n📁 Downloading directory: ${dir}/ ...`);
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
      console.log(`  ✅ Synced: ${dir}/`);
    }
  }

  await sftp.end();
  console.log('\n🎉 ALL CODE & ASSET FILES DOWNLOADED FROM LIVE SERVER!');
}

async function importLiveDatabase() {
  console.log(`\n🗄️ 3. Exporting live MySQL database (payasti_maindb) from server...`);

  const dumpSql = await new Promise((resolve, reject) => {
    const ssh = new SSHClient();
    ssh.on('ready', () => {
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

  const dumpFilePath = path.join(LOCAL_BASE, 'data', 'payasti_live_backup.sql');
  if (!fs.existsSync(path.dirname(dumpFilePath))) {
    fs.mkdirSync(path.dirname(dumpFilePath), { recursive: true });
  }
  fs.writeFileSync(dumpFilePath, dumpSql, 'utf8');

  console.log(`\n🔄 Importing into local MySQL database (payasti_db)...`);
  const localConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '258456',
    port: 3306,
    multipleStatements: true
  });

  await localConn.query('DROP DATABASE IF EXISTS payasti_db;');
  await localConn.query('CREATE DATABASE payasti_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
  await localConn.query('USE payasti_db;');
  await localConn.query('SET foreign_key_checks = 0;');

  const lines = dumpSql.split('\n');
  let currentQuery = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed.startsWith('/*')) continue;
    currentQuery += line + '\n';
    if (trimmed.endsWith(';')) {
      try {
        await localConn.query(currentQuery);
      } catch (e) {
        console.error('SQL Error:', e.message);
      }
      currentQuery = '';
    }
  }

  await localConn.query('SET foreign_key_checks = 1;');
  const [posts] = await localConn.query('SELECT COUNT(*) as count FROM posts;');
  const [users] = await localConn.query('SELECT COUNT(*) as count FROM users;');
  const [categories] = await localConn.query('SELECT COUNT(*) as count FROM categories;');
  console.log(`✅ DB Imported successfully! (Posts: ${posts[0].count}, Users: ${users[0].count}, Categories: ${categories[0].count})`);
  await localConn.end();
}

async function run() {
  try {
    await removeLocalFiles();
    await downloadLiveFiles();
    await importLiveDatabase();
    console.log('\n✨✨ FULL FRESH DOWNLOAD & DATABASE SYNC COMPLETED SUCCESSFULLY! ✨✨');
  } catch (err) {
    console.error('\n❌ Error in fresh pull:', err);
  }
}

run();
