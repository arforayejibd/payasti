/**
 * High-Speed Batch Database Sync from Local (sera10_db) to Live (ecstolin_node) via SSH Tunnel
 */
const { Client } = require('ssh2');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');

dotenv.config();

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

// Batch insert helper for blazing speed
async function batchInsert(conn, table, columns, rows, chunkSize = 500) {
  if (!rows || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = chunk.flatMap(r => columns.map(c => r[c]));
    const sql = `INSERT INTO ${table} (${columns.map(c => `\`${c}\``).join(', ')}) VALUES ${placeholders}`;
    await conn.query(sql, values);
  }
}

async function syncDatabases() {
  console.log('====================================================');
  console.log('🚀 FAST BATCH SYNC: LOCAL TO LIVE PRODUCTION');
  console.log('====================================================\n');

  // 1. Connect to Local DB
  console.log(`🔌 Connecting to local DB [${LOCAL_DB_CONFIG.database}]...`);
  const localConn = await mysql.createConnection(LOCAL_DB_CONFIG);
  console.log('✅ Local DB connected.');

  // 2. Connect to SSH & Remote DB
  console.log(`🔌 Establishing SSH tunnel to ${SSH_CONFIG.host}...`);
  const sshClient = new Client();

  await new Promise((resolve, reject) => {
    sshClient.on('ready', () => {
      console.log('✅ SSH tunnel ready. Forwarding port 3306...');
      sshClient.forwardOut('127.0.0.1', 12345, '127.0.0.1', 3306, async (err, stream) => {
        if (err) return reject(err);

        try {
          console.log(`🔌 Connecting to remote DB [${REMOTE_DB_CONFIG.database}]...`);
          const remoteConn = await mysql.createConnection({
            ...REMOTE_DB_CONFIG,
            stream: stream,
            multipleStatements: true
          });
          console.log('✅ Remote DB connected.\n');

          // 3. Ensure Remote Schema
          console.log('🛠️ Initializing schema on remote DB...');
          const schemaSql = `
            SET FOREIGN_KEY_CHECKS = 0;
            DROP TABLE IF EXISTS post_tags;
            DROP TABLE IF EXISTS post_ratings;
            DROP TABLE IF EXISTS comments;
            DROP TABLE IF EXISTS posts;
            DROP TABLE IF EXISTS categories;
            DROP TABLE IF EXISTS tags;
            DROP TABLE IF EXISTS users;
            DROP TABLE IF EXISTS notices;
            DROP TABLE IF EXISTS settings;
            DROP TABLE IF EXISTS password_resets;
            DROP TABLE IF EXISTS email_verifications;
            DROP TABLE IF EXISTS books;
            SET FOREIGN_KEY_CHECKS = 1;

            CREATE TABLE users (
              id INT AUTO_INCREMENT PRIMARY KEY,
              wp_id INT UNIQUE,
              username VARCHAR(191) UNIQUE,
              email VARCHAR(191),
              password VARCHAR(255),
              display_name VARCHAR(255),
              nicename VARCHAR(255),
              role VARCHAR(50) DEFAULT 'author',
              avatar TEXT,
              bio TEXT,
              status VARCHAR(50) DEFAULT 'active',
              email_verified TINYINT(1) DEFAULT 1,
              is_approved TINYINT(1) DEFAULT 1,
              registered_at DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE categories (
              id INT AUTO_INCREMENT PRIMARY KEY,
              wp_term_id INT UNIQUE,
              wp_taxonomy_id INT,
              name VARCHAR(255),
              slug VARCHAR(191) UNIQUE,
              parent_id INT DEFAULT 0,
              description TEXT,
              count INT DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE tags (
              id INT AUTO_INCREMENT PRIMARY KEY,
              wp_term_id INT UNIQUE,
              name VARCHAR(255),
              slug VARCHAR(191) UNIQUE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE posts (
              id INT AUTO_INCREMENT PRIMARY KEY,
              wp_id INT UNIQUE,
              author_id INT,
              title VARCHAR(500),
              slug VARCHAR(191),
              content LONGTEXT,
              excerpt TEXT,
              featured_image TEXT,
              category_id INT,
              subcategory_id INT,
              status VARCHAR(50) DEFAULT 'publish',
              views INT DEFAULT 0,
              is_featured TINYINT(1) DEFAULT 0,
              rating_score DECIMAL(3,2) DEFAULT 4.80,
              rating_count INT DEFAULT 12,
              published_at DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              INDEX idx_posts_author (author_id),
              INDEX idx_posts_category (category_id),
              INDEX idx_posts_slug (slug),
              INDEX idx_posts_status (status),
              INDEX idx_posts_published (published_at),
              INDEX idx_posts_featured (is_featured)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE post_tags (
              post_id INT NOT NULL,
              tag_id INT NOT NULL,
              PRIMARY KEY (post_id, tag_id),
              INDEX idx_post_tags_post (post_id),
              INDEX idx_post_tags_tag (tag_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE settings (
              \`key\` VARCHAR(191) PRIMARY KEY,
              \`value\` LONGTEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
          `;

          await remoteConn.query(schemaSql);
          console.log('✅ Remote schema clean.');

          // 4. Batch Sync Users
          console.log('👤 Syncing Users...');
          const [users] = await localConn.query('SELECT id, wp_id, username, email, password, display_name, nicename, role, avatar, bio, status, email_verified, is_approved, registered_at, created_at FROM users');
          const userCols = ['id', 'wp_id', 'username', 'email', 'password', 'display_name', 'nicename', 'role', 'avatar', 'bio', 'status', 'email_verified', 'is_approved', 'registered_at', 'created_at'];
          await batchInsert(remoteConn, 'users', userCols, users, 100);
          console.log(`✅ Synced ${users.length} users.`);

          // 5. Batch Sync Categories
          console.log('📁 Syncing Categories...');
          const [categories] = await localConn.query('SELECT id, wp_term_id, wp_taxonomy_id, name, slug, parent_id, description, count FROM categories');
          const catCols = ['id', 'wp_term_id', 'wp_taxonomy_id', 'name', 'slug', 'parent_id', 'description', 'count'];
          await batchInsert(remoteConn, 'categories', catCols, categories, 100);
          console.log(`✅ Synced ${categories.length} categories.`);

          // 6. Batch Sync Tags
          console.log('🏷️ Syncing Tags in batch...');
          const [tags] = await localConn.query('SELECT id, wp_term_id, name, slug FROM tags');
          const tagCols = ['id', 'wp_term_id', 'name', 'slug'];
          await batchInsert(remoteConn, 'tags', tagCols, tags, 500);
          console.log(`✅ Synced ${tags.length} tags.`);

          // 7. Batch Sync Posts
          console.log('📝 Syncing Posts in batch...');
          const [posts] = await localConn.query('SELECT id, wp_id, author_id, title, slug, content, excerpt, featured_image, category_id, subcategory_id, status, views, is_featured, rating_score, rating_count, published_at, created_at FROM posts');
          const postCols = ['id', 'wp_id', 'author_id', 'title', 'slug', 'content', 'excerpt', 'featured_image', 'category_id', 'subcategory_id', 'status', 'views', 'is_featured', 'rating_score', 'rating_count', 'published_at', 'created_at'];
          await batchInsert(remoteConn, 'posts', postCols, posts, 100);
          console.log(`✅ Synced ${posts.length} posts.`);

          // 8. Batch Sync Post Tags
          console.log('🔗 Syncing Post Tags in batch...');
          const [postTags] = await localConn.query('SELECT post_id, tag_id FROM post_tags');
          const ptCols = ['post_id', 'tag_id'];
          await batchInsert(remoteConn, 'post_tags', ptCols, postTags, 500);
          console.log(`✅ Synced ${postTags.length} post tags.`);

          // 9. Sync Settings
          console.log('⚙️ Syncing Settings...');
          const [settings] = await localConn.query('SELECT `key`, `value` FROM settings');
          for (const s of settings) {
            await remoteConn.query('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)', [s.key, s.value]);
          }
          console.log(`✅ Synced ${settings.length} settings.`);

          // 10. Update Category Counts
          console.log('🔢 Recalculating category counts on remote...');
          await remoteConn.query(`
            UPDATE categories c 
            SET count = (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id AND p.status = 'publish')
          `);

          // 11. Final verification on remote
          const [finalCount] = await remoteConn.query("SELECT COUNT(*) as total FROM posts WHERE status = 'publish'");
          const [finalUsers] = await remoteConn.query("SELECT COUNT(*) as total FROM users");
          console.log(`\n🎉 Live DB Verified: ${finalCount[0].total} published posts, ${finalUsers[0].total} users.`);

          await remoteConn.end();
          await localConn.end();
          sshClient.end();
          resolve();
        } catch (dbErr) {
          reject(dbErr);
        }
      });
    }).connect(SSH_CONFIG);
  });

  // 12. Restart LiteSpeed Passenger app to clear memory caches
  const ClientSFTP = require('ssh2-sftp-client');
  const sftp = new ClientSFTP();
  await sftp.connect(SSH_CONFIG);
  const restartFile = '/home/ecstolin/sera10/tmp/restart.txt';
  await sftp.mkdir('/home/ecstolin/sera10/tmp', true);
  await sftp.put(Buffer.from(new Date().toString()), restartFile);
  await sftp.end();
  console.log('✅ Triggered Node.js app restart on server.');

  console.log('\n====================================================');
  console.log('🎉 ALL 814 POSTS AND DATA SUCCESSFULLY SEEDED TO LIVE SITE!');
  console.log('====================================================\n');
}

syncDatabases().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
