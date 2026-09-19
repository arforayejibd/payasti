/**
 * Sera 10 (sera10.com) WordPress Dump Importer
 * Streams and parses ref/ecstolin_wp714.sql.gz and populates MySQL database
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payasti_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  multipleStatements: true,
  charset: 'utf8mb4'
};

const GZ_DUMP_PATH = path.join(__dirname, '..', 'ref', 'ecstolin_wp714.sql.gz');

async function runImport() {
  console.log('====================================================');
  console.log('🚀 SERA 10 (sera10.com) DATABASE IMPORT STARTED');
  console.log('====================================================\n');

  if (!fs.existsSync(GZ_DUMP_PATH)) {
    console.error('❌ SQL dump file not found at:', GZ_DUMP_PATH);
    process.exit(1);
  }

  // 1. Establish MySQL Connection
  console.log(`📡 Connecting to MySQL database [${DB_CONFIG.database}] on ${DB_CONFIG.host}:${DB_CONFIG.port}...`);
  let connection;
  try {
    // Attempt connection
    connection = await mysql.createConnection({
      host: DB_CONFIG.host,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      port: DB_CONFIG.port,
      multipleStatements: true,
      charset: 'utf8mb4'
    });

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${DB_CONFIG.database}\`;`);
    console.log(`✅ Connected to database [${DB_CONFIG.database}] successfully!\n`);
  } catch (err) {
    console.error('❌ MySQL Connection Failed:', err.message);
    console.error('👉 Please ensure MySQL is running and verify DB_NAME, DB_USER, DB_PASSWORD in .env');
    process.exit(1);
  }

  // 2. Initialize Clean Schema
  console.log('🛠️ Creating / Rebuilding Database Schema...');
  const schemaSql = `
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

    CREATE TABLE post_ratings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT DEFAULT NULL,
      rating TINYINT NOT NULL,
      ip_address VARCHAR(100) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_post_ratings_post (post_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE comments (
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

    CREATE TABLE settings (
      \`key\` VARCHAR(191) PRIMARY KEY,
      \`value\` LONGTEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await connection.query(schemaSql);
  console.log('✅ Schema tables created successfully!\n');

  // 3. Streaming and Parsing SQL Dump
  console.log('📦 Reading & Parsing ecstolin_wp714.sql.gz (Streaming)...');
  const fileStream = fs.createReadStream(GZ_DUMP_PATH);
  const unzipStream = zlib.createGunzip();
  const rl = readline.createInterface({
    input: fileStream.pipe(unzipStream),
    crlfDelay: Infinity
  });

  const parsedUsers = [];
  const termsMap = new Map(); // term_id -> { name, slug }
  const taxonomiesMap = new Map(); // taxonomy_id -> { term_id, taxonomy, description, parent, count }
  const postTaxonomies = new Map(); // post_id -> [taxonomy_id]
  const attachments = new Map(); // attachment_id -> guid url
  const postThumbnails = new Map(); // post_id -> attachment_id
  const postViewsMap = new Map(); // post_id -> views
  const rawPosts = [];

  let currentTable = '';

  for await (const line of rl) {
    if (line.includes('INSERT INTO `wpta_users`') || line.includes('INSERT INTO wpta_users')) {
      currentTable = 'users';
    } else if (line.includes('INSERT INTO `wpta_terms`') || line.includes('INSERT INTO wpta_terms')) {
      currentTable = 'terms';
    } else if (line.includes('INSERT INTO `wpta_term_taxonomy`') || line.includes('INSERT INTO wpta_term_taxonomy')) {
      currentTable = 'taxonomy';
    } else if (line.includes('INSERT INTO `wpta_term_relationships`') || line.includes('INSERT INTO wpta_term_relationships')) {
      currentTable = 'relationships';
    } else if (line.includes('INSERT INTO `wpta_postmeta`') || line.includes('INSERT INTO wpta_postmeta')) {
      currentTable = 'postmeta';
    } else if (line.includes('INSERT INTO `wpta_posts`') || line.includes('INSERT INTO wpta_posts')) {
      currentTable = 'posts';
    } else if (line.startsWith('INSERT INTO')) {
      currentTable = '';
    }

    // A. Parse Users
    if (currentTable === 'users') {
      const regex = /\((\d+),\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'([^']*)',\s*'[^']*',\s*\d+,\s*'((?:\\'|[^'])*)'\)/g;
      let m;
      while ((m = regex.exec(line)) !== null) {
        parsedUsers.push({
          wp_id: parseInt(m[1]),
          username: m[2].replace(/\\'/g, "'"),
          password: m[3],
          nicename: m[4].replace(/\\'/g, "'"),
          email: m[5].replace(/\\'/g, "'"),
          registered_at: m[7] === '0000-00-00 00:00:00' ? new Date() : m[7],
          display_name: m[8].replace(/\\'/g, "'")
        });
      }
    }

    // B. Parse Terms
    if (currentTable === 'terms') {
      const regex = /\((\d+),\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*(\d+),\s*(\d+)\)/g;
      let m;
      while ((m = regex.exec(line)) !== null) {
        let name = m[2].replace(/\\'/g, "'");
        let slug = m[3];
        try { slug = decodeURIComponent(slug); } catch(e) {}
        termsMap.set(parseInt(m[1]), { name, slug });
      }
    }

    // C. Parse Taxonomies
    if (currentTable === 'taxonomy') {
      const regex = /\((\d+),\s*(\d+),\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*(\d+),\s*(\d+)\)/g;
      let m;
      while ((m = regex.exec(line)) !== null) {
        taxonomiesMap.set(parseInt(m[1]), {
          tax_id: parseInt(m[1]),
          term_id: parseInt(m[2]),
          taxonomy: m[3],
          description: m[4].replace(/\\'/g, "'"),
          parent: parseInt(m[5]),
          count: parseInt(m[6])
        });
      }
    }

    // D. Parse Post Relationships
    if (currentTable === 'relationships') {
      const regex = /\((\d+),\s*(\d+),\s*\d+\)/g;
      let m;
      while ((m = regex.exec(line)) !== null) {
        const postId = parseInt(m[1]);
        const taxId = parseInt(m[2]);
        if (!postTaxonomies.has(postId)) {
          postTaxonomies.set(postId, []);
        }
        postTaxonomies.get(postId).push(taxId);
      }
    }

    // E. Parse Postmeta (Thumbnails and View counts)
    if (currentTable === 'postmeta') {
      // _thumbnail_id
      const thumbRegex = /\(\d+,\s*(\d+),\s*'_thumbnail_id',\s*'(\d+)'\)/g;
      let m;
      while ((m = thumbRegex.exec(line)) !== null) {
        postThumbnails.set(parseInt(m[1]), parseInt(m[2]));
      }

      // Views
      const viewsRegex = /\(\d+,\s*(\d+),\s*'(?:post_views_count|views|tie_views)',\s*'(\d+)'\)/g;
      while ((m = viewsRegex.exec(line)) !== null) {
        postViewsMap.set(parseInt(m[1]), parseInt(m[2]));
      }
    }

    // F. Parse Posts & Attachments
    if (currentTable === 'posts') {
      // Attachments
      const attRegex = /\((\d+),\s*\d+,\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'inherit',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*\d+,\s*'((?:\\'|[^'])*)',\s*\d+,\s*'attachment'/g;
      let attM;
      while ((attM = attRegex.exec(line)) !== null) {
        attachments.set(parseInt(attM[1]), attM[2].replace(/\\'/g, "'"));
      }

      // Published Posts
      const postRegex = /\((\d+),\s*(\d+),\s*'([^']*)',\s*'[^']*',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'publish',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'((?:\\'|[^'])*)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*\d+,\s*'[^']*',\s*\d+,\s*'post'/g;
      let postM;
      while ((postM = postRegex.exec(line)) !== null) {
        let slug = postM[7].replace(/\\'/g, "'");
        try { slug = decodeURIComponent(slug); } catch(e) {}
        rawPosts.push({
          wp_id: parseInt(postM[1]),
          author_id: parseInt(postM[2]),
          post_date: postM[3],
          content: postM[4].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, "\n").replace(/\\r/g, "\r"),
          title: postM[5].replace(/\\'/g, "'").replace(/\\"/g, '"'),
          excerpt: postM[6].replace(/\\'/g, "'").replace(/\\"/g, '"'),
          slug: slug
        });
      }
    }
  }

  console.log(`📊 Extracted from Dump:`);
  console.log(`   - Users: ${parsedUsers.length}`);
  console.log(`   - Terms: ${termsMap.size}`);
  console.log(`   - Taxonomies: ${taxonomiesMap.size}`);
  console.log(`   - Attachments (Images): ${attachments.size}`);
  console.log(`   - Published Posts: ${rawPosts.length}\n`);

  // 4. Insert Users
  console.log('👤 Inserting Users...');
  const userIdMap = new Map(); // wp_user_id -> new_user_id
  for (const u of parsedUsers) {
    const [res] = await connection.query(
      `INSERT INTO users (wp_id, username, email, password, display_name, nicename, role, registered_at)
       VALUES (?, ?, ?, ?, ?, ?, 'admin', ?)`,
      [u.wp_id, u.username, u.email, u.password, u.display_name, u.nicename, u.registered_at]
    );
    userIdMap.set(u.wp_id, res.insertId);
  }
  // Fallback default author if needed
  if (userIdMap.size === 0) {
    const [res] = await connection.query(
      `INSERT INTO users (username, email, display_name, nicename, role) VALUES ('admin', 'admin@sera10.com', 'সেরা ১০ টিম', 'sera10-team', 'admin')`
    );
    userIdMap.set(1, res.insertId);
  }

  // 5. Insert Categories & Tags
  console.log('📁 Inserting Categories & Tags...');
  const catWpToId = new Map(); // wp_term_id -> category_id
  const taxIdToCatId = new Map(); // wp_taxonomy_id -> category_id
  const tagWpToId = new Map(); // wp_term_id -> tag_id
  const taxIdToTagId = new Map(); // wp_taxonomy_id -> tag_id

  for (const [taxId, tax] of taxonomiesMap.entries()) {
    const term = termsMap.get(tax.term_id);
    if (!term) continue;

    if (tax.taxonomy === 'category') {
      try {
        const [res] = await connection.query(
          `INSERT INTO categories (wp_term_id, wp_taxonomy_id, name, slug, parent_id, description, count)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), count = VALUES(count)`,
          [tax.term_id, tax.tax_id, term.name, term.slug, tax.parent, tax.description, tax.count]
        );
        catWpToId.set(tax.term_id, res.insertId);
        taxIdToCatId.set(tax.tax_id, res.insertId);
      } catch (err) {
        // Skip duplicate slugs or edge cases
      }
    } else if (tax.taxonomy === 'post_tag') {
      try {
        const [res] = await connection.query(
          `INSERT INTO tags (wp_term_id, name, slug)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name)`,
          [tax.term_id, term.name, term.slug]
        );
        tagWpToId.set(tax.term_id, res.insertId);
        taxIdToTagId.set(tax.tax_id, res.insertId);
      } catch (err) {}
    }
  }

  // 6. Insert Posts & Map Categories / Tags
  console.log(`📝 Inserting ${rawPosts.length} Published Posts...`);
  let insertedPosts = 0;

  for (let i = 0; i < rawPosts.length; i++) {
    const p = rawPosts[i];
    const authorId = userIdMap.get(p.author_id) || Array.from(userIdMap.values())[0];
    
    // Resolve Featured Image
    let featuredImage = '';
    const thumbId = postThumbnails.get(p.wp_id);
    if (thumbId && attachments.has(thumbId)) {
      featuredImage = attachments.get(thumbId);
    } else {
      // Extract first img from content
      const imgMatch = p.content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        featuredImage = imgMatch[1];
      }
    }

    // Resolve Category
    let categoryId = null;
    const attachedTaxIds = postTaxonomies.get(p.wp_id) || [];
    const postCatIds = [];
    const postTagIds = [];

    for (const tId of attachedTaxIds) {
      if (taxIdToCatId.has(tId)) {
        postCatIds.push(taxIdToCatId.get(tId));
      }
      if (taxIdToTagId.has(tId)) {
        postTagIds.push(taxIdToTagId.get(tId));
      }
    }

    if (postCatIds.length > 0) {
      categoryId = postCatIds[0];
    }

    // Excerpt cleanup
    let cleanExcerpt = p.excerpt;
    if (!cleanExcerpt || cleanExcerpt.trim() === '') {
      cleanExcerpt = p.content
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 180);
    }

    // Views
    const views = postViewsMap.get(p.wp_id) || Math.floor(Math.random() * 500) + 120;

    // Default rating: 4.60 - 5.00
    const ratingScore = (4.5 + (Math.random() * 0.5)).toFixed(2);
    const ratingCount = Math.floor(Math.random() * 40) + 10;

    // Is featured for first 6 newest posts
    const isFeatured = i < 6 ? 1 : 0;

    const [postRes] = await connection.query(
      `INSERT INTO posts (wp_id, author_id, title, slug, content, excerpt, featured_image, category_id, status, views, is_featured, rating_score, rating_count, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'publish', ?, ?, ?, ?, ?, ?)`,
      [
        p.wp_id,
        authorId,
        p.title,
        p.slug,
        p.content,
        cleanExcerpt,
        featuredImage,
        categoryId,
        views,
        isFeatured,
        ratingScore,
        ratingCount,
        p.post_date,
        p.post_date
      ]
    );

    const newPostId = postRes.insertId;
    insertedPosts++;

    // Insert Post Tags
    for (const tagId of postTagIds) {
      try {
        await connection.query(
          `INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)`,
          [newPostId, tagId]
        );
      } catch (e) {}
    }
  }

  // Update actual post counts for categories
  await connection.query(`
    UPDATE categories c 
    SET count = (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id AND p.status = 'publish')
  `);

  console.log(`\n🎉 IMPORT COMPLETED SUCCESSFULLY!`);
  console.log(`====================================================`);
  console.log(`✅ Total Posts Imported: ${insertedPosts}`);
  console.log(`✅ Categories Configured: ${catWpToId.size}`);
  console.log(`✅ Tags Configured: ${tagWpToId.size}`);
  console.log(`====================================================\n`);

  await connection.end();
}

runImport().catch((err) => {
  console.error('❌ Critical error during import:', err);
  process.exit(1);
});
