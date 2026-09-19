const net = require('net');

function ftpDownload(remoteFile) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let fileData = '';
    let pasvSocket = null;

    client.setTimeout(6000, () => {
      client.destroy();
      resolve(fileData);
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
          pasvSocket.connect(port, host);

          pasvSocket.on('data', (d) => {
            fileData += d.toString('utf8');
          });

          pasvSocket.on('close', () => {
            client.write('QUIT\r\n');
            client.end();
            resolve(fileData);
          });

          client.write(`RETR ${remoteFile}\r\n`);
        }
      }
    });

    client.on('error', () => {
      resolve('');
    });
  });
}

async function main() {
  console.log('📡 Reading wp-config.php from cPanel backup...');
  const content = await ftpDownload('backup/current_site_files/wp-config.php');
  if (content) {
    const mDb = content.match(/define\s*\(\s*['"]DB_NAME['\"]\s*,\s*['"](.*?)['\"]\s*\)/);
    const mUser = content.match(/define\s*\(\s*['"]DB_USER['\"]\s*,\s*['"](.*?)['\"]\s*\)/);
    const mPass = content.match(/define\s*\(\s*['"]DB_PASSWORD['\"]\s*,\s*['"](.*?)['\"]\s*\)/);
    const mHost = content.match(/define\s*\(\s*['"]DB_HOST['\"]\s*,\s*['"](.*?)['\"]\s*\)/);
    console.log('--- DB Config found in cPanel: ---');
    console.log('DB_NAME:', mDb ? mDb[1] : 'Not found');
    console.log('DB_USER:', mUser ? mUser[1] : 'Not found');
    console.log('DB_PASSWORD:', mPass ? mPass[1] : 'Not found');
    console.log('DB_HOST:', mHost ? mHost[1] : 'localhost');
  } else {
    console.log('Could not download wp-config.php directly');
  }
}

main();
