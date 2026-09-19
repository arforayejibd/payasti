const Client = require('ssh2-sftp-client');
const path = require('path');
const os = require('os');
const fs = require('fs');
const https = require('https');

// 1. Server SSH/SFTP Configuration
const config = {
  host: '103.112.62.87',
  port: 22,
  username: 'ecstolin',
  privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa')),
};

const REMOTE_BASE = '/home/ecstolin/sera10';

// 2. Project Directories to sync
const SYNC_DIRS = [
  'config',
  'controllers',
  'data',
  'middleware',
  'public',
  'routes',
  'services',
  'src',
  'views'
];

// 3. Project Root Files to sync
const SYNC_FILES = [
  'app.js',
  'server.js',
  'package.json',
  'package-lock.json'
];

// 4. Exact production runtime packages required by the application
const REQUIRED_PACKAGES = [
  "accepts", "append-field", "aws-ssl-profiles", "bcryptjs", "body-parser",
  "buffer-equal-constant-time", "buffer-from", "busboy", "bytes",
  "call-bind-apply-helpers", "call-bound", "compressible", "compression",
  "concat-stream", "content-disposition", "content-type", "cookie",
  "cookie-parser", "cookie-signature", "debug", "depd", "destroy",
  "dotenv", "dunder-proto", "ecdsa-sig-formatter", "ee-first", "ejs",
  "encodeurl", "es-define-property", "es-errors", "es-object-atoms",
  "escape-html", "etag", "express", "express-session", "finalhandler",
  "forwarded", "fresh", "function-bind", "generate-function", "get-intrinsic",
  "get-proto", "gopd", "has-symbols", "hasown", "http-errors", "iconv-lite",
  "inherits", "ipaddr.js", "is-promise", "is-property", "jsonwebtoken",
  "jwa", "jws", "lodash.includes", "lodash.isboolean", "lodash.isinteger",
  "lodash.isnumber", "lodash.isplainobject", "lodash.isstring", "lodash.once",
  "long", "lru.min", "math-intrinsics", "media-typer", "merge-descriptors",
  "mime-db", "mime-types", "ms", "multer", "mysql2", "named-placeholders",
  "negotiator", "nodemailer", "object-inspect", "on-finished", "on-headers",
  "once", "parseurl", "path-to-regexp", "proxy-addr", "qs", "random-bytes",
  "range-parser", "raw-body", "readable-stream", "router", "safe-buffer",
  "safer-buffer", "semver", "send", "serve-static", "setprototypeof",
  "side-channel", "side-channel-list", "side-channel-map", "side-channel-weakmap",
  "slugify", "sql-escaper", "statuses", "streamsearch", "string_decoder",
  "toidentifier", "type-is", "typedarray", "uid-safe", "unpipe",
  "util-deprecate", "vary", "wrappy"
];

const SKIP_DIR_NAMES = new Set(['test', 'tests', 'docs', 'example', 'examples', '.github', 'benchmark', 'benchmarks', 'coverage', '.bin', '@types']);
const SKIP_EXTENSIONS = ['.d.ts', '.map', '.md', '.markdown', '.ts', '.yml', '.yaml', '-wal', '-shm', '.bak'];

// Recursive upload helper
async function uploadDir(sftp, localDir, remoteDir, isNodeModules = false) {
  await sftp.mkdir(remoteDir, true);
  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.git') continue;

    if (isNodeModules) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      if (SKIP_EXTENSIONS.some(ext => entry.name.endsWith(ext))) continue;
    }

    const localPath = path.join(localDir, entry.name);
    const remotePath = path.posix.join(remoteDir, entry.name);

    if (entry.isDirectory()) {
      await uploadDir(sftp, localPath, remotePath, isNodeModules);
    } else if (entry.isFile()) {
      const relPath = path.relative(__dirname, localPath).replace(/\\/g, '/');
      console.log(`  📤 Uploading: ${relPath}`);
      await sftp.fastPut(localPath, remotePath);
    }
  }
}

// Upload required node_modules (skips if already on server for lightning-fast deployments)
async function syncNodeModules(sftp, forceSync = false) {
  const localModulesDir = path.join(__dirname, 'node_modules');
  const remoteModulesDir = path.posix.join(REMOTE_BASE, 'node_modules');

  if (!forceSync) {
    try {
      const checkExpress = await sftp.exists(path.posix.join(remoteModulesDir, 'express'));
      if (checkExpress) {
        console.log('⚡ Production node_modules already synced on server. (Skipping node_modules upload. Pass --modules to force sync)');
        return;
      }
    } catch(e) {}
  }

  console.log('\n📦 Syncing production node_modules to server...');
  await sftp.mkdir(remoteModulesDir, true);

  for (const pkgName of REQUIRED_PACKAGES) {
    const localPkg = path.join(localModulesDir, pkgName);
    const remotePkg = path.posix.join(remoteModulesDir, pkgName);

    if (fs.existsSync(localPkg)) {
      console.log(`  📦 Syncing ${pkgName}...`);
      await uploadDir(sftp, localPkg, remotePkg, true);
    }
  }
}

async function verifyLiveSite() {
  return new Promise((resolve) => {
    console.log('\n🌐 Verifying live site: https://sera10.com ...');
    setTimeout(() => {
      https.get('https://sera10.com', { rejectUnauthorized: false }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log(`\nHTTP Status: ${res.statusCode}`);
          if (data.includes('sera10') || data.includes('সেরা') || data.includes('<!DOCTYPE html>') || data.includes('html')) {
            console.log('🎉 Verified: https://sera10.com is LIVE and returning HTML!');
          } else {
            console.log('Response sample:', data.slice(0, 300));
          }
          resolve();
        });
      }).on('error', (err) => {
        console.error('⚠️ Verification error:', err.message);
        resolve();
      });
    }, 2500);
  });
}

async function deploy() {
  const sftp = new Client();
  console.log(`🚀 Connecting to ${config.host} as ${config.username}...`);

  try {
    await sftp.connect(config);
    console.log('✅ Connected successfully via SFTP!\n');

    // 1. Upload root files
    console.log('📄 Uploading root files...');
    for (const file of SYNC_FILES) {
      const localFile = path.join(__dirname, file);
      const remoteFile = path.posix.join(REMOTE_BASE, file);
      if (fs.existsSync(localFile)) {
        console.log(`  📤 Uploading: ${file}`);
        await sftp.fastPut(localFile, remoteFile);
      }
    }

    // 2. Upload source directories
    for (const dir of SYNC_DIRS) {
      const localDir = path.join(__dirname, dir);
      const remoteDir = path.posix.join(REMOTE_BASE, dir);
      if (fs.existsSync(localDir)) {
        console.log(`\n📂 Syncing directory: ${dir}...`);
        await uploadDir(sftp, localDir, remoteDir, false);
      }
    }

    // 3. Upload node_modules
    await syncNodeModules(sftp);

    // 4. Trigger Passenger / LiteSpeed restart
    console.log('\n🔄 Restarting application via tmp/restart.txt...');
    const tmpDir = path.posix.join(REMOTE_BASE, 'tmp');
    const restartFile = path.posix.join(tmpDir, 'restart.txt');
    await sftp.mkdir(tmpDir, true);
    await sftp.put(Buffer.from(new Date().toString()), restartFile);
    console.log('✅ Triggered Node.js app restart successfully!');

    console.log('\n🎉 ALL PROJECT FILES DEPLOYED DIRECTLY TO LIVE SERVER!');
    
    // 5. Verify live site
    await verifyLiveSite();

  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exitCode = 1;
  } finally {
    await sftp.end();
    console.log('\n🔌 Connection closed.');
  }
}

deploy();
