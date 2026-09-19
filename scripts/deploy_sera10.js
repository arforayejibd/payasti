const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
const net = require('net');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMP_DEPLOY_DIR = path.join(ROOT_DIR, 'scratch', 'deploy_temp');
const ZIP_PATH = path.join(ROOT_DIR, 'scratch', 'sera10_deploy.zip');

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
        const match = msg.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
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
        }, 500);
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

function triggerUnzip() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sera10.com',
      port: 443,
      path: '/unzip_deploy_worker.php',
      method: 'GET',
      headers: {
        'Host': 'sera10.com',
        'User-Agent': 'Mozilla/5.0'
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
        path: '/unzip_deploy_worker.php',
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
  console.log('🚀 SERA10 FULL DEPLOYMENT TO CPANEL STARTED');
  console.log('====================================================');

  // 1. Prepare temp directory
  if (fs.existsSync(TEMP_DEPLOY_DIR)) {
    fs.rmSync(TEMP_DEPLOY_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_DEPLOY_DIR, { recursive: true });

  console.log('📂 1. Gathering clean deployment files...');
  const items = fs.readdirSync(ROOT_DIR);
  for (const item of items) {
    if (EXCLUDE.has(item)) continue;
    copyRecursive(path.join(ROOT_DIR, item), path.join(TEMP_DEPLOY_DIR, item));
  }

  // Create clean production .env template
  const prodEnv = `PORT=3000
NODE_ENV=production
SESSION_SECRET=payasti-session-key-2026
JWT_SECRET=payasti-super-secret-jwt-key-2026
DB_HOST=localhost
DB_USER=ecstolin_wp714
DB_PASSWORD=P472y4(zYrGI.p
DB_NAME=ecstolin_wp714
DB_PORT=3306
SITE_URL=https://sera10.com
`;
  fs.writeFileSync(path.join(TEMP_DEPLOY_DIR, '.env'), prodEnv, 'utf8');

  // 2. Create Zip
  console.log('🗜️ 2. Compressing deployment bundle...');
  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${TEMP_DEPLOY_DIR}\\*' -DestinationPath '${ZIP_PATH}' -Force"`);
  const zipSizeMB = (fs.statSync(ZIP_PATH).size / (1024 * 1024)).toFixed(2);
  console.log(`📦 Deployment zip created (${zipSizeMB} MB)`);

  // 3. Upload Zip to cPanel sera10 directory
  console.log('📤 3. Uploading deployment package to /home/ecstolin/sera10/...');
  await ftpUpload(ZIP_PATH, 'sera10/sera10_deploy.zip');
  console.log('✅ Package uploaded successfully!');

  // 4. Create and Upload Unzip Worker to public_html
  const unzipPhpCode = `<?php
$zipPath = '/home/ecstolin/sera10/sera10_deploy.zip';
$extractTo = '/home/ecstolin/sera10/';

if (file_exists($zipPath)) {
    $zip = new ZipArchive();
    if ($zip->open($zipPath) === TRUE) {
        $zip->extractTo($extractTo);
        $zip->close();
        @unlink($zipPath);
        echo 'EXTRACTION_COMPLETED_SUCCESSFULLY';
    } else {
        echo 'EXTRACTION_FAILED_TO_OPEN_ZIP';
    }
} else {
    echo 'ZIP_FILE_NOT_FOUND';
}
`;
  const unzipWorkerLocal = path.join(ROOT_DIR, 'scratch', 'unzip_deploy_worker.php');
  fs.writeFileSync(unzipWorkerLocal, unzipPhpCode, 'utf8');

  console.log('⚙️ 4. Extracting files into /home/ecstolin/sera10/...');
  await ftpUpload(unzipWorkerLocal, 'public_html/unzip_deploy_worker.php');

  const unzipResult = await triggerUnzip();
  console.log('Extraction Server Response:', unzipResult.trim());

  // 5. Cleanup worker
  await ftpDelete('public_html/unzip_deploy_worker.php');
  console.log('🧹 5. Cleaned up extraction worker.');

  console.log('\n====================================================');
  console.log('🎉 ALL PROJECT FILES DEPLOYED TO /home/ecstolin/sera10');
  console.log('====================================================');
}

main().catch(console.error);
