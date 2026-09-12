const db = require('../config/database');

console.log('Creating database indexes for lightning-fast queries...');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_posts_status_published ON posts(status, published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_category_status ON posts(category_id, status);
  CREATE INDEX IF NOT EXISTS idx_posts_subcategory_status ON posts(subcategory_id, status);
  CREATE INDEX IF NOT EXISTS idx_posts_author_status ON posts(author_id, status);
  CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(is_featured, status);
  CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
  CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
  CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
  CREATE INDEX IF NOT EXISTS idx_users_slug ON users(nicename);
  CREATE INDEX IF NOT EXISTS idx_books_slug ON books(slug);
`);

console.log('Indexes created successfully!');
const indexes = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index'").all();
console.table(indexes);
