const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const sqlitePath = path.join(__dirname, '..', 'data', 'payasti.db');
const outputPath = path.join(__dirname, '..', 'data', 'payasti_mysql_dump.sql');

if (!fs.existsSync(sqlitePath)) {
  console.error('SQLite database not found at:', sqlitePath);
  process.exit(1);
}

const sqlite = new Database(sqlitePath);

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  // Escape string for MySQL
  const str = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `'${str}'`;
}

function generateDump() {
  console.log('Generating MySQL dump from SQLite...');
  let sql = `-- ========================================================\n`;
  sql += `-- Payasti MySQL Database Dump\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- ========================================================\n\n`;
  sql += `SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

  // 1. Table schemas
  const tableSchemas = [
    {
      name: 'users',
      create: `CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`wp_id\` INT UNIQUE,
  \`username\` VARCHAR(191) UNIQUE,
  \`email\` VARCHAR(191),
  \`password\` VARCHAR(255),
  \`display_name\` VARCHAR(255),
  \`nicename\` VARCHAR(255),
  \`role\` VARCHAR(50) DEFAULT 'author',
  \`avatar\` TEXT,
  \`bio\` TEXT,
  \`registered_at\` DATETIME,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      name: 'categories',
      create: `CREATE TABLE IF NOT EXISTS \`categories\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`wp_term_id\` INT UNIQUE,
  \`wp_taxonomy_id\` INT,
  \`name\` VARCHAR(255),
  \`slug\` VARCHAR(191) UNIQUE,
  \`parent_id\` INT DEFAULT 0,
  \`description\` TEXT,
  \`count\` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      name: 'tags',
      create: `CREATE TABLE IF NOT EXISTS \`tags\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`wp_term_id\` INT UNIQUE,
  \`name\` VARCHAR(255),
  \`slug\` VARCHAR(191) UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      name: 'posts',
      create: `CREATE TABLE IF NOT EXISTS \`posts\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`wp_id\` INT UNIQUE,
  \`author_id\` INT,
  \`title\` VARCHAR(500),
  \`slug\` VARCHAR(191),
  \`content\` LONGTEXT,
  \`excerpt\` TEXT,
  \`featured_image\` TEXT,
  \`category_id\` INT,
  \`subcategory_id\` INT,
  \`status\` VARCHAR(50) DEFAULT 'publish',
  \`views\` INT DEFAULT 0,
  \`is_featured\` TINYINT(1) DEFAULT 0,
  \`published_at\` DATETIME,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_posts_author (\`author_id\`),
  INDEX idx_posts_category (\`category_id\`),
  INDEX idx_posts_slug (\`slug\`),
  INDEX idx_posts_status (\`status\`),
  INDEX idx_posts_published (\`published_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      name: 'post_tags',
      create: `CREATE TABLE IF NOT EXISTS \`post_tags\` (
  \`post_id\` INT NOT NULL,
  \`tag_id\` INT NOT NULL,
  PRIMARY KEY (\`post_id\`, \`tag_id\`),
  INDEX idx_post_tags_post (\`post_id\`),
  INDEX idx_post_tags_tag (\`tag_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      name: 'books',
      create: `CREATE TABLE IF NOT EXISTS \`books\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`wp_id\` INT UNIQUE,
  \`title\` VARCHAR(500),
  \`slug\` VARCHAR(191),
  \`author_name\` VARCHAR(255),
  \`author_id\` INT,
  \`cover_image\` TEXT,
  \`regular_price\` VARCHAR(50),
  \`discounted_price\` VARCHAR(50),
  \`order_url\` TEXT,
  \`description\` TEXT,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_books_slug (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      name: 'comments',
      create: `CREATE TABLE IF NOT EXISTS \`comments\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`wp_id\` INT UNIQUE,
  \`post_id\` INT,
  \`author_name\` VARCHAR(255),
  \`author_email\` VARCHAR(191),
  \`content\` TEXT,
  \`status\` VARCHAR(50) DEFAULT 'approved',
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comments_post (\`post_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      name: 'notices',
      create: `CREATE TABLE IF NOT EXISTS \`notices\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`title\` VARCHAR(500),
  \`content\` TEXT,
  \`type\` VARCHAR(50) DEFAULT 'notice',
  \`is_active\` TINYINT(1) DEFAULT 1,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      name: 'settings',
      create: `CREATE TABLE IF NOT EXISTS \`settings\` (
  \`key\` VARCHAR(191) PRIMARY KEY,
  \`value\` LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    },
    {
      name: 'password_resets',
      create: `CREATE TABLE IF NOT EXISTS \`password_resets\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`token\` VARCHAR(191) NOT NULL UNIQUE,
  \`expires_at\` DATETIME NOT NULL,
  \`used\` TINYINT(1) DEFAULT 0,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_resets_token (\`token\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    }
  ];

  for (const t of tableSchemas) {
    sql += `-- Table structure for \`${t.name}\`\n`;
    sql += `${t.create}\n\n`;

    // Fetch data from SQLite
    try {
      const rows = sqlite.prepare(`SELECT * FROM "${t.name}"`).all();
      if (rows.length > 0) {
        sql += `-- Dumping data for \`${t.name}\` (${rows.length} rows)\n`;
        const columns = Object.keys(rows[0]);
        const colList = columns.map(c => `\`${c}\``).join(', ');

        // Chunk inserts by 50 rows
        for (let i = 0; i < rows.length; i += 50) {
          const chunk = rows.slice(i, i + 50);
          const valuesList = chunk.map(row => {
            const vals = columns.map(col => escapeSql(row[col]));
            return `(${vals.join(', ')})`;
          }).join(',\n  ');

          sql += `REPLACE INTO \`${t.name}\` (${colList}) VALUES\n  ${valuesList};\n`;
        }
        sql += `\n`;
        console.log(`  ✔ Table ${t.name}: exported ${rows.length} rows`);
      } else {
        console.log(`  ℹ Table ${t.name}: 0 rows (empty)`);
      }
    } catch (err) {
      console.warn(`  ⚠ Warning reading ${t.name}:`, err.message);
    }
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  fs.writeFileSync(outputPath, sql, 'utf-8');
  console.log(`\n🎉 MySQL Dump successfully written to:\n${outputPath}`);
  console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

generateDump();
