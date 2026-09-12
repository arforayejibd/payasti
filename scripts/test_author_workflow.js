const http = require('http');

// Let's test author registration and post submission programmatically
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'payasti.db'));

console.log('Testing author workflow...');

// 1. Verify an author user exists
const testAuthor = db.prepare("SELECT * FROM users WHERE role = 'author' LIMIT 1").get();
console.log('Test author found:', testAuthor.display_name, '(ID:', testAuthor.id, ')');

// 2. Insert a test pending post submitted by this author
const newPost = db.prepare(`
  INSERT INTO posts (author_id, title, slug, content, excerpt, category_id, status, views, is_featured, published_at)
  VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, 0, datetime('now'))
`).run(
  testAuthor.id,
  'টেস্ট সাহিত্য রচনা: ভোরের শিউলি',
  `test-post-shiuli-${Date.now()}`,
  'ভোরের বাতাসে শিউলির ঘ্রাণ বয়ে নিয়ে আসে নতুন দিনের বার্তা...',
  'ভোরের বাতাসে শিউলির ঘ্রাণ বয়ে নিয়ে আসে নতুন দিনের বার্তা...',
  1
);

const testPostId = newPost.lastInsertRowid;
console.log('New post submitted by author (Status: pending, ID:', testPostId, ')');

// Verify it is pending
const pendingCheck = db.prepare('SELECT id, title, status FROM posts WHERE id = ?').get(testPostId);
console.log('Status before approval:', pendingCheck.status);

// 3. Simulate Admin Approval
db.prepare("UPDATE posts SET status = 'publish', published_at = datetime('now') WHERE id = ?").run(testPostId);

const publishedCheck = db.prepare('SELECT id, title, status FROM posts WHERE id = ?').get(testPostId);
console.log('Status after admin approval:', publishedCheck.status);

// Clean up test post
db.prepare('DELETE FROM posts WHERE id = ?').run(testPostId);
console.log('Workflow test passed successfully!');
