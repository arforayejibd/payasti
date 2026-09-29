const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const os = require('os');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('cd /home/ecstolin/sera10 && node -e "try { require(\'./server.js\'); console.log(\'Server loaded successfully!\'); } catch(e) { console.error(\'SERVER ERROR:\', e.stack); }"', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Remote node test output:\n', out);
      conn.end();
    });
  });
}).connect({
  host: '103.112.62.87',
  port: 22,
  username: 'ecstolin',
  privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'))
});
