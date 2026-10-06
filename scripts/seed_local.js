const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function seed() {
  console.log('🔄 1. Connecting to Local MySQL...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '258456',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    multipleStatements: true
  });

  console.log('🧹 2. Dropping existing `payasti_db` and creating fresh...');
  await conn.query('DROP DATABASE IF EXISTS payasti_db;');
  await conn.query('CREATE DATABASE payasti_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
  await conn.query('USE payasti_db;');
  await conn.query('SET foreign_key_checks = 0;');

  console.log('🌱 3. Loading seed SQL dump from data/payasti_live_backup.sql...');
  const sqlFilePath = path.join(__dirname, '..', 'data', 'payasti_live_backup.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  const lines = sqlContent.split('\n');
  let currentQuery = '';
  let count = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || trimmed.startsWith('/*')) continue;
    currentQuery += line + '\n';
    if (trimmed.endsWith(';')) {
      try {
        await conn.query(currentQuery);
        count++;
      } catch (e) {
        console.error('SQL Execution Error:', e.message);
      }
      currentQuery = '';
    }
  }

  await conn.query('SET foreign_key_checks = 1;');
  console.log(`✅ Executed ${count} seed queries successfully!`);

  const [tables] = await conn.query('SHOW TABLES;');
  const [posts] = await conn.query('SELECT COUNT(*) as count FROM posts;');
  const [users] = await conn.query('SELECT COUNT(*) as count FROM users;');
  const [cats] = await conn.query('SELECT COUNT(*) as count FROM categories;');
  const [books] = await conn.query('SELECT COUNT(*) as count FROM books;');
  const [tags] = await conn.query('SELECT COUNT(*) as count FROM tags;');

  console.log('\n================ DATABASE STATS ================');
  console.log(`📋 Total Tables: ${tables.length}`);
  console.log(`📝 Total Posts: ${posts[0].count}`);
  console.log(`👥 Total Users: ${users[0].count}`);
  console.log(`📁 Total Categories: ${cats[0].count}`);
  console.log(`🏷️ Total Tags: ${tags[0].count}`);
  console.log(`📚 Total Books: ${books[0].count}`);
  console.log('================================================\n');

  await conn.end();
  console.log('🎉 LOCAL DATABASE CLEAN & FRESH SEEDING COMPLETED!');
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
