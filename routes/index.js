const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const postController = require('../controllers/postController');
const authorController = require('../controllers/authorController');
const bookController = require('../controllers/bookController');
const { generateSeoMeta, getSpellCheckerSchema } = require('../middleware/seo');

// Homepage
router.get('/', homeController.getHomePage);

// Authors List & Profile
router.get([
  '/authors',
  '/authors/page/:page',
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
router.get('/books', bookController.getBooksList);
router.get('/book/:slug', bookController.getSingleBook);

// Category Archive (Supports both /category/... and WordPress /section/...)
router.get([
  '/category/:slug',
  '/section/:slug',
  '/category/:parent/:slug',
  '/section/:parent/:slug'
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
router.get('/post/:slug', postController.getSinglePost);
router.post('/post/:slug/comment', postController.postComment);

// Search
router.get('/search', postController.searchPosts);
router.get('/api/search', postController.apiSearch);

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
