const net = require('net');

function ftpListOne(dirPath) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let listData = '';
    let pasvSocket = null;

    client.setTimeout(6000, () => {
      client.destroy();
      resolve(listData || 'TIMEOUT');
    });

    client.connect(21, '103.112.62.87');

    client.on('data', (chunk) => {
      const msg = chunk.toString();

      if (msg.startsWith('220')) {
        client.write('USER ecstolin\r\n');
      } else if (msg.startsWith('331')) {
        client.write('PASS P472y4(zYrGI.p\r\n');
      } else if (msg.startsWith('230')) {
        client.write('PASV\r\n');
      } else if (msg.startsWith('227')) {
        const match = msg.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
        if (match) {
          const host = `${match[1]}.${match[2]}.${match[3]}.${match[4]}`;
          const port = (parseInt(match[5]) * 256) + parseInt(match[6]);

          pasvSocket = new net.Socket();
          pasvSocket.connect(port, host);

          pasvSocket.on('data', (d) => {
            listData += d.toString();
          });

          pasvSocket.on('close', () => {
            client.write('QUIT\r\n');
            client.end();
            resolve(listData);
          });

          client.write(`LIST ${dirPath}\r\n`);
        }
      }
    });

    client.on('error', () => {
      resolve('ERROR');
    });
  });
}

async function main() {
  console.log('--- Checking /sera10 on cPanel ---');
  const list = await ftpListOne('sera10');
  console.log(list);
}

main();
