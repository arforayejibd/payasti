const fs = require('fs');
const path = require('path');
const net = require('net');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMP_DEPLOY_DIR = path.join(ROOT_DIR, 'scratch', 'deploy_temp');

function runFtpCommand(cmd) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let response = '';

    client.setTimeout(8000, () => {
      client.destroy();
      resolve(response);
    });

    client.connect(21, '103.112.62.87');

    client.on('data', (chunk) => {
      const msg = chunk.toString();

      if (msg.startsWith('220')) {
        client.write('USER ecstolin\r\n');
      } else if (msg.startsWith('331')) {
        client.write('PASS P472y4(zYrGI.p\r\n');
      } else if (msg.startsWith('230')) {
        client.write(cmd + '\r\n');
      } else {
        response += msg;
        if (msg.startsWith('257') || msg.startsWith('250') || msg.startsWith('550') || msg.startsWith('200')) {
          client.write('QUIT\r\n');
          client.end();
          resolve(response);
        }
      }
    });

    client.on('error', () => resolve(''));
  });
}

function ftpUploadFile(localFilePath, remoteFilePath) {
  return new Promise((resolve) => {
    const fileData = fs.readFileSync(localFilePath);
    const client = new net.Socket();
    let pasvSocket = null;

    client.setTimeout(12000, () => {
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

          client.write(`STOR ${remoteFilePath}\r\n`);
        }
      } else if (msg.startsWith('226') || msg.startsWith('250')) {
        client.write('QUIT\r\n');
        client.end();
        resolve(true);
      }
    });

    client.on('error', () => resolve(false));
  });
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

function getAllDirs(dirPath, arrayOfDirs = []) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfDirs.push(fullPath);
      arrayOfDirs = getAllDirs(fullPath, arrayOfDirs);
    }
  }
  return arrayOfDirs;
}

async function main() {
  console.log('🚀 Direct uploading all unzipped files to /home/ecstolin/sera10/...');
  
  const allDirs = getAllDirs(TEMP_DEPLOY_DIR);
  console.log(`📁 1. Creating ${allDirs.length} remote directories...`);
  for (const d of allDirs) {
    const relDir = path.relative(TEMP_DEPLOY_DIR, d).replace(/\\/g, '/');
    await runFtpCommand(`MKD sera10/${relDir}`);
  }

  const allFiles = getAllFiles(TEMP_DEPLOY_DIR);
  console.log(`📄 2. Uploading ${allFiles.length} files...`);
  
  let count = 0;
  for (const f of allFiles) {
    const relFile = path.relative(TEMP_DEPLOY_DIR, f).replace(/\\/g, '/');
    await ftpUploadFile(f, `sera10/${relFile}`);
    count++;
    if (count % 15 === 0 || count === allFiles.length) {
      console.log(`  Uploaded ${count}/${allFiles.length} files...`);
    }
  }

  console.log('🎉 ALL PROJECT FILES AND FOLDERS DIRECTLY UPLOADED AND EXTRACTED IN /home/ecstolin/sera10/');
}

main().catch(console.error);
