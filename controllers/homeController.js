const db = require('../config/database');
const { generateSeoMeta, getWebsiteSchema } = require('../middleware/seo');
const { toBengaliNumber, formatBengaliDate, formatCardExcerpt } = require('../middleware/banglaDate');
const { SITE_NAME, TAGLINE, NAV_MENU, EDITORIAL_BOARD, CONTACT } = require('../config/constants');

const postController = require('./postController');

exports.getHomePage = async (req, res) => {
  try {
    // WordPress search query ?s= compatibility
    if (req.query.s) {
      req.query.q = req.query.s;
      return postController.searchPosts(req, res);
    }

    // 1. Fetch Books
    const books = await db.prepare('SELECT id, title, slug, author_name, cover_image, regular_price, discounted_price, order_url FROM books ORDER BY id DESC LIMIT 30').all();

    // 2. Fetch Featured Posts (4 posts for the 4-column grid, newest first)
    const cardFields = `
      p.id, p.title, p.slug, p.excerpt, p.content, p.published_at, p.views, p.category_id, p.subcategory_id,
      u.display_name AS author_name, u.nicename AS author_slug, u.avatar AS author_avatar,
      c.name AS category_name, c.slug AS category_slug
    `;

    let featuredPosts = await db.prepare(`
      SELECT ${cardFields}
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'publish' AND p.is_featured = 1
      ORDER BY p.published_at DESC, p.id DESC
      LIMIT 4
    `).all();

    // If no posts are marked as featured, fallback to latest published posts
    if (featuredPosts.length === 0) {
      featuredPosts = await db.prepare(`
        SELECT ${cardFields}
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'publish'
        ORDER BY p.published_at DESC, p.id DESC
        LIMIT 4
      `).all();
    }

    // 3. Fetch Latest 20 Posts (Newest first, without pagination)
    const latestPosts = await db.prepare(`
      SELECT ${cardFields}
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'publish'
      ORDER BY p.published_at DESC, p.id DESC
      LIMIT 20
    `).all();

    // SEO & Schema
    const seo = generateSeoMeta({
      title: `${SITE_NAME} - ${TAGLINE} | বাংলা সাহিত্য পত্রিকা ও বই সম্ভার`,
      description: 'পয়স্তি বাংলা তরুণ সাহিত্যিকদের লেখা প্রকাশে গুরুত্ব দিয়ে থাকে। কবিতা, গল্প, উপন্যাস, প্রবন্ধ, সাক্ষাৎকার ও বই প্রকাশনার বিশ্বস্ত প্ল্যাটফর্ম।',
      url: '/',
      schema: getWebsiteSchema()
    });

    res.render('home', {
      books,
      featuredPosts,
      latestPosts,
      seo,
      toBengaliNumber,
      formatBengaliDate,
      formatCardExcerpt,
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  } catch (err) {
    console.error('Error in getHomePage:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি (৫০০)',
      message: 'হোমপেজ লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};
