const db = require('../config/database');
const { formatBengaliDate, toBengaliNumber } = require('../middleware/banglaDate');

/**
 * Daily Literature Cache
 * Keeps the selected literature in memory for the current date (YYYY-MM-DD)
 */
let cachedDailyPost = null;
let cachedDateStr = '';

/**
 * Generates a deterministic integer hash from a date string (YYYY-MM-DD)
 */
function getDateHash(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Retrieves the deterministic Literature of the Day based on the current date
 * (Spans all published posts: poems, stories, essays, etc.)
 */
async function getDailyPoem() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (cachedDailyPost && cachedDateStr === todayStr) {
    return cachedDailyPost;
  }

  try {
    // Fetch all published posts across all categories
    const posts = await db.prepare(`
      SELECT p.id, p.author_id, p.title, p.slug, p.excerpt, p.content, p.published_at, p.views, p.category_id,
             u.display_name AS author_name, u.nicename AS author_slug, u.avatar AS author_avatar,
             c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'publish'
      ORDER BY p.id ASC
    `).all();

    if (!posts || posts.length === 0) {
      return null;
    }

    // Deterministic selection using date hash modulo total posts
    const hash = getDateHash(todayStr);
    const selected = posts[hash % posts.length];

    cachedDailyPost = selected;
    cachedDateStr = todayStr;
    return selected;
  } catch (err) {
    console.error('Error fetching Daily Literature:', err);
    return null;
  }
}

/**
 * Formats a clean teaser stanza/excerpt from content
 */
function extractPoemStanza(content, maxLines = 2) {
  if (!content) return '';
  // Strip HTML tags and entities
  const clean = content.replace(/<[^>]*>/g, '\n').replace(/&nbsp;/g, ' ');
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  
  if (lines.length <= maxLines) {
    return lines.join('<br>');
  }
  
  const excerpt = lines.slice(0, maxLines).join('<br>');
  if (excerpt.length > 200) {
    return excerpt.substring(0, 190) + '...';
  }
  return excerpt;
}

module.exports = {
  getDailyPoem,
  getDailyLiterature: getDailyPoem,
  extractPoemStanza
};
