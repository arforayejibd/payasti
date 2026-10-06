/**
 * Author Badge & Ranking System (Single Source of Truth)
 * 
 * Centralized ranking hierarchy and rendering helpers.
 * Rank 1: 👑 জনপ্রিয় সাহিত্যিক (১০,০০০+ ভিউ)
 * Rank 2: 🌟 পাঠকপ্রিয় (১,০০০+ ভিউ)
 * Rank 3: 🏆 সিদ্ধহস্ত লেখক (১৫+ লেখা)
 * Rank 4: 📜 শব্দসাধক (৫+ লেখা)
 */

const AUTHOR_BADGE_TIERS = [
  {
    id: 'viral',
    rank: 1,
    title: 'জনপ্রিয় সাহিত্যিক',
    icon: '👑',
    tagClass: 'badge-viral',
    tooltip: '১০,০০০+ পাঠক সমৃদ্ধ জনপ্রিয় লেখক',
    pillStyle: 'background: rgba(236, 72, 153, 0.25); border-color: #f472b6; color: #fff;',
    check: (views, posts) => views >= 10000
  },
  {
    id: 'popular',
    rank: 2,
    title: 'পাঠকপ্রিয়',
    icon: '🌟',
    tagClass: 'badge-popular',
    tooltip: '১,০০০+ পাঠক সমৃদ্ধ পাঠকপ্রিয় লেখক',
    pillStyle: 'background: rgba(139, 92, 246, 0.25); border-color: #c084fc; color: #fff;',
    check: (views, posts) => views >= 1000
  },
  {
    id: 'master',
    rank: 3,
    title: 'সিদ্ধহস্ত লেখক',
    icon: '🏆',
    tagClass: 'badge-master',
    tooltip: '১৫টির বেশি সাহিত্য প্রকাশ',
    pillStyle: 'background: rgba(245, 158, 11, 0.25); border-color: #fbbf24; color: #fff;',
    check: (views, posts) => posts >= 15
  },
  {
    id: 'rising',
    rank: 4,
    title: 'শব্দসাধক',
    icon: '📜',
    tagClass: 'badge-rising',
    tooltip: '৫টির বেশি সাহিত্য প্রকাশ',
    pillStyle: 'background: rgba(59, 130, 246, 0.25); border-color: #60a5fa; color: #fff;',
    check: (views, posts) => posts >= 5
  }
];

/**
 * Returns the single top badge object for an author
 */
function getAuthorTopBadge(totalViews, postCount) {
  const views = Number(totalViews || 0);
  const posts = Number(postCount || 0);

  for (const tier of AUTHOR_BADGE_TIERS) {
    if (tier.check(views, posts)) {
      return tier;
    }
  }
  return null;
}

/**
 * Renders HTML string for the author badge tag
 */
function renderAuthorBadgeTag(totalViews, postCount) {
  const badge = getAuthorTopBadge(totalViews, postCount);
  if (!badge) return '';
  return `<span class="author-badge-tag ${badge.tagClass}" title="${badge.tooltip}">${badge.icon} ${badge.title}</span>`;
}

/**
 * Renders HTML string for the floating avatar badge
 */
function renderAuthorAvatarBadge(totalViews, postCount, size = 'md') {
  const badge = getAuthorTopBadge(totalViews, postCount);
  if (!badge) return '';
  return `<span class="avatar-floating-badge badge-size-${size} ${badge.tagClass}" title="${badge.title} (${badge.tooltip})">${badge.icon}</span>`;
}

/**
 * Author Stats Cache (AuthorId / Slug / Name -> TopBadge)
 * Enables instant O(1) badge lookups inside post card loops without extra DB queries
 */
let authorBadgesCache = new Map();
let lastCacheTime = 0;
let isRefreshing = false;

function normalizeKey(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width spaces
}

async function refreshAuthorBadgesCache() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const db = require('../config/database');
    const rows = await db.prepare(`
      SELECT u.id, u.nicename, u.username, u.display_name,
             COALESCE(SUM(p.views), 0) AS total_views,
             COUNT(p.id) AS post_count
      FROM users u
      LEFT JOIN posts p ON u.id = p.author_id AND p.status = 'publish'
      GROUP BY u.id
    `).all();

    const newMap = new Map();
    if (rows && rows.length) {
      for (const r of rows) {
        const b = getAuthorTopBadge(r.total_views, r.post_count);
        if (b) {
          if (r.id) newMap.set(Number(r.id), b);
          if (r.nicename) {
            newMap.set(normalizeKey(r.nicename), b);
            newMap.set(String(r.nicename).trim().toLowerCase(), b);
          }
          if (r.username) {
            newMap.set(normalizeKey(r.username), b);
            newMap.set(String(r.username).trim().toLowerCase(), b);
          }
          if (r.display_name) {
            newMap.set(normalizeKey(r.display_name), b);
            newMap.set(String(r.display_name).trim(), b);
            // Handle Bengali য় and য় variations
            const altName1 = r.display_name.replace(/\u09DF/g, '\u09AF\u09BC');
            const altName2 = r.display_name.replace(/\u09AF\u09BC/g, '\u09DF');
            newMap.set(normalizeKey(altName1), b);
            newMap.set(normalizeKey(altName2), b);
          }
        }
      }
    }
    authorBadgesCache = newMap;
    lastCacheTime = Date.now();
  } catch (e) {
    // Non-blocking fallback
  } finally {
    isRefreshing = false;
  }
}

/**
 * Returns author badge by author ID, slug, or display name from fast cache
 */
function getBadgeByAuthorId(authorKey) {
  if (!authorKey) return null;
  
  if (Date.now() - lastCacheTime > 60000 || authorBadgesCache.size === 0) {
    refreshAuthorBadgesCache().catch(() => {});
  }
  
  if (typeof authorKey === 'number' || (!isNaN(Number(authorKey)) && Number(authorKey) > 0)) {
    const byId = authorBadgesCache.get(Number(authorKey));
    if (byId) return byId;
  }
  
  const normKey = normalizeKey(authorKey);
  const byNorm = authorBadgesCache.get(normKey);
  if (byNorm) return byNorm;

  const rawStr = String(authorKey).trim();
  const byRaw = authorBadgesCache.get(rawStr) || authorBadgesCache.get(rawStr.toLowerCase());
  if (byRaw) return byRaw;

  // Bengali ya variants fallback
  const alt1 = normKey.replace(/\u09DF/g, '\u09AF\u09BC');
  const alt2 = normKey.replace(/\u09AF\u09BC/g, '\u09DF');
  return authorBadgesCache.get(alt1) || authorBadgesCache.get(alt2) || null;
}

// Immediate eager execution
refreshAuthorBadgesCache().catch(() => {});

module.exports = {
  AUTHOR_BADGE_TIERS,
  getAuthorTopBadge,
  getBadgeByAuthorId,
  renderAuthorBadgeTag,
  renderAuthorAvatarBadge
};


