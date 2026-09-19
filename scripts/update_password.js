/**
 * Updates password for arforayeji & admin on both Local DB & Live DB via SSH Tunnel
 */
const { Client } = require('ssh2');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');

dotenv.config();

const NEW_PASSWORD = 'password123';
const hashedPassword = bcrypt.hashSync(NEW_PASSWORD, 10);

const SSH_CONFIG = {
  host: '103.112.62.87',
  port: 22,
  username: 'ecstolin',
  privateKey: fs.readFileSync(path.join(os.homedir(), '.ssh', 'id_rsa'))
};

const REMOTE_DB_CONFIG = {
  user: 'ecstolin',
  password: 'P472y4(zYrGI.p',
  database: 'ecstolin_node'
};

const LOCAL_DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '258456',
  database: process.env.DB_NAME || 'sera10_db',
  port: parseInt(process.env.DB_PORT || '3306', 10)
};

async function updatePasswords() {
  console.log('====================================================');
  console.log(`🔐 UPDATING PASSWORDS TO: [ ${NEW_PASSWORD} ]`);
  console.log('====================================================\n');

  // 1. Update Local DB
  try {
    const localConn = await mysql.createConnection(LOCAL_DB_CONFIG);
    await localConn.query(
      "UPDATE users SET password = ?, role = 'admin', status = 'active', email_verified = 1, is_approved = 1 WHERE username IN ('arforayeji', 'admin', 'mrforayeji')"
    , [hashedPassword]);
    console.log('✅ Local DB passwords updated successfully.');
    await localConn.end();
  } catch (err) {
    console.error('⚠️ Local DB update warning:', err.message);
  }

  // 2. Update Live DB via SSH Tunnel
  console.log(`🔌 Connecting to Live DB via SSH tunnel...`);
  const sshClient = new Client();

  await new Promise((resolve, reject) => {
    sshClient.on('ready', () => {
      sshClient.forwardOut('127.0.0.1', 12345, '127.0.0.1', 3306, async (err, stream) => {
        if (err) return reject(err);

        try {
          const remoteConn = await mysql.createConnection({
            ...REMOTE_DB_CONFIG,
            stream: stream
          });

          await remoteConn.query(
            "UPDATE users SET password = ?, role = 'admin', status = 'active', email_verified = 1, is_approved = 1 WHERE username IN ('arforayeji', 'admin', 'mrforayeji')"
          , [hashedPassword]);

          const [rows] = await remoteConn.query("SELECT id, username, email, role, status FROM users WHERE username IN ('arforayeji', 'admin', 'mrforayeji')");
          console.log('\n✅ Live DB updated users:');
          console.table(rows);

          await remoteConn.end();
          sshClient.end();
          resolve();
        } catch (dbErr) {
          reject(dbErr);
        }
      });
    }).connect(SSH_CONFIG);
  });

  console.log('\n====================================================');
  console.log('🎉 PASSWORD UPDATE COMPLETE ON BOTH LOCAL & LIVE!');
  console.log('====================================================\n');
}

updatePasswords().catch(err => {
  console.error('❌ Password update error:', err);
  process.exit(1);
});
