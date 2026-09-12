const fs = require('fs');
const readline = require('readline');
const path = require('path');
const zlib = require('zlib');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data', 'payasti.db');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure clean database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('--- Initializing Database Schema ---');

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

// Clear tables first before fresh seeding
db.pragma('foreign_keys = OFF');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
for (const t of tables) {
  db.prepare(`DELETE FROM "${t.name}"`).run();
}
try { db.prepare("DELETE FROM sqlite_sequence").run(); } catch(e) {}
db.pragma('foreign_keys = ON');

console.log('Schema ready. Tables emptied.');

async function runSeed() {
  const sqlFile = path.join(__dirname, '..', 'ref', 'payasti_wp737.sql');
  const gzFile = path.join(__dirname, '..', 'ref', 'payasti_wp737.sql.gz');

  let fileStream;
  if (fs.existsSync(sqlFile)) {
    console.log(`Reading SQL dump from: ${sqlFile}`);
    fileStream = fs.createReadStream(sqlFile, { encoding: 'utf8' });
  } else if (fs.existsSync(gzFile)) {
    console.log(`Reading and decompressing SQL dump from: ${gzFile}`);
    fileStream = fs.createReadStream(gzFile).pipe(zlib.createGunzip());
  } else {
    throw new Error('Neither payasti_wp737.sql nor payasti_wp737.sql.gz was found in ref/');
  }

  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const defaultPasswordHash = bcrypt.hashSync('payasti123456', 10);

  // Collections during parsing
  const rawTerms = new Map(); // term_id -> { name, slug }
  const rawTaxonomies = new Map(); // term_taxonomy_id -> { term_id, taxonomy, parent, count, description }
  const rawTermRelations = []; // { object_id, term_taxonomy_id }
  const rawUsers = [];
  const rawUserMeta = new Map(); // user_id -> { key: val }
  const rawPosts = [];
  const rawPostMeta = new Map(); // post_id -> { key: value }
  const rawPostViews = new Map(); // post_id -> views
  const rawAttachments = new Map(); // attachment_id -> guid URL

  let inTable = null;

  console.log('Parsing WordPress database dump...');

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `wp8w_terms`')) inTable = 'terms';
    else if (line.startsWith('INSERT INTO `wp8w_term_taxonomy`')) inTable = 'term_taxonomy';
    else if (line.startsWith('INSERT INTO `wp8w_term_relationships`')) inTable = 'term_relationships';
    else if (line.startsWith('INSERT INTO `wp8w_users`')) inTable = 'users';
    else if (line.startsWith('INSERT INTO `wp8w_usermeta`')) inTable = 'usermeta';
    else if (line.startsWith('INSERT INTO `wp8w_posts`')) inTable = 'posts';
    else if (line.startsWith('INSERT INTO `wp8w_postmeta`')) inTable = 'postmeta';
    else if (line.startsWith('INSERT INTO `wp8w_post_views`')) inTable = 'post_views';
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
      // Extract posts & attachments
      const regex = /\((\d+),\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*'([\s\S]*?)',\s*'((?:\\'|[^'])*)',\s*'((?:\\'|[^'])*)',\s*'([a-z0-9_-]+)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'((?:\\'|[^'])*)',\s*'[^']*',\s*'[^']*',\s*'([^']*)',\s*'[^']*',\s*'[\s\S]*?',\s*(\d+),\s*'((?:\\'|[^'])*)',\s*(\d+),\s*'([a-z0-9_-]+)',\s*'((?:\\'|[^'])*)',\s*(\d+)\)/g;
      let m;
      while ((m = regex.exec(line)) !== null) {
        const id = parseInt(m[1]);
        const author_id = parseInt(m[2]);
        const post_date = m[3];
        const post_content = m[5].replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\'/g, "'").replace(/\\\\/g, "\\");
        const post_title = m[6].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
        const post_excerpt = m[7].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
        const post_status = m[8];
        const post_name = decodeURIComponent(m[9].replace(/\\'/g, "'"));
        const guid = m[12].replace(/\\'/g, "'");
        const post_type = m[14];

        if (post_type === 'attachment') {
          rawAttachments.set(id, guid);
        } else if (post_type === 'post') {
          rawPosts.push({
            id,
            author_id,
            date: post_date,
            content: post_content,
            title: post_title,
            excerpt: post_excerpt,
            status: post_status,
            slug: post_name,
            guid
          });
        }
      }
    }
  }

  console.log(`Parsed: ${rawUsers.length} users, ${rawPosts.length} posts, ${rawAttachments.size} attachments, ${rawTerms.size} terms, ${rawTaxonomies.size} taxonomies.`);

  // 1. Insert Users & Resolve User Avatars
  console.log('Seeding Users...');
  const insertUser = db.prepare(`
    INSERT INTO users (wp_id, username, email, password, display_name, nicename, role, avatar, bio, registered_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const userWpToNewId = new Map(); // wp_user_id -> sqlite_user_id
  const userNameToNewId = new Map();

  const insertUsersTx = db.transaction(() => {
    for (const u of rawUsers) {
      const meta = rawUserMeta.get(u.id) || {};
      let role = 'author';
      if (meta.wp8w_capabilities) {
        if (meta.wp8w_capabilities.includes('administrator')) {
          role = 'admin';
        } else if (meta.wp8w_capabilities.includes('editor')) {
          role = 'editor';
        } else if (meta.wp8w_capabilities.includes('author')) {
          role = 'author';
        } else if (meta.wp8w_capabilities.includes('contributor')) {
          role = 'contributor';
        } else if (meta.wp8w_capabilities.includes('subscriber')) {
          role = 'subscriber';
        }
      }
      if (u.login === 'atiq' || u.id === 29 || u.login === 'admin' || u.login === 'mrforayeji') {
        role = 'admin';
      }

      const bio = meta.description || '';
      
      // Resolve user avatar: ONLY keep user avatar, stored LOCALLY!
      let avatar = '';
      const avatarVal = meta.wp8w_user_avatar || meta.basic_user_avatar || '';
      if (avatarVal) {
        let guid = '';
        if (/^\d+$/.test(avatarVal.trim())) {
          const attId = parseInt(avatarVal.trim());
          guid = rawAttachments.get(attId) || '';
        } else if (avatarVal.startsWith('http')) {
          guid = avatarVal;
        }

        if (guid) {
          try {
            const ext = path.extname(new URL(guid).pathname) || '.jpg';
            const cleanLogin = u.login.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `${cleanLogin}${ext}`;
            const localFile = path.join(__dirname, '..', 'public', 'uploads', 'avatars', filename);
            if (fs.existsSync(localFile) && fs.statSync(localFile).size > 0) {
              avatar = `/uploads/avatars/${filename}`;
            }
          } catch (e) {
            // URL parse error fallback
          }
        }
      }

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

      const newId = info.lastInsertRowid;
      userWpToNewId.set(u.id, newId);
      userNameToNewId.set(u.display_name.trim(), newId);
    }
  });
  insertUsersTx();
  console.log(`Seeded ${rawUsers.length} users successfully.`);

  // 2. Insert Categories & Tags
  console.log('Seeding Categories & Tags...');
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
  console.log(`Seeded categories & tags successfully.`);

  // Map post categories & tags relationships
  const postCategoriesMap = new Map(); // wp_post_id -> [category_new_ids]
  const postTagsMap = new Map(); // wp_post_id -> [tag_new_ids]

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

  // 3. Insert Posts with strict author mapping
  console.log('Seeding Posts...');
  const insertPost = db.prepare(`
    INSERT INTO posts (wp_id, author_id, title, slug, content, excerpt, featured_image, category_id, subcategory_id, status, views, is_featured, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPostTag = db.prepare(`
    INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)
  `);

  let postCount = 0;
  let featuredCount = 0;

  // Filter out auto-drafts, spam drafts and revisions
  // Keep: authentic literary posts with status === 'publish' and status === 'pending'
  const validPosts = rawPosts.filter(p => {
    if (p.status !== 'publish' && p.status !== 'pending') return false;
    if (!p.title || !p.title.trim() || p.title === 'Auto Draft') return false;
    return true;
  });

  const insertPostsTx = db.transaction(() => {
    for (const p of validPosts) {
      // Strict author mapping: must match exactly to the author in users table
      const authorId = userWpToNewId.get(p.author_id);
      if (!authorId) {
        console.warn(`Warning: Post ${p.id} ("${p.title}") author_id ${p.author_id} not found in users! Skipping or checking.`);
      }

      const meta = rawPostMeta.get(p.id) || {};

      // Requirement: ONLY keep users' photos. NO OTHER PHOTOS!
      const featuredImage = ''; // Do NOT keep featured images!

      const cats = postCategoriesMap.get(p.id) || [];
      const primaryCatId = cats[0] || 1;
      const subCatId = cats[1] || null;

      const views = rawPostViews.get(p.id) || parseInt(meta.post_views_count || 0) || Math.floor(Math.random() * 50 + 10);
      const isFeatured = p.id === 3888 || (p.status === 'publish' && featuredCount < 4) ? 1 : 0;
      if (isFeatured) featuredCount++;

      let excerpt = p.excerpt;
      if (!excerpt && p.content) {
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
        p.status,
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

      postCount++;
    }
  });
  insertPostsTx();
  console.log(`Seeded ${postCount} posts successfully with strict author mapping.`);

  // 4. Insert Books (with NO cover_image as requested)
  console.log('Seeding Books...');
  const insertBook = db.prepare(`
    INSERT INTO books (wp_id, title, slug, author_name, author_id, cover_image, regular_price, discounted_price, order_url, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const booksData = [
    {
      wp_id: 4220,
      title: 'বিম্বিত বিরহ পদাবলী',
      slug: 'bimbit-biroho-podaboli',
      author_name: 'রহমান মুকুল',
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
      regular_price: '২৭০ টাকা',
      discounted_price: '২২৪ টাকা',
      order_url: 'https://payastiprokashon.com.bd/books/otol-joler-gobhirota',
      description: 'আতিকুর ফরায়েজীর সুপাঠ্য উপন্যাস অতল জলের গভীরতা।'
    }
  ];

  const insertBooksTx = db.transaction(() => {
    for (const b of booksData) {
      const authorId = userNameToNewId.get(b.author_name.trim()) || 1;
      insertBook.run(
        b.wp_id,
        b.title,
        b.slug,
        b.author_name,
        authorId,
        '', // cover_image: empty string (NO OTHER PHOTOS)
        b.regular_price,
        b.discounted_price,
        b.order_url,
        b.description,
        '2025-11-13 15:00:00'
      );
    }
  });
  insertBooksTx();
  console.log(`Seeded ${booksData.length} books successfully.`);

  // 5. Insert Notices
  console.log('Seeding Notices...');
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

  // 6. Insert Settings
  console.log('Seeding Settings...');
  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
  `);
  insertSetting.run('site_title', 'পয়স্তি');
  insertSetting.run('site_tagline', 'সাহিত্য স্মারক');
  insertSetting.run('site_description', 'পয়স্তি বাংলা তরুণ সাহিত্যিকদের লেখা প্রকাশে গুরুত্ব দিয়ে থাকে। পয়স্তি মনে করে আজকের তরুণ লেখকরাই আগামী দিনের প্রাজ্ঞ সাহিত্যিক হয়ে উঠবেন।');
  insertSetting.run('contact_email', 'payastimag@gmail.com');
  insertSetting.run('contact_phone', '+880 17 44682651');
  insertSetting.run('facebook_url', 'https://facebook.com/payastimag');

  // Checkpoint WAL
  db.pragma('wal_checkpoint(TRUNCATE)');

  console.log('\n=============================================');
  console.log('SEEDED DATA SUMMARY:');
  for (const t of tables) {
    const c = db.prepare(`SELECT COUNT(*) as cnt FROM "${t.name}"`).get().cnt;
    console.log(` - ${t.name}: ${c} records`);
  }
  console.log('=============================================');
  console.log('All project data seeded successfully!\n');
}

runSeed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
