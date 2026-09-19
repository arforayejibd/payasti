const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUser() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD || '258456',
    database: 'sera10_db'
  });

  const [users] = await conn.query("SELECT id, username, email, display_name, role, password FROM users WHERE username = 'arforayeji' OR email LIKE '%forayeji%'");
  console.log('Users found:', JSON.stringify(users, null, 2));

  await conn.end();
}

checkUser();
