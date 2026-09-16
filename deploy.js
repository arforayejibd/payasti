const Client = require('ssh2-sftp-client');
const path = require('path');
const os = require('os');
const fs = require('fs');

const config = {
  host: '103.112.62.87',
  port: 22,
  username: 'payasti',
  privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa')),
};

const REMOTE_BASE = '/home/payasti/payasti';

// Directories and files to upload
const SYNC_DIRS = [
  'config',
  'controllers',
  'data',
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

async function uploadDir(sftp, localDir, remoteDir) {
  await sftp.mkdir(remoteDir, true);
  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);
    const remotePath = path.posix.join(remoteDir, entry.name);

    // Skip temp/wal files
    if (entry.name.endsWith('-wal') || entry.name.endsWith('-shm') || entry.name.endsWith('.bak')) {
      continue;
    }

    if (entry.isDirectory()) {
      await uploadDir(sftp, localPath, remotePath);
    } else if (entry.isFile()) {
      console.log(`  📤 Uploading: ${path.relative(__dirname, localPath).replace(/\\/g, '/')}`);
      await sftp.fastPut(localPath, remotePath);
    }
  }
}

async function deploy() {
  const sftp = new Client();
  console.log('🚀 Connecting to Payasti live server via SFTP...');

  try {
    await sftp.connect(config);
    console.log('✅ Connected successfully to 103.112.62.87 as payasti!');

    // 1. Upload root files
    console.log('\n📄 Uploading root files...');
    for (const file of SYNC_FILES) {
      const localFile = path.join(__dirname, file);
      const remoteFile = path.posix.join(REMOTE_BASE, file);
      if (fs.existsSync(localFile)) {
        console.log(`  📤 Uploading: ${file}`);
        await sftp.fastPut(localFile, remoteFile);
      }
    }

    // 2. Upload directories
    for (const dir of SYNC_DIRS) {
      const localDir = path.join(__dirname, dir);
      const remoteDir = path.posix.join(REMOTE_BASE, dir);
      if (fs.existsSync(localDir)) {
        console.log(`\n📂 Syncing directory: ${dir}...`);
        await uploadDir(sftp, localDir, remoteDir);
      }
    }

    // 3. Ensure required packages are synced to cPanel nodevenv
    const REMOTE_NODE_MODULES = '/home/payasti/nodevenv/payasti/22/lib/node_modules';
    const packagesToSync = [
      'nodemailer',
      'mysql2',
      'aws-ssl-profiles',
      'generate-function',
      'iconv-lite',
      'long',
      'lru.min',
      'named-placeholders',
      'sql-escaper',
      'is-property',
      'destroy'
    ];

    console.log('\n📦 Syncing npm modules to cPanel nodevenv...');
    for (const pkg of packagesToSync) {
      const localPkg = path.join(__dirname, 'node_modules', pkg);
      const remotePkg = path.posix.join(REMOTE_NODE_MODULES, pkg);
      if (fs.existsSync(localPkg)) {
        console.log(`  📦 Syncing ${pkg}...`);
        await uploadDir(sftp, localPkg, remotePkg);
      }
    }
    console.log('✅ All required modules synced to cPanel nodevenv successfully!');

    // 4. Trigger Passenger / LiteSpeed restart
    console.log('\n🔄 Restarting application via tmp/restart.txt...');
    const tmpDir = path.posix.join(REMOTE_BASE, 'tmp');
    const restartFile = path.posix.join(tmpDir, 'restart.txt');
    await sftp.mkdir(tmpDir, true);
    await sftp.put(Buffer.from(new Date().toString()), restartFile);
    console.log('✅ Triggered Node.js app restart (tmp/restart.txt)!');

    console.log('\n🎉 ALL FILES DEPLOYED TO LIVE SERVER SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exitCode = 1;
  } finally {
    await sftp.end();
    console.log('🔌 Connection closed.');
  }
}

deploy();
