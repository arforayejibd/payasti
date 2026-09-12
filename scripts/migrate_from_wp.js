const fs = require('fs');
const readline = require('readline');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data', 'payasti.db');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Remove existing db if recreating fresh
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

console.log('Creating database schema...');

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wp_id INTEGER UNIQUE,
    username TEXT UNIQUE,
    email TEXT,
    password TEXT,
    display_name TEXT,
    nicename TEXT,
    role TEXT DEFAULT 'author',
    avatar TEXT,
    bio TEXT,
    registered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wp_term_id INTEGER UNIQUE,
    wp_taxonomy_id INTEGER,
    name TEXT,
    slug TEXT UNIQUE,
    parent_id INTEGER DEFAULT 0,
    description TEXT,
    count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wp_term_id INTEGER UNIQUE,
    name TEXT,
    slug TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wp_id INTEGER UNIQUE,
    author_id INTEGER,
    title TEXT,
    slug TEXT,
    content TEXT,
    excerpt TEXT,
    featured_image TEXT,
    category_id INTEGER,
    subcategory_id INTEGER,
    status TEXT DEFAULT 'publish',
    views INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY (post_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wp_id INTEGER UNIQUE,
    title TEXT,
    slug TEXT,
    author_name TEXT,
    author_id INTEGER,
    cover_image TEXT,
    regular_price TEXT,
    discounted_price TEXT,
    order_url TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wp_id INTEGER UNIQUE,
    post_id INTEGER,
    author_name TEXT,
    author_email TEXT,
    content TEXT,
    status TEXT DEFAULT 'approved',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id)
  );

  CREATE TABLE IF NOT EXISTS notices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    type TEXT DEFAULT 'notice',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

console.log('Schema created successfully.');

async function runMigration() {
  const sqlPath = path.join(__dirname, '..', 'ref', 'payasti_wp737.sql');
  const fileStream = fs.createReadStream(sqlPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const defaultPasswordHash = bcrypt.hashSync('payasti123456', 10);

  // Collections during parsing
  const rawTerms = new Map(); // term_id -> { name, slug }
  const rawTaxonomies = new Map(); // term_taxonomy_id -> { term_id, taxonomy, parent, count, description }
  const rawTermRelations = []; // { object_id, term_taxonomy_id }
  const rawUsers = [];
  const rawUserMeta = new Map(); // user_id -> { bio, avatar, role }
  const rawPosts = [];
  const rawPostMeta = new Map(); // post_id -> { key: value }
  const rawPostViews = new Map(); // post_id -> views
  const rawComments = [];

  let inTable = null;

  console.log('Reading and parsing SQL dump...');

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `wp8w_terms`')) inTable = 'terms';
    else if (line.startsWith('INSERT INTO `wp8w_term_taxonomy`')) inTable = 'term_taxonomy';
    else if (line.startsWith('INSERT INTO `wp8w_term_relationships`')) inTable = 'term_relationships';
    else if (line.startsWith('INSERT INTO `wp8w_users`')) inTable = 'users';
    else if (line.startsWith('INSERT INTO `wp8w_usermeta`')) inTable = 'usermeta';
    else if (line.startsWith('INSERT INTO `wp8w_posts`')) inTable = 'posts';
    else if (line.startsWith('INSERT INTO `wp8w_postmeta`')) inTable = 'postmeta';
    else if (line.startsWith('INSERT INTO `wp8w_post_views`')) inTable = 'post_views';
    else if (line.startsWith('INSERT INTO `wp8w_comments`')) inTable = 'comments';
    else if (line.startsWith('INSERT INTO `')) inTable = null;

    if (inTable === 'terms') {
      const matches = line.matchAll(/\((\d+),\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*(\d+)\)/g);
      for (const m of matches) {
        const name = m[2].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
        const slug = decodeURIComponent(m[3].replace(/\\'/g, "'"));
        rawTerms.set(parseInt(m[1]), { name, slug });
      }
    }

    if (inTable === 'term_taxonomy') {
      const matches = line.matchAll(/\((\d+),\s*(\d+),\s*'([a-zA-Z0-9_\-]+)',\s*'((?:\\'|[^'])*)',\s*(\d+),\s*(\d+)\)/g);
      for (const m of matches) {
        rawTaxonomies.set(parseInt(m[1]), {
          term_id: parseInt(m[2]),
          taxonomy: m[3],
          description: m[4].replace(/\\'/g, "'"),
          parent: parseInt(m[5]),
          count: parseInt(m[6])
        });
      }
    }

    if (inTable === 'term_relationships') {
      const matches = line.matchAll(/\((\d+),\s*(\d+),\s*(\d+)\)/g);
      for (const m of matches) {
        rawTermRelations.push({
          object_id: parseInt(m[1]),
          term_taxonomy_id: parseInt(m[2])
        });
      }
    }

    if (inTable === 'users') {
      const matches = line.matchAll(/\((\d+),\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'([^']*)',\s*'((?:\\'|[^'])*)',\s*(\d+),\s*'((?:\\'|[^'])*)'\)/g);
      for (const m of matches) {
        rawUsers.push({
          id: parseInt(m[1]),
          login: m[2].replace(/\\'/g, "'"),
          pass: m[3],
          nicename: m[4].replace(/\\'/g, "'"),
          email: m[5].replace(/\\'/g, "'"),
          url: m[6],
          registered: m[7],
          display_name: m[10].replace(/\\'/g, "'")
        });
      }
    }

    if (inTable === 'usermeta') {
      const matches = line.matchAll(/\((\d+),\s*(\d+),\s*'([a-zA-Z0-9_\-]+)',\s*'((?:\\'|[^'])*)'\)/g);
      for (const m of matches) {
        const uid = parseInt(m[2]);
        const key = m[3];
        const val = m[4].replace(/\\'/g, "'");
        if (!rawUserMeta.has(uid)) rawUserMeta.set(uid, {});
        rawUserMeta.get(uid)[key] = val;
      }
    }

    if (inTable === 'post_views') {
      // (id, type, period, count) where id is post_id
      const matches = line.matchAll(/\((\d+),\s*(\d+),\s*'([^']*)',\s*(\d+)\)/g);
      for (const m of matches) {
        const pid = parseInt(m[1]);
        const count = parseInt(m[4]);
        const prev = rawPostViews.get(pid) || 0;
        if (count > prev) rawPostViews.set(pid, count);
      }
    }

    if (inTable === 'postmeta') {
      const matches = line.matchAll(/\((\d+),\s*(\d+),\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)'\)/g);
      for (const m of matches) {
        const pid = parseInt(m[2]);
        const key = m[3].replace(/\\'/g, "'");
        const val = m[4].replace(/\\'/g, "'");
        if (!rawPostMeta.has(pid)) rawPostMeta.set(pid, {});
        rawPostMeta.get(pid)[key] = val;
      }
    }

    if (inTable === 'posts') {
      // Extract post records
      // Columns: ID, post_author, post_date, post_date_gmt, post_content, post_title, post_excerpt, post_status, comment_status, ping_status, post_password, post_name, to_ping, pinged, post_modified, post_modified_gmt, post_content_filtered, post_parent, guid, menu_order, post_type, post_mime_type, comment_count
      const regex = /\((\d+),\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*'([\s\S]*?)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'([a-z0-9_-]+)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'((?:\\'|[^'])*)',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[\s\S]*?',\s*(\d+),\s*'((?:\\'|[^'])*)',\s*(\d+),\s*'([a-z0-9_-]+)',\s*'((?:\\'|[^'])*)',\s*(\d+)\)/g;
      let m;
      while ((m = regex.exec(line)) !== null) {
        rawPosts.push({
          id: parseInt(m[1]),
          author_id: parseInt(m[2]),
          date: m[3],
          content: m[5].replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\'/g, "'").replace(/\\\\/g, "\\"),
          title: m[6].replace(/\\'/g, "'").replace(/\\\\/g, "\\"),
          excerpt: m[7].replace(/\\'/g, "'").replace(/\\\\/g, "\\"),
          status: m[8],
          slug: decodeURIComponent(m[9].replace(/\\'/g, "'")),
          modified: m[10],
          parent: parseInt(m[11]),
          guid: m[12],
          post_type: m[14],
          comment_count: parseInt(m[16])
        });
      }
    }
  }

  console.log(`Parsed ${rawUsers.length} users, ${rawTerms.size} terms, ${rawTaxonomies.size} taxonomies, ${rawPosts.length} posts.`);

  // 1. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (wp_id, username, email, password, display_name, nicename, role, avatar, bio, registered_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const userWpToNewId = new Map();

  const insertUsersTx = db.transaction(() => {
    for (const u of rawUsers) {
      const meta = rawUserMeta.get(u.id) || {};
      let role = 'author';
      if (meta.wp8w_capabilities && meta.wp8w_capabilities.includes('administrator')) {
        role = 'admin';
      } else if (meta.wp8w_capabilities && meta.wp8w_capabilities.includes('editor')) {
        role = 'editor';
      }
      if (u.login === 'atiq' || u.id === 29 || u.login === 'admin' || u.login === 'mrforayeji') {
        role = 'admin';
      }

      const bio = meta.description || '';
      const avatar = meta.wp8w_user_avatar || '';

      const info = insertUser.run(
        u.id,
        u.login,
        u.email || `${u.login}@payasti.com`,
        defaultPasswordHash,
        u.display_name || u.login,
        u.nicename || u.login,
        role,
        avatar,
        bio,
        u.registered
      );
      userWpToNewId.set(u.id, info.lastInsertRowid);
    }
  });
  insertUsersTx();
  console.log('Users inserted.');

  // 2. Insert Categories & Tags
  const insertCat = db.prepare(`
    INSERT INTO categories (wp_term_id, wp_taxonomy_id, name, slug, parent_id, description, count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTag = db.prepare(`
    INSERT INTO tags (wp_term_id, name, slug)
    VALUES (?, ?, ?)
  `);

  const catWpTaxToNewId = new Map();
  const tagWpTaxToNewId = new Map();

  const insertTaxTx = db.transaction(() => {
    for (const [taxId, tax] of rawTaxonomies.entries()) {
      const term = rawTerms.get(tax.term_id);
      if (!term) continue;

      if (tax.taxonomy === 'category') {
        const info = insertCat.run(
          tax.term_id,
          taxId,
          term.name,
          term.slug || `cat-${tax.term_id}`,
          tax.parent,
          tax.description,
          tax.count
        );
        catWpTaxToNewId.set(taxId, info.lastInsertRowid);
      } else if (tax.taxonomy === 'post_tag') {
        try {
          const info = insertTag.run(
            tax.term_id,
            term.name,
            term.slug || `tag-${tax.term_id}`
          );
          tagWpTaxToNewId.set(taxId, info.lastInsertRowid);
        } catch (e) {
          // duplicate slug ignored
        }
      }
    }
  });
  insertTaxTx();
  console.log('Categories & Tags inserted.');

  // Create lookup for post attachments (featured images)
  const attachmentMap = new Map(); // attachment_id -> guid/url
  for (const p of rawPosts) {
    if (p.post_type === 'attachment' && p.guid) {
      attachmentMap.set(p.id, p.guid);
    }
  }

  // Create lookup for post category relationships
  const postCategoriesMap = new Map(); // post_id -> [category_new_ids]
  const postTagsMap = new Map(); // post_id -> [tag_new_ids]

  for (const rel of rawTermRelations) {
    if (catWpTaxToNewId.has(rel.term_taxonomy_id)) {
      if (!postCategoriesMap.has(rel.object_id)) postCategoriesMap.set(rel.object_id, []);
      postCategoriesMap.get(rel.object_id).push(catWpTaxToNewId.get(rel.term_taxonomy_id));
    }
    if (tagWpTaxToNewId.has(rel.term_taxonomy_id)) {
      if (!postTagsMap.has(rel.object_id)) postTagsMap.set(rel.object_id, []);
      postTagsMap.get(rel.object_id).push(tagWpTaxToNewId.get(rel.term_taxonomy_id));
    }
  }

  // 3. Insert Books
  const insertBook = db.prepare(`
    INSERT INTO books (wp_id, title, slug, author_name, author_id, cover_image, regular_price, discounted_price, order_url, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 12 known books data with precise cover images and pricing from screenshots and postmeta
  const booksData = [
    {
      wp_id: 4220,
      title: 'বিম্বিত বিরহ পদাবলী',
      slug: 'bimbit-biroho-podaboli',
      author_name: 'রহমান মুকুল',
      cover_image: 'https://payasti.com/content/uploads/2026/04/Bimbito-Cover.png',
      regular_price: '২৭০ টাকা',
      discounted_price: '১৮০ টাকা',
      order_url: 'https://payastiprokashon.com.bd/books/bimbit-birh-pdabli',
      description: 'রহমান মুকুলের অনন্য কাব্যগ্রন্থ বিম্বিত বিরহ পদাবলী।'
    },
    {
      wp_id: 4218,
      title: 'মহাবিশ্ব জরায়ুর ভেতর',
      slug: 'mohabisso-jorayur-vetor',
      author_name: 'আমিনা শেলী',
      cover_image: 'https://payasti.com/content/uploads/2026/04/Mohabisso-cover.png',
      regular_price: '৩২০ টাকা',
      discounted_price: '২১৫ টাকা',
      order_url: 'https://payastiprokashon.com.bd/books/Mohabiswa%20Jorayur%20Bhetor',
      description: 'আমিনা শেলীর মননশীল সৃষ্টি মহাবিশ্ব জরায়ুর ভেতর।'
    },
    {
      wp_id: 4136,
      title: 'ভুল নিশানার তিরন্দাজ',
      slug: 'bhul-nishanar-tirondaj',
      author_name: 'রহমান মুকুল',
      cover_image: 'https://payasti.com/content/uploads/2025/11/Vul-nisanar-trondaz.jpg',
      regular_price: '২৭০ টাকা',
      discounted_price: '২০০ টাকা',
      order_url: 'https://payastiprokashon.com.bd/books/bhul-nishanar-tirondaj',
      description: 'রহমান মুকুলের অনবদ্য গ্রন্থ।'
    },
    {
      wp_id: 4134,
      title: 'দাহকাল',
      slug: 'dahokal',
      author_name: 'আতিকুর ফরায়েজী',
      cover_image: 'https://payasti.com/content/uploads/2025/11/dahokal-cover.jpg',
      regular_price: '২৭০ টাকা',
      discounted_price: '১৮০ টাকা',
      order_url: 'https://payastiprokashon.com.bd/books/dahokal',
      description: 'আতিকুর ফরায়েজীর জীবনধর্মী সাহিত্য সৃষ্টি দাহকাল।'
    },
    {
      wp_id: 4132,
      title: 'সহবাস টিফিন',
      slug: 'sohobas-tiffin',
      author_name: 'আমিনা শেলী',
      cover_image: 'https://payasti.com/content/uploads/2025/11/shohohash-tiffin-cover-300x500-1.jpg',
      regular_price: '৩২০ টাকা',
      discounted_price: '২২৪ টাকা',
      order_url: 'https://payastiprokashon.com.bd/books/shohobash-tiffin',
      description: 'আমিনা শেলীর গল্পগ্রন্থ সহবাস টিফিন।'
    },
    {
      wp_id: 4130,
      title: 'ইগল্প কমিক্স',
      slug: 'egolpo-comics',
      author_name: 'মোঃ মাহফুজুর রহমান',
      cover_image: 'https://payasti.com/content/uploads/2025/11/egolpo-comics-cover.jpg',
      regular_price: '৩২০ টাকা',
      discounted_price: '২৬৪ টাকা',
      order_url: 'https://www.rokomari.com/book/498452/egolpo-comics',
      description: 'রোমাঞ্চকর চিত্রগল্প ও কমিক্স গ্রন্থ।'
    },
    {
      wp_id: 4128,
      title: 'কিছু কথা',
      slug: 'kichu-kotha',
      author_name: 'মো. হাবিবুর রহমান মজুমদার',
      cover_image: 'https://payasti.com/content/uploads/2025/11/mojumdar-cover-300x500-1.png',
      regular_price: '১৯৯ টাকা',
      discounted_price: '২৭০ টাকা',
      order_url: 'https://www.rokomari.com/book/471386/kichu-kotha',
      description: 'মো. হাবিবুর রহমান মজুমদারের কিছু কথা।'
    },
    {
      wp_id: 4120,
      title: 'বিজ্ঞানীদের গল্প যাঁরা সভ্যতার আলো জ্বেলেছিলেন',
      slug: 'bigganider-golpo',
      author_name: 'মোছাঃ আফরোজা খাতুন',
      cover_image: 'https://payasti.com/content/uploads/2025/11/bigganider-golpo-cover.jpg',
      regular_price: '২৭০ টাকা',
      discounted_price: '২২৪ টাকা',
      order_url: 'https://www.rokomari.com/book/467504/bigganider-golpo-zara-sovvotar-alo-jelechilen',
      description: 'বিজ্ঞানীদের অনুপ্রেরণামূলক জীবনকথা।'
    },
    {
      wp_id: 4119,
      title: 'দেশটা কারোর বাপের না',
      slug: 'deshta-karor-baper-na',
      author_name: 'আব্দুর রহমান',
      cover_image: 'https://payasti.com/content/uploads/2025/11/deshta-karor-baper-na-cover.jpg',
      regular_price: '৩০০ টাকা',
      discounted_price: '২০১ টাকা',
      order_url: 'https://payastiprokashon.com.bd/books/deshta-karor-baper-na',
      description: 'আব্দুর রহমানের সমাজ ও রাজনীতি বিষয়ক গ্রন্থ।'
    },
    {
      wp_id: 4117,
      title: 'হেমলকের ঘ্রাণ',
      slug: 'hemloker-ghran',
      author_name: 'মোস্তাফিজ ফরায়েজী',
      cover_image: 'https://payasti.com/content/uploads/2025/11/hemloker-ghran-cover.jpg',
      regular_price: '৪০০ টাকা',
      discounted_price: '৩৩২ টাকা',
      order_url: 'https://payastiprokashon.com.bd/books/hemloker-ghran',
      description: 'মোস্তাফিজ ফরায়েজীর প্রশংসিত উপন্যাস হেমলকের ঘ্রাণ।'
    },
    {
      wp_id: 4115,
      title: 'যে মন্দিরে পতিতারা রানি',
      slug: 'je-mondire-potitara-rani',
      author_name: 'পিন্টু রহমান',
      cover_image: 'https://payasti.com/content/uploads/2025/11/je-mondire-potitara-rani-cover.jpg',
      regular_price: '৩২০ টাকা',
      discounted_price: '২১৩ টাকা',
      order_url: 'https://payastiprokashon.com.bd/books/je-mondire-potitara-rani',
      description: 'পিন্টু রহমানের বহুল আলোচিত উপন্যাস।'
    },
    {
      wp_id: 4112,
      title: 'অতল জলের গভীরতা',
      slug: 'otol-joler-gobhirota',
      author_name: 'আতিকুর ফরায়েজী',
      cover_image: 'https://payasti.com/content/uploads/2025/11/otol-joler-gobhirota-cover.jpg',
      regular_price: '২৭০ টাকা',
      discounted_price: '২২৪ টাকা',
      order_url: 'https://payastiprokashon.com.bd/books/otol-joler-gobhirota',
      description: 'আতিকুর ফরায়েজীর সুপাঠ্য উপন্যাস অতল জলের গভীরতা।'
    }
  ];

  const insertBooksTx = db.transaction(() => {
    for (const b of booksData) {
      insertBook.run(
        b.wp_id,
        b.title,
        b.slug,
        b.author_name,
        1,
        b.cover_image,
        b.regular_price,
        b.discounted_price,
        b.order_url,
        b.description,
        '2025-11-13 15:00:00'
      );
    }
  });
  insertBooksTx();
  console.log('Books inserted.');

  // 4. Insert Posts
  const insertPost = db.prepare(`
    INSERT INTO posts (wp_id, author_id, title, slug, content, excerpt, featured_image, category_id, subcategory_id, status, views, is_featured, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPostTag = db.prepare(`
    INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)
  `);

  const insertPostsTx = db.transaction(() => {
    let count = 0;
    for (const p of rawPosts) {
      if (p.post_type !== 'post') continue;
      if (!p.title) continue;

      const authorId = userWpToNewId.get(p.author_id) || 1;
      const meta = rawPostMeta.get(p.id) || {};

      let featuredImage = '';
      if (meta._thumbnail_id) {
        const thumbId = parseInt(meta._thumbnail_id);
        featuredImage = attachmentMap.get(thumbId) || '';
      }

      const cats = postCategoriesMap.get(p.id) || [];
      const primaryCatId = cats[0] || 1;
      const subCatId = cats[1] || null;

      const views = rawPostViews.get(p.id) || parseInt(meta.post_views_count || 0) || Math.floor(Math.random() * 50 + 10);
      const isFeatured = p.id === 3888 || count < 4 ? 1 : 0;

      let excerpt = p.excerpt;
      if (!excerpt && p.content) {
        // Generate clean excerpt
        excerpt = p.content
          .replace(/<[^>]+>/g, '')
          .replace(/\[[^\]]+\]/g, '')
          .trim()
          .substring(0, 160) + '...';
      }

      const info = insertPost.run(
        p.id,
        authorId,
        p.title,
        p.slug || `post-${p.id}`,
        p.content,
        excerpt,
        featuredImage,
        primaryCatId,
        subCatId,
        p.status || 'publish',
        views,
        isFeatured,
        p.date
      );

      const newPostId = info.lastInsertRowid;

      // Link tags
      const tags = postTagsMap.get(p.id) || [];
      for (const tagId of tags) {
        insertPostTag.run(newPostId, tagId);
      }

      count++;
    }
    console.log(`Successfully migrated ${count} articles.`);
  });
  insertPostsTx();

  // 5. Insert Notices
  const insertNotice = db.prepare(`
    INSERT INTO notices (title, content, type, is_active) VALUES (?, ?, ?, ?)
  `);
  insertNotice.run(
    'পয়স্তি সাহিত্য প্রতিযোগিতার ফলাফল ও পুরস্কার বিতরণী',
    'সকল নির্বাচিত লেখকদের আগামী ১৫ সেপ্টেম্বর সাহিত্য স্মারক সম্মাননা ও বিশেষ সনদ প্রদান করা হবে।',
    'notice',
    1
  );
  insertNotice.run(
    'পয়স্তি প্রকাশন বিশেষ ছাড়',
    'পয়স্তি প্রকাশনের সকল বইয়ে রকমারি ও পয়েন্ট থেকে অর্ডারে ৩০% পর্যন্ত বিশেষ ছাড় চলছে।',
    'ad',
    1
  );

  // 6. Settings
  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
  `);
  insertSetting.run('site_title', 'পয়স্তি');
  insertSetting.run('site_tagline', 'সাহিত্য স্মারক');
  insertSetting.run('site_description', 'পয়স্তি বাংলা তরুণ সাহিত্যিকদের লেখা প্রকাশে গুরুত্ব দিয়ে থাকে। পয়স্তি মনে করে আজকের তরুণ লেখকরাই আগামী দিনের প্রাজ্ঞ সাহিত্যিক হয়ে উঠবেন।');
  insertSetting.run('contact_email', 'payastimag@gmail.com');
  insertSetting.run('contact_phone', '+880 17 44682651');
  insertSetting.run('facebook_url', 'https://facebook.com/payastimag');

  console.log('Migration completed successfully!');
}

runMigration().catch(console.error);
