const db = require('../config/database');
const { generateSeoMeta } = require('../middleware/seo');
const { toBengaliNumber, formatBengaliDate, formatCardExcerpt } = require('../middleware/banglaDate');
const { SITE_NAME, NAV_MENU, EDITORIAL_BOARD, CONTACT } = require('../config/constants');
const { LITERARY_THEMES, getThemeBySlug } = require('../helpers/literaryThemeHelper');

/**
 * 1. Themes Directory Page (/themes, /বিষয়, /অনুভূতি)
 */
exports.getThemesDirectory = async (req, res) => {
  try {
    const seo = generateSeoMeta({
      title: `অনুভূতি ও বিষয়ভিত্তিক সাহিত্য অন্বেষণ - ${SITE_NAME}`,
      description: 'প্রেম, বিরহ, স্মৃতি, দ্রোহ, বিপ্লব, প্রকৃতি ও জীবনবোধের অনন্য সাহিত্যিক সংকলন।',
      url: '/themes'
    });

    res.render('themes_list', {
      themes: LITERARY_THEMES,
      seo,
      toBengaliNumber,
      formatBengaliDate,
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  } catch (err) {
    console.error('Error in getThemesDirectory:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি',
      message: 'বিষয়ভিত্তিক ডিরেক্টরি লোড করতে সমস্যা হয়েছে।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};

/**
 * 2. Theme Archive Page (/theme/:slug, /বিষয়/:slug)
 * Uses high-precision semantic matching and weighted relevance ranking.
 */
exports.getThemeArchive = async (req, res) => {
  try {
    const { slug } = req.params;
    const theme = getThemeBySlug(slug);

    if (!theme) {
      return res.status(404).render('error', {
        title: 'বিষয়টি পাওয়া যায়নি',
        message: 'আপনি যে সাহিত্যিক বিষয়টি খুঁজছেন তা খুঁজে পাওয়া যায়নি।',
        seo: generateSeoMeta({ title: 'বিষয়টি পাওয়া যায়নি' }),
        navMenu: NAV_MENU,
        editorialBoard: EDITORIAL_BOARD,
        contact: CONTACT
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = 16;
    const offset = (page - 1) * limit;

    const coreKeywords = theme.core || theme.keywords || [];
    const extendedKeywords = theme.extended || [];
    const allKeywords = [...coreKeywords, ...extendedKeywords];

    // Build Weighted Relevance Expression across all keywords
    const scoreFragments = [];
    const fetchParams = [];

    // Core keywords: Title (25), Tag (15), Excerpt (8), Content (2)
    coreKeywords.forEach(kw => {
      scoreFragments.push(`(
        CASE WHEN p.title LIKE ? THEN 25 ELSE 0 END +
        CASE WHEN t.name LIKE ? THEN 15 ELSE 0 END +
        CASE WHEN p.excerpt LIKE ? THEN 8 ELSE 0 END +
        CASE WHEN p.content LIKE ? THEN 2 ELSE 0 END
      )`);
      fetchParams.push(`%${kw}%`, `%${kw}%`, `%${kw}%`, `%${kw}%`);
    });

    // Extended keywords: Title (15), Tag (10), Excerpt (4), Content (1)
    extendedKeywords.forEach(kw => {
      scoreFragments.push(`(
        CASE WHEN p.title LIKE ? THEN 15 ELSE 0 END +
        CASE WHEN t.name LIKE ? THEN 10 ELSE 0 END +
        CASE WHEN p.excerpt LIKE ? THEN 4 ELSE 0 END +
        CASE WHEN p.content LIKE ? THEN 1 ELSE 0 END
      )`);
      fetchParams.push(`%${kw}%`, `%${kw}%`, `%${kw}%`, `%${kw}%`);
    });

    const scoreExpression = scoreFragments.length > 0 ? scoreFragments.join(' + ') : '0';

    // Count Total Matching Posts with relevance score >= 2
    const countSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT p.id, MAX(${scoreExpression}) AS relevance_score
        FROM posts p
        LEFT JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.status = 'publish'
        GROUP BY p.id
        HAVING relevance_score >= 2
      ) AS matched_posts
    `;

    const totalRow = await db.prepare(countSql).get(...fetchParams);
    const totalPosts = totalRow ? totalRow.total : 0;
    const totalPages = Math.ceil(totalPosts / limit) || 1;

    // Fetch Posts ordered by highest relevance score and recency
    const queryParams = [...fetchParams, limit, offset];

    const cardFields = `
      p.id, p.author_id, p.title, p.slug, p.excerpt, p.content, p.published_at, p.views, p.category_id, p.subcategory_id,
      u.display_name AS author_name, u.nicename AS author_slug, u.avatar AS author_avatar,
      c.name AS category_name, c.slug AS category_slug,
      MAX(${scoreExpression}) AS relevance_score
    `;

    const posts = await db.prepare(`
      SELECT ${cardFields}
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.status = 'publish'
      GROUP BY p.id
      HAVING relevance_score >= 2
      ORDER BY relevance_score DESC, p.published_at DESC
      LIMIT ? OFFSET ?
    `).all(...queryParams);

    const seo = generateSeoMeta({
      title: `${theme.name} - বিষয়ভিত্তিক সাহিত্য সংকলন | ${SITE_NAME}`,
      description: theme.description,
      url: `/theme/${encodeURIComponent(theme.slug)}`
    });

    res.render('theme_posts', {
      theme,
      posts,
      allThemes: LITERARY_THEMES,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalPosts,
        basePath: `/theme/${encodeURIComponent(theme.slug)}`
      },
      seo,
      toBengaliNumber,
      formatBengaliDate,
      formatCardExcerpt,
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  } catch (err) {
    console.error('Error in getThemeArchive:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি',
      message: 'সাহিত্য সংকলন লোড করতে সমস্যা হয়েছে।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};
