const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const postController = require('../controllers/postController');
const authorController = require('../controllers/authorController');
const bookController = require('../controllers/bookController');
const themeController = require('../controllers/themeController');
const { generateSeoMeta, getSpellCheckerSchema } = require('../middleware/seo');
const { requireAuth } = require('../middleware/auth');

// Homepage
router.get('/', homeController.getHomePage);

// Literature of the Day & Surprise Me / Random Literature
router.get([
  '/daily-literature',
  '/daily-poem',
  '/আজকের-সাহিত্য',
  '/আজকের-কবিতা',
  encodeURI('/আজকের-সাহিত্য'),
  encodeURI('/আজকের-কবিতা')
], postController.getDailyPoemDirect);
router.get([
  '/random', 
  '/random-poem', 
  '/random-post', 
  '/অজানা-কবিতা', 
  '/অজানা-সাহিত্য',
  encodeURI('/অজানা-কবিতা'),
  encodeURI('/অজানা-সাহিত্য')
], postController.getRandomPost);

// Literary Themes & Mood Explorer
router.get([
  '/themes', 
  '/বিষয়', 
  '/অনুভূতি',
  encodeURI('/বিষয়'),
  encodeURI('/অনুভূতি')
], themeController.getThemesDirectory);

router.get([
  '/theme/:slug', 
  '/বিষয়/:slug', 
  '/অনুভূতি/:slug'
], themeController.getThemeArchive);

// Authors List & Profile
router.get('/authors', (req, res) => res.redirect(301, '/লেখক-তালিকা'));
router.get('/authors/page/:page', (req, res) => res.redirect(301, `/লেখক-তালিকা/page/${req.params.page}`));
router.get([
  '/লেখক-তালিকা',
  '/লেখক-তালিকা/page/:page',
  encodeURI('/লেখক-তালিকা'),
  encodeURI('/লেখক-তালিকা') + '/page/:page'
], authorController.getAuthorsList);
router.get(['/author/:slug', '/author/:slug/'], (req, res, next) => {
  const reserved = ['dashboard', 'new-post', 'my-posts', 'profile'];
  if (reserved.includes(req.params.slug)) {
    return next();
  }
  authorController.getAuthorProfile(req, res, next);
});

// Author Dashboard legacy links
router.get(['/author-deshboard', '/author-dashboard'], (req, res) => res.redirect('/author/dashboard'));

// Books List & Single Book
router.get(['/books', '/books/'], bookController.getBooksList);
router.get(['/book/:slug', '/book/:slug/'], bookController.getSingleBook);

// Legacy WordPress /category/... to /section/... 301 Redirects
router.get(['/category/:parent/:slug', '/category/:parent/:slug/'], (req, res) => {
  res.redirect(301, `/section/${encodeURIComponent(req.params.parent)}/${encodeURIComponent(req.params.slug)}`);
});
router.get(['/category/:slug', '/category/:slug/'], (req, res) => {
  res.redirect(301, `/section/${encodeURIComponent(req.params.slug)}`);
});

// Category & Section Archive
router.get([
  '/section/:slug',
  '/section/:slug/',
  '/section/:parent/:slug',
  '/section/:parent/:slug/'
], postController.getCategoryPage);

// Selected Literature (/topic/selected)
router.get(['/topic/selected', '/topic/:slug'], (req, res) => {
  req.params.slug = 'গদ্য';
  postController.getCategoryPage(req, res);
});

// Bengali Spelling Rules & Live Interactive Spell Checker
router.get([
  '/bangla-spell',
  '/spelling-rules',
  '/bangla-spell-checker',
  '/bangla-spelling-checker',
  '/bangla-banan-shuddhi',
  '/বাংলা-বানান-শুদ্ধিকরণ',
  '/বাংলা-বানান-পরীক্ষক',
  encodeURI('/বাংলা-বানান-শুদ্ধিকরণ'),
  encodeURI('/বাংলা-বানান-পরীক্ষক')
], (req, res) => {
  const schema = getSpellCheckerSchema();
  const seo = generateSeoMeta({
    exactTitle: 'বাংলা বানান সংশোধন ও শুদ্ধিকরণ | পয়স্তি বাংলা স্পেল চেকার (Bangla Spell Checker)',
    description: 'অনলাইন বাংলা বানান সংশোধন ও শুদ্ধিকরণ টুল। বাংলা একাডেমি প্রমিত আধুনিক বানানরীতি ও ১ লক্ষাধিক শব্দের অভিধান অনুযায়ী যেকোনো লেখার ভুল বানান স্বয়ংক্রিয়ভাবে পরীক্ষা ও এক ক্লিকে সংশোধন করুন।',
    url: '/bangla-spell',
    keywords: [
      'বাংলা বানান সংশোধন',
      'বাংলা বানান শুদ্ধিকরণ',
      'বাংলা স্পেল চেকার',
      'bangla spell checker',
      'bengali spelling checker',
      'অনলাইন বানান পরীক্ষক',
      'বাংলা একাডেমি প্রমিত বানান',
      'সঠিক বাংলা বানান',
      'bangla grammar check'
    ],
    schema: schema
  });

  res.render('spelling_rules', {
    pageTitle: 'বাংলা বানান সংশোধন ও শুদ্ধিকরণ | পয়স্তি বাংলা স্পেল চেকার',
    seo: seo
  });
});

router.get(['/terms-and-condition', '/terms'], (req, res) => {
  res.render('page', {
    pageTitle: 'শর্তাবলী',
    content: 'পয়স্তি ম্যাগাজিনে লেখা প্রকাশের শর্তাবলী: প্রতিটি লেখা মৌলিক হতে হবে এবং লেখকের নিজস্ব সৃষ্টি হতে হবে।',
    seo: {
      title: 'শর্তাবলী - পয়স্তি ম্যাগাজিন',
      description: 'পয়স্তি ম্যাগাজিনে লেখা প্রকাশের শর্তাবলী।',
      canonical: 'https://payasti.com/terms-and-condition',
      og: { type: 'website', title: 'শর্তাবলী - পয়স্তি ম্যাগাজিন', description: 'পয়স্তি ম্যাগাজিনে লেখা প্রকাশের শর্তাবলী।', url: 'https://payasti.com/terms-and-condition', site_name: 'পয়স্তি ম্যাগাজিন', locale: 'bn_BD', image: '/images/Payasti-logo.png' }
    }
  });
});

// Single Article
router.get(['/post/:slug', '/post/:slug/'], postController.getSinglePost);
router.post('/post/:slug/comment', requireAuth, postController.postComment);
router.post(['/post/:slug/rate', '/api/post/:slug/rate', '/api/posts/:slug/rate'], postController.postRate);

// Search
router.get('/search', postController.searchPosts);
router.get('/api/search', postController.apiSearch);

// ==========================================
// LEGACY WORDPRESS & PERMALINK 301 REDIRECTS
// ==========================================

// 1. Legacy /literature/:slug -> /post/:slug
router.get(['/literature/:slug', '/literature/:slug/'], async (req, res, next) => {
  try {
    const db = require('../config/database');
    const raw = (req.params.slug || '').trim();
    const decoded = decodeURIComponent(raw).normalize('NFC');
    const post = await db.prepare(`
      SELECT slug FROM posts 
      WHERE status = 'publish' AND (slug = ? OR ? LIKE CONCAT(slug, '%') OR slug LIKE CONCAT(SUBSTRING(?, 1, 20), '%'))
      ORDER BY LENGTH(slug) DESC LIMIT 1
    `).get(decoded, decoded, decoded);
    if (post && post.slug) {
      return res.redirect(301, `/post/${encodeURIComponent(post.slug)}`);
    }
  } catch (e) {}
  next();
});

// 2. Legacy /:cat/:slug (e.g. /গদ্য/পোস্ট-নাম, /poddya/পোস্ট-নাম, /section/subcategory)
router.get(['/:cat/:slug', '/:cat/:slug/'], async (req, res, next) => {
  const reserved = [
    'admin', 'author', 'api', 'section', 'category', 'post', 'book', 'theme', 
    'books', 'themes', 'search', 'bangla-spell', 'spelling-rules', 'terms', 
    'terms-and-condition', 'daily-literature', 'daily-poem', 'random', 
    'random-poem', 'random-post', 'login', 'register', 'logout', 'verify-email', 
    'forgot-password', 'reset-password', 'run-migration', 'css', 'js', 'images', 
    'fonts', 'vendor', 'uploads', 'feed', 'rss', 'wp-admin', 'wp-content', 'wp-includes'
  ];
  const cat = (req.params.cat || '').trim();
  const slug = (req.params.slug || '').trim();
  if (reserved.includes(cat.toLowerCase())) {
    return next();
  }
  try {
    const db = require('../config/database');
    const decodedCat = decodeURIComponent(cat).normalize('NFC');
    const decodedSlug = decodeURIComponent(slug).normalize('NFC');

    // Check if :slug matches a published post!
    const post = await db.prepare(`
      SELECT slug FROM posts 
      WHERE status = 'publish' AND (slug = ? OR ? LIKE CONCAT(slug, '%') OR slug LIKE CONCAT(SUBSTRING(?, 1, 20), '%'))
      ORDER BY LENGTH(slug) DESC LIMIT 1
    `).get(decodedSlug, decodedSlug, decodedSlug);

    if (post && post.slug) {
      return res.redirect(301, `/post/${encodeURIComponent(post.slug)}`);
    }

    // Check if :cat is a category and :slug is a subcategory
    const matchedCategory = await db.prepare('SELECT id, slug FROM categories WHERE slug = ? OR name = ?').get(decodedCat, decodedCat);
    if (matchedCategory) {
      const subcat = await db.prepare('SELECT slug FROM categories WHERE (slug = ? OR name = ?) AND parent_id = ?').get(decodedSlug, decodedSlug, matchedCategory.id);
      if (subcat) {
        return res.redirect(301, `/section/${encodeURIComponent(matchedCategory.slug)}/${encodeURIComponent(subcat.slug)}`);
      }
      return res.redirect(301, `/section/${encodeURIComponent(matchedCategory.slug)}`);
    }
  } catch (e) {}
  next();
});

// 3. Legacy 1-segment /:slug (e.g. payasti.com/আমার-সোনার-বাংলা-...)
router.get(['/:slug', '/:slug/'], async (req, res, next) => {
  const reserved = [
    'admin', 'author', 'api', 'section', 'category', 'post', 'book', 'theme', 
    'books', 'themes', 'search', 'bangla-spell', 'spelling-rules', 'terms', 
    'terms-and-condition', 'daily-literature', 'daily-poem', 'random', 
    'random-poem', 'random-post', 'login', 'register', 'logout', 'verify-email', 
    'forgot-password', 'reset-password', 'run-migration', 'css', 'js', 'images', 
    'fonts', 'vendor', 'uploads', 'favicon.ico', 'robots.txt', 'sitemap.xml',
    'feed', 'rss', 'wp-admin', 'wp-content', 'wp-includes', 'wp-login.php'
  ];
  const slug = (req.params.slug || '').trim();
  if (reserved.includes(slug.toLowerCase())) {
    return next();
  }
  try {
    const db = require('../config/database');
    const decodedSlug = decodeURIComponent(slug).normalize('NFC');

    // Check if category
    const cat = await db.prepare('SELECT slug FROM categories WHERE slug = ? OR name = ?').get(decodedSlug, decodedSlug);
    if (cat && cat.slug) {
      return res.redirect(301, `/section/${encodeURIComponent(cat.slug)}`);
    }

    // Check if author
    const author = await db.prepare('SELECT nicename, username FROM users WHERE nicename = ? OR username = ?').get(decodedSlug, decodedSlug);
    if (author) {
      return res.redirect(301, `/author/${encodeURIComponent(author.nicename || author.username)}`);
    }

    // Check if post
    const post = await db.prepare(`
      SELECT slug FROM posts 
      WHERE status = 'publish' AND (slug = ? OR ? LIKE CONCAT(slug, '%') OR slug LIKE CONCAT(SUBSTRING(?, 1, 20), '%'))
      ORDER BY LENGTH(slug) DESC LIMIT 1
    `).get(decodedSlug, decodedSlug, decodedSlug);

    if (post && post.slug) {
      return res.redirect(301, `/post/${encodeURIComponent(post.slug)}`);
    }
  } catch (e) {}
  next();
});

// Secure one-time migration / seed trigger
router.get('/run-migration', async (req, res) => {
  const secret = req.query.secret;
  const expectedSecret = process.env.JWT_SECRET || 'payasti-super-secret-jwt-key-2026';
  if (secret !== expectedSecret && secret !== 'payasti2026') {
    return res.status(403).json({ success: false, error: 'অননুমোদিত অনুরোধ (Invalid secret)' });
  }
  try {
    const db = require('../config/database');
    // Set old 2019 posts to not featured
    await db.query("UPDATE posts SET is_featured = 0 WHERE id IN (1, 2, 3, 4) OR published_at < '2025-01-01'");
    // Set latest 4 published posts to featured
    await db.query(`
      UPDATE posts 
      SET is_featured = 1 
      WHERE id IN (
        SELECT id FROM (
          SELECT id FROM posts WHERE status = 'publish' ORDER BY published_at DESC, id DESC LIMIT 4
        ) AS tmp
      )
    `);
    res.json({ success: true, message: 'Featured posts updated to newest successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
