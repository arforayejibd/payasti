const db = require('../config/database');
const { generateCleanExcerpt } = require('../middleware/banglaDate');

console.log('Starting excerpt fix...');

const posts = db.prepare('SELECT id, title, content FROM posts').all();

const updateExcerpt = db.prepare('UPDATE posts SET excerpt = ? WHERE id = ?');

const transaction = db.transaction((posts) => {
  let count = 0;
  for (const post of posts) {
    if (!post.content) continue;
    const clean = generateCleanExcerpt(post.content, 200);
    updateExcerpt.run(clean, post.id);
    count++;
  }
  return count;
});

const updatedCount = transaction(posts);
console.log(`Successfully updated excerpts for ${updatedCount} posts.`);
