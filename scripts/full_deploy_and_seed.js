const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
const net = require('net');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMP_DEPLOY_DIR = path.join(ROOT_DIR, 'scratch', 'deploy_bundle');
const ZIP_PATH = path.join(ROOT_DIR, 'scratch', 'sera10_production.zip');
const SQL_BACKUP_PATH = path.join(ROOT_DIR, 'backup', 'sera10_database_backup.sql');

const EXCLUDE = new Set(['node_modules', '.git', 'backup', 'scratch', 'ref', 'scripts', '.env']);

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

function ftpUpload(localFile, remoteFile) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(localFile);
    const client = new net.Socket();
    let pasvSocket = null;

    client.setTimeout(25000, () => {
      client.destroy();
      resolve(false);
    });

    client.connect(21, '103.112.62.87');

    client.on('data', (chunk) => {
      const msg = chunk.toString();

      if (msg.startsWith('220')) {
        client.write('USER ecstolin\r\n');
      } else if (msg.startsWith('331')) {
        client.write('PASS P472y4(zYrGI.p\r\n');
      } else if (msg.startsWith('230')) {
        client.write('TYPE I\r\n');
      } else if (msg.startsWith('200')) {
        client.write('PASV\r\n');
      } else if (msg.startsWith('227')) {
        const match = msg.match(/\((\d+),(\d+),(\d+),(\d+),(\d+)\)/);
        if (match) {
          const host = `${match[1]}.${match[2]}.${match[3]}.${match[4]}`;
          const port = (parseInt(match[5]) * 256) + parseInt(match[6]);

          pasvSocket = new net.Socket();
          pasvSocket.connect(port, host, () => {
            pasvSocket.write(fileData, () => {
              pasvSocket.end();
            });
          });

          client.write(`STOR ${remoteFile}\r\n`);
        }
      } else if (msg.startsWith('226') || msg.startsWith('250')) {
        setTimeout(() => {
          client.write('QUIT\r\n');
          client.end();
          resolve(true);
        }, 300);
      }
    });

    client.on('error', reject);
  });
}

function ftpDelete(remoteFile) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.connect(21, '103.112.62.87');

    client.on('data', (chunk) => {
      const msg = chunk.toString();
      if (msg.startsWith('220')) {
        client.write('USER ecstolin\r\n');
      } else if (msg.startsWith('331')) {
        client.write('PASS P472y4(zYrGI.p\r\n');
      } else if (msg.startsWith('230')) {
        client.write(`DELE ${remoteFile}\r\n`);
      } else if (msg.startsWith('250') || msg.startsWith('550')) {
        client.write('QUIT\r\n');
        client.end();
        resolve(true);
      }
    });

    client.on('error', () => resolve(false));
  });
}

function triggerHttpRequest(pathUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sera10.com',
      port: 443,
      path: pathUrl,
      method: 'GET',
      headers: {
        'Host': 'sera10.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    });

    req.on('error', () => {
      const httpReq = http.request({
        hostname: 'sera10.com',
        port: 80,
        path: pathUrl,
        method: 'GET',
        headers: { 'Host': 'sera10.com', 'User-Agent': 'Mozilla/5.0' }
      }, (httpRes) => {
        let httpData = '';
        httpRes.on('data', (c) => { httpData += c; });
        httpRes.on('end', () => resolve(httpData));
      });
      httpReq.on('error', reject);
      httpReq.end();
    });

    req.end();
  });
}

async function main() {
  console.log('====================================================');
  console.log('🚀 SERA10 FULL PRODUCTION DEPLOYMENT & SEEDING');
  console.log('====================================================\n');

  // 1. Prepare temp directory
  if (fs.existsSync(TEMP_DEPLOY_DIR)) {
    fs.rmSync(TEMP_DEPLOY_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_DEPLOY_DIR, { recursive: true });

  console.log('📂 1. Gathering clean project files...');
  const items = fs.readdirSync(ROOT_DIR);
  for (const item of items) {
    if (EXCLUDE.has(item)) continue;
    copyRecursive(path.join(ROOT_DIR, item), path.join(TEMP_DEPLOY_DIR, item));
  }

  // Create production .env file with user's new DB credentials
  const prodEnv = `# Production Environment
PORT=3000
NODE_ENV=production

# Security Secrets
SESSION_SECRET=payasti-session-key-2026
JWT_SECRET=payasti-super-secret-jwt-key-2026

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=ecstolin_nodeuser
DB_PASSWORD=nG(xcxtu(b2[o5#1
DB_NAME=ecstolin_node
DB_PORT=3306

# Live Domain
SITE_URL=https://sera10.com
`;
  fs.writeFileSync(path.join(TEMP_DEPLOY_DIR, '.env'), prodEnv, 'utf8');

  // 2. Compress into zip
  console.log('🗜️ 2. Compressing deployment bundle...');
  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${TEMP_DEPLOY_DIR}\\*' -DestinationPath '${ZIP_PATH}' -Force"`);
  const zipSizeMB = (fs.statSync(ZIP_PATH).size / (1024 * 1024)).toFixed(2);
  console.log(`📦 Deployment zip ready: ${zipSizeMB} MB\n`);

  // 3. Upload Deployment Zip & SQL Seed to cPanel sera10
  console.log('📤 3. Uploading production zip to /home/ecstolin/sera10/...');
  await ftpUpload(ZIP_PATH, 'sera10/sera10_production.zip');
  console.log('✅ Production bundle uploaded.');

  console.log('📤 4. Uploading SQL seed dump to /home/ecstolin/sera10/...');
  await ftpUpload(SQL_BACKUP_PATH, 'sera10/sera10_database_backup.sql');
  console.log('✅ SQL seed dump uploaded.\n');

  // 5. Create Server-Side Extractor & DB Seeder Worker
  console.log('⚙️ 5. Setting up server-side extraction and database seeder...');
  const workerPhp = `<?php
@ini_set('memory_limit', '512M');
@ini_set('max_execution_time', 300);
header('Content-Type: text/plain; charset=utf-8');

$appDir = '/home/ecstolin/sera10';
$zipFile = $appDir . '/sera10_production.zip';
$sqlFile = $appDir . '/sera10_database_backup.sql';

echo "--- 1. EXTRACTING PROJECT FILES ---\\n";
if (file_exists($zipFile)) {
    $zip = new ZipArchive();
    if ($zip->open($zipFile) === TRUE) {
        $zip->extractTo($appDir);
        $zip->close();
        @unlink($zipFile);
        echo "SUCCESS: Project files extracted into $appDir\\n";
    } else {
        echo "ERROR: Could not open $zipFile\\n";
    }
} else {
    echo "NOTICE: Zip file not found, skipping extraction\\n";
}

echo "\\n--- 2. SEEDING MYSQL DATABASE: ecstolin_node ---\\n";
if (file_exists($sqlFile)) {
    $dbHost = 'localhost';
    $dbUser = 'ecstolin_nodeuser';
    $dbPass = 'nG(xcxtu(b2[o5#1';
    $dbName = 'ecstolin_node';

    $mysqli = @new mysqli($dbHost, $dbUser, $dbPass, $dbName);
    if ($mysqli->connect_error) {
        echo "DB CONNECTION ERROR: " . $mysqli->connect_error . "\\n";
    } else {
        $mysqli->set_charset("utf8mb4");
        $mysqli->query("SET FOREIGN_KEY_CHECKS = 0");

        $sqlContent = file_get_contents($sqlFile);
        if ($mysqli->multi_query($sqlContent)) {
            do {
                if ($result = $mysqli->store_result()) {
                    $result->free();
                }
            } while ($mysqli->more_results() && $mysqli->next_result());
            echo "SUCCESS: Database [ecstolin_node] populated successfully with all posts, categories, and settings!\\n";
        } else {
            echo "SQL ERROR: " . $mysqli->error . "\\n";
        }
        $mysqli->query("SET FOREIGN_KEY_CHECKS = 1");
        $mysqli->close();
        @unlink($sqlFile);
    }
} else {
    echo "SQL Seed file not found at $sqlFile\\n";
}

echo "\\n--- ALL DEPLOYMENT & SEEDING TASKS COMPLETED ---\\n";
`;

  const workerLocal = path.join(ROOT_DIR, 'scratch', 'deploy_and_seed_worker.php');
  fs.writeFileSync(workerLocal, workerPhp, 'utf8');

  await ftpUpload(workerLocal, 'public_html/deploy_and_seed_worker.php');
  console.log('✅ Extraction & Seeder worker placed on server.\n');

  // 6. Trigger Extraction and Seeding on Server
  console.log('⚡ 6. Triggering server-side extraction and database population...');
  const serverOutput = await triggerHttpRequest('/deploy_and_seed_worker.php');
  console.log('\n--- SERVER EXECUTION REPORT ---');
  console.log(serverOutput.trim());
  console.log('-------------------------------\n');

  // 7. Cleanup Worker
  await ftpDelete('public_html/deploy_and_seed_worker.php');
  console.log('🧹 7. Cleaned up temporary worker script.');

  console.log('\n====================================================');
  console.log('🎉 FULL DEPLOYMENT & DATABASE SEEDING COMPLETED!');
  console.log('====================================================');
}

main().catch(console.error);
