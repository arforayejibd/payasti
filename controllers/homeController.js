const db = require('../config/database');
const { generateSeoMeta, getWebsiteSchema } = require('../middleware/seo');
const { toBengaliNumber, formatBengaliDate } = require('../middleware/banglaDate');
const { SITE_NAME, TAGLINE, NAV_MENU, EDITORIAL_BOARD, CONTACT } = require('../config/constants');

const postController = require('./postController');

exports.getHomePage = (req, res) => {
  // WordPress search query ?s= compatibility
  if (req.query.s) {
    req.query.q = req.query.s;
    return postController.searchPosts(req, res);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  // 1. Fetch Books
  const books = db.prepare('SELECT * FROM books ORDER BY id DESC LIMIT 30').all();

  // 2. Fetch Featured Posts (4 posts for the 4-column grid)
  let featuredPosts = db.prepare(`
    SELECT p.*, u.display_name AS author_name, u.nicename AS author_slug, u.avatar AS author_avatar,
           c.name AS category_name, c.slug AS category_slug
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'publish' AND p.is_featured = 1
    ORDER BY p.published_at DESC
    LIMIT 4
  `).all();

  // If absolutely no posts are marked as featured, fallback to latest published posts
  if (featuredPosts.length === 0) {
    featuredPosts = db.prepare(`
      SELECT p.*, u.display_name AS author_name, u.nicename AS author_slug, u.avatar AS author_avatar,
             c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'publish'
      ORDER BY p.published_at DESC
      LIMIT 4
    `).all();
  }

  // 3. Fetch Latest Posts with Pagination
  const totalPostsRow = db.prepare("SELECT COUNT(*) AS total FROM posts WHERE status = 'publish'").get();
  const totalPosts = totalPostsRow ? totalPostsRow.total : 0;
  const totalPages = Math.ceil(totalPosts / limit);

  const latestPosts = db.prepare(`
    SELECT p.*, u.display_name AS author_name, u.nicename AS author_slug, u.avatar AS author_avatar,
           c.name AS category_name, c.slug AS category_slug
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'publish'
    ORDER BY p.published_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  // SEO & Schema
  const seo = generateSeoMeta({
    title: `${SITE_NAME} - ${TAGLINE} | বাংলা সাহিত্য পত্রিকা ও বই সম্ভার`,
    description: 'পয়স্তি বাংলা তরুণ সাহিত্যিকদের লেখা প্রকাশে গুরুত্ব দিয়ে থাকে। কবিতা, গল্প, উপন্যাস, প্রবন্ধ, সাক্ষাৎকার ও বই প্রকাশনার বিশ্বস্ত প্ল্যাটফর্ম।',
    url: page > 1 ? `/?page=${page}` : '/',
    schema: getWebsiteSchema()
  });

  res.render('home', {
    books,
    featuredPosts,
    latestPosts,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalPosts,
      basePath: '/'
    },
    seo,
    toBengaliNumber,
    formatBengaliDate,
    navMenu: NAV_MENU,
    editorialBoard: EDITORIAL_BOARD,
    contact: CONTACT
  });
};
