const db = require('../config/database');
const { generateEnglishSlug } = require('../utils/slugify');

async function migrateAllSlugsToEnglish() {
  console.log('🔄 Starting Bengali to English slug migration...');
  
  try {
    const posts = await db.prepare('SELECT id, title, slug FROM posts ORDER BY id ASC').all();
    console.log(`📊 Total posts found: ${posts.length}`);

    // Track used slugs to guarantee uniqueness
    const usedSlugs = new Set();
    
    // First, register any existing English slugs that don't need changes
    posts.forEach(p => {
      const hasBangla = /[\u0980-\u09FF]/.test(p.slug || '');
      if (!hasBangla && p.slug) {
        usedSlugs.add(p.slug);
      }
    });

    let updatedCount = 0;
    let skippedCount = 0;

    for (const post of posts) {
      const hasBangla = /[\u0980-\u09FF]/.test(post.slug || '');
      
      if (!hasBangla && post.slug && post.slug.trim()) {
        skippedCount++;
        continue;
      }

      // Generate clean English slug from post title
      let baseSlug = generateEnglishSlug(post.title) || `post-${post.id}`;
      let finalSlug = baseSlug;
      let counter = 2;

      // Ensure uniqueness
      while (usedSlugs.has(finalSlug)) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      usedSlugs.add(finalSlug);

      await db.prepare('UPDATE posts SET slug = ? WHERE id = ?').run(finalSlug, post.id);
      updatedCount++;
      
      if (updatedCount <= 10 || updatedCount % 50 === 0 || updatedCount === posts.length) {
        console.log(`✅ [Post #${post.id}] "${post.title.substring(0, 40)}..."`);
        console.log(`   Old: ${post.slug}`);
        console.log(`   New: ${finalSlug}`);
      }
    }

    console.log('\n🎉 Migration complete!');
    console.log(`✅ Successfully converted ${updatedCount} posts to clean English permalinks.`);
    console.log(`ℹ️ Already English / Skipped: ${skippedCount} posts.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during slug migration:', err);
    process.exit(1);
  }
}

migrateAllSlugsToEnglish();
