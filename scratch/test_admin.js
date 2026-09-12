const ejs = require('ejs');
const path = require('path');
const db = require('../config/database');
const { toBengaliNumber, formatBengaliDate } = require('../middleware/banglaDate');
const { generateSeoMeta } = require('../middleware/seo');

const user = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
const categories = db.prepare('SELECT id, name, slug, count FROM categories LIMIT 5').all();
const tags = db.prepare('SELECT id, name, slug FROM tags LIMIT 5').all();
const authors = db.prepare('SELECT id, display_name, username, role FROM users LIMIT 5').all();
const post = db.prepare('SELECT * FROM posts LIMIT 1').get();
const books = db.prepare('SELECT * FROM books LIMIT 5').all();
const settingsRows = db.prepare('SELECT * FROM settings').all();
const settings = {};
settingsRows.forEach(r => settings[r.key] = r.value);

const commonData = {
  user,
  toBengaliNumber,
  formatBengaliDate,
  adminPendingCount: 1,
  seo: generateSeoMeta({ title: 'Test Admin' })
};

const tests = [
  { file: 'dashboard.ejs', data: { ...commonData, activeMenu: 'admin_dashboard', stats: { pending: 1, published: 10, drafts: 2, users: 5, books: 3, totalViews: 500 }, recentPending: [post], recentPublished: [post], recentUsers: [user] } },
  { file: 'posts.ejs', data: { ...commonData, activeMenu: 'all_posts', posts: [post], statusFilter: 'all', categoryFilter: 'all', searchQuery: '', page: 1, totalPages: 1, totalFiltered: 1, counts: { all: 1, publish: 1, pending: 0, draft: 0 }, categories } },
  { file: 'post_new.ejs', data: { ...commonData, activeMenu: 'new_post', categories, authors, error: null } },
  { file: 'post_edit.ejs', data: { ...commonData, activeMenu: 'all_posts', post, categories, authors, error: null } },
  { file: 'pending_posts.ejs', data: { ...commonData, activeMenu: 'pending_posts', pendingPosts: [post] } },
  { file: 'categories.ejs', data: { ...commonData, activeMenu: 'posts_categories', categories: categories.map(c => ({ ...c, post_count: 5 })), error: null } },
  { file: 'tags.ejs', data: { ...commonData, activeMenu: 'posts_tags', tags: tags.map(t => ({ ...t, post_count: 2 })), error: null } },
  { file: 'media.ejs', data: { ...commonData, activeMenu: 'media', mediaFiles: [{ filename: 'test.jpg', url: '/uploads/test.jpg', size: '100 KB' }] } },
  { file: 'comments.ejs', data: { ...commonData, activeMenu: 'comments', comments: [{ id: 1, author_name: 'পাঠক', author_email: 'p@test.com', content: 'চমৎকার লেখা!', post_title: 'কবিতা', post_slug: 'kobita', status: 'approved', created_at: new Date().toISOString() }] } },
  { file: 'books.ejs', viewName: 'manage_books.ejs', data: { ...commonData, activeMenu: 'manage_books', books, error: null, success: null } },
  { file: 'users.ejs', data: { ...commonData, activeMenu: 'manage_users', users: [{ ...user, post_count: 5, published_count: 3 }], roleFilter: 'all', searchQuery: '', userStats: { total: 10, admins: 2, editors: 1, authors: 7 } } },
  { file: 'user_new.ejs', data: { ...commonData, activeMenu: 'manage_users', error: null } },
  { file: 'user_edit.ejs', data: { ...commonData, activeMenu: 'manage_users', targetUser: user, error: null } },
  { file: 'settings.ejs', data: { ...commonData, activeMenu: 'settings', settings, success: false } }
];

let completed = 0;
tests.forEach(t => {
  const targetFile = t.viewName || t.file;
  ejs.renderFile(path.join(__dirname, '..', 'views', 'admin', targetFile), t.data, (err, str) => {
    if (err) {
      console.error('FAILED:', targetFile, err);
      process.exit(1);
    } else {
      console.log('PASSED:', targetFile, 'Length:', str.length);
      completed++;
      if (completed === tests.length) {
        console.log('ALL 14 ADMIN VIEWS RENDERED WITH 100% SUCCESS!');
        process.exit(0);
      }
    }
  });
});
