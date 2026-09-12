const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const postController = require('../controllers/postController');
const authorController = require('../controllers/authorController');
const bookController = require('../controllers/bookController');

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

// Bengali Spelling Rules & Terms
router.get(['/bangla-spell', '/spelling-rules'], (req, res) => {
  res.render('page', {
    pageTitle: 'বানান শুদ্ধিকরণ',
    content: 'পয়স্তি ম্যাগাজিনের বাংলা বানান সংক্রান্ত নিয়মাবলী শীঘ্রই সংযুক্ত হবে।',
    seo: {
      title: 'বানান শুদ্ধিকরণ - পয়স্তি ম্যাগাজিন',
      description: 'বাংলা বানান শুদ্ধিকরণ নিয়মাবলী ও নির্দেশনা।',
      canonical: 'https://payasti.com/bangla-spell',
      og: { type: 'website', title: 'বানান শুদ্ধিকরণ - পয়স্তি ম্যাগাজিন', description: 'বাংলা বানান শুদ্ধিকরণ নিয়মাবলী ও নির্দেশনা।', url: 'https://payasti.com/bangla-spell', site_name: 'পয়স্তি ম্যাগাজিন', locale: 'bn_BD', image: '/images/Payasti-logo.png' }
    }
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

module.exports = router;
