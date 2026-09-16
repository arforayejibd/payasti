const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payasti_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true
});

let isInitialized = false;

// Ensure MySQL tables exist with proper utf8mb4 collation
async function initDatabase() {
  if (isInitialized) return;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
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
          registered_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          wp_term_id INT UNIQUE,
          wp_taxonomy_id INT,
          name VARCHAR(255),
          slug VARCHAR(191) UNIQUE,
          parent_id INT DEFAULT 0,
          description TEXT,
          count INT DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS tags (
          id INT AUTO_INCREMENT PRIMARY KEY,
          wp_term_id INT UNIQUE,
          name VARCHAR(255),
          slug VARCHAR(191) UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS posts (
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
          published_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_posts_author (author_id),
          INDEX idx_posts_category (category_id),
          INDEX idx_posts_slug (slug),
          INDEX idx_posts_status (status),
          INDEX idx_posts_published (published_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS post_tags (
          post_id INT NOT NULL,
          tag_id INT NOT NULL,
          PRIMARY KEY (post_id, tag_id),
          INDEX idx_post_tags_post (post_id),
          INDEX idx_post_tags_tag (tag_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS books (
          id INT AUTO_INCREMENT PRIMARY KEY,
          wp_id INT UNIQUE,
          title VARCHAR(500),
          slug VARCHAR(191),
          author_name VARCHAR(255),
          author_id INT,
          cover_image TEXT,
          regular_price VARCHAR(50),
          discounted_price VARCHAR(50),
          order_url TEXT,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_books_slug (slug)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          wp_id INT UNIQUE,
          post_id INT,
          author_name VARCHAR(255),
          author_email VARCHAR(191),
          content TEXT,
          status VARCHAR(50) DEFAULT 'approved',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_comments_post (post_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS notices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(500),
          content TEXT,
          type VARCHAR(50) DEFAULT 'notice',
          is_active TINYINT(1) DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS settings (
          \`key\` VARCHAR(191) PRIMARY KEY,
          \`value\` LONGTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token VARCHAR(191) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          used TINYINT(1) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_password_resets_token (token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await connection.query(`
        CREATE TABLE IF NOT EXISTS email_verifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token VARCHAR(191) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_email_verifications_token (token),
          INDEX idx_email_verifications_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Ensure new columns exist on users table for status, email_verified, is_approved
      try {
        const [userCols] = await connection.query(`
          SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
        `);
        const colNames = (userCols || []).map(c => c.COLUMN_NAME.toLowerCase());

        if (!colNames.includes('status')) {
          await connection.query("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active'");
        }
        if (!colNames.includes('email_verified')) {
          await connection.query("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 1");
        }
        if (!colNames.includes('is_approved')) {
          await connection.query("ALTER TABLE users ADD COLUMN is_approved TINYINT(1) DEFAULT 1");
        }
      } catch (colErr) {
        console.warn('⚠️ Column check on users table warning:', colErr.message);
      }

      isInitialized = true;
      console.log('✅ MySQL schema initialized successfully.');
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('⚠️ MySQL table initialization warning:', err.message);
  }
}

// Auto initialize on first import
initDatabase();

// Clean async helper functions matching SQLite ergonomics
const db = {
  pool,
  initDatabase,

  query: async (sql, params = []) => {
    const [results] = await pool.query(sql, params);
    return results;
  },

  all: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows || [];
  },

  get: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows && rows.length > 0 ? rows[0] : undefined;
  },

  run: async (sql, params = []) => {
    const [result] = await pool.query(sql, params);
    return {
      lastInsertRowid: result.insertId,
      insertId: result.insertId,
      changes: result.affectedRows,
      affectedRows: result.affectedRows
    };
  },

  // Helper to maintain compatibility if prepare(...) is called
  prepare: (sql) => {
    // Auto-replace SQLite INSERT OR REPLACE with MySQL REPLACE INTO
    let normalizedSql = sql;
    if (/INSERT\s+OR\s+REPLACE\s+INTO/i.test(normalizedSql)) {
      normalizedSql = normalizedSql.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO');
    }

    return {
      get: async (...args) => {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.get(normalizedSql, flat);
      },
      all: async (...args) => {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.all(normalizedSql, flat);
      },
      run: async (...args) => {
        const flat = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.run(normalizedSql, flat);
      }
    };
  }
};

module.exports = db;
