const crypto = require('crypto');
const db = require('../config/database');
const { generateSeoMeta, getBreadcrumbSchema } = require('../middleware/seo');
const { toBengaliNumber, formatBengaliDate } = require('../middleware/banglaDate');
const { SITE_NAME, TAGLINE, NAV_MENU, EDITORIAL_BOARD, CONTACT } = require('../config/constants');

// Authors Directory Page (/authors, /লেখক-তালিকা)
exports.getAuthorsList = async (req, res) => {
  try {
    const searchQuery = (req.query.author_search || req.query.q || '').trim();
    const page = parseInt(req.params.page || req.query.page || req.query.paged, 10) || 1;
    const limit = 18; // 3x6 grid matching WordPress $authors_per_page = 18
    const offset = (page - 1) * limit;

    let countSql = "SELECT COUNT(*) AS total FROM users WHERE role IN ('author', 'editor', 'admin')";
    let usersSql = "SELECT * FROM users WHERE role IN ('author', 'editor', 'admin')";
    const countParams = [];
    const usersParams = [];

    if (searchQuery) {
      countSql += " AND (display_name LIKE ? OR username LIKE ? OR nicename LIKE ?)";
      countParams.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
      usersSql += " AND (display_name LIKE ? OR username LIKE ? OR nicename LIKE ?)";
      usersParams.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
    }

    // Get total authors count overall
    const totalAuthorsOverallRow = await db.prepare("SELECT COUNT(*) AS total FROM users WHERE role IN ('author', 'editor', 'admin')").get();
    const totalAuthorsOverall = totalAuthorsOverallRow ? totalAuthorsOverallRow.total : 93;

    const totalFilteredRow = await db.prepare(countSql).get(...countParams);
    const totalFiltered = totalFilteredRow ? totalFilteredRow.total : 0;
    const totalPages = Math.ceil(totalFiltered / limit);

    // WordPress sorts authors alphabetically by display_name
    usersSql += " ORDER BY display_name ASC LIMIT ? OFFSET ?";
    usersParams.push(limit, offset);

    const authors = await db.prepare(usersSql).all(...usersParams);

    // For each author, resolve avatar and fetch their top 3 published writings
    for (const author of authors) {
      if (!author.avatar) {
        const emailClean = (author.email || '').trim().toLowerCase();
        const emailSha256 = crypto.createHash('sha256').update(emailClean).digest('hex');
        author.avatar = `https://secure.gravatar.com/avatar/${emailSha256}?s=100&d=mm&r=g`;
      }
      author.recentPosts = await db.prepare(`
        SELECT title, slug FROM posts
        WHERE author_id = ? AND status = 'publish'
        ORDER BY published_at DESC LIMIT 3
      `).all(author.id);
    }

    // Base URL calculation for pagination
    const currentPath = req.baseUrl + req.path;
    const basePathWithoutPage = currentPath.replace(/\/page\/\d+\/?$/, '').replace(/\/$/, '') || '/লেখক-তালিকা';

    const pageUrl = (pageNum) => {
      if (searchQuery) {
        return `${basePathWithoutPage}/?author_search=${encodeURIComponent(searchQuery)}&page=${pageNum}`;
      }
      return pageNum === 1 ? `${basePathWithoutPage}/` : `${basePathWithoutPage}/page/${pageNum}/`;
    };

    const breadcrumbs = [
      { name: 'প্রচ্ছদ', url: '/' },
      { name: 'লেখক তালিকা', url: '/লেখক-তালিকা/' }
    ];

    const seo = generateSeoMeta({
      exactTitle: 'লেখক তালিকা | পয়স্তি ম্যাগাজিন',
      description: 'লেখক তালিকা',
      image: 'https://payasti.com/content/uploads/2019/09/Payasti-Magazine.png',
      url: '/%e0%a6%b2%e0%a7%87%e0%a6%96%e0%a6%95-%e0%a6%a4%e0%a6%be%e0%a6%b2%e0%a6%bf%e0%a6%95%e0%a6%be/',
      schema: getBreadcrumbSchema(breadcrumbs)
    });

    res.render('authors_list', {
      authors,
      searchQuery,
      totalAuthorsOverall,
      basePathWithoutPage,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalFiltered,
        pageUrl: pageUrl
      },
      seo,
      toBengaliNumber,
      formatBengaliDate,
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  } catch (err) {
    console.error('Error in getAuthorsList:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি',
      message: 'লেখক তালিকা লোড করা যায়নি।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};

// Single Author Profile Page (/author/:slug)
exports.getAuthorProfile = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const author = await db.prepare('SELECT * FROM users WHERE nicename = ? OR username = ?').get(slug, slug);

    if (!author) {
      return res.status(404).render('error', {
        title: 'লেখক পাওয়া যায়নি',
        message: 'আপনি যে লেখকের প্রোফাইল খুঁজছেন তা খুঁজে পাওয়া যায়নি।',
        seo: generateSeoMeta({ title: 'লেখক পাওয়া যায়নি' }),
        navMenu: NAV_MENU,
        editorialBoard: EDITORIAL_BOARD,
        contact: CONTACT
      });
    }

    if (!author.avatar) {
      const emailHash = crypto.createHash('md5').update((author.email || '').trim().toLowerCase()).digest('hex');
      author.avatar = `https://secure.gravatar.com/avatar/${emailHash}?s=100&d=mp`;
    }

    // Count author's posts
    const totalPostsRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'publish'").get(author.id);
    const totalPosts = totalPostsRow ? totalPostsRow.total : 0;
    const totalPages = Math.ceil(totalPosts / limit);

    // Fetch author's posts
    const posts = await db.prepare(`
      SELECT p.id, p.title, p.slug, p.excerpt, p.content, p.published_at, p.views, p.category_id, p.subcategory_id,
             c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.author_id = ? AND p.status = 'publish'
      ORDER BY p.published_at DESC
      LIMIT ? OFFSET ?
    `).all(author.id, limit, offset);

    const breadcrumbs = [
      { name: 'প্রচ্ছদ', url: '/' },
      { name: 'যারা লিখেছেন', url: '/authors' },
      { name: author.display_name, url: `/author/${author.nicename || author.username}` }
    ];

    const seo = generateSeoMeta({
      title: `${author.display_name} - লেখকের প্রোফাইল ও রচনাসমগ্র`,
      description: author.bio || `${author.display_name} এর পয়স্তি ম্যাগাজিনে প্রকাশিত সকল কবিতা, গল্প, প্রবন্ধ ও সাহিত্য সৃষ্টি।`,
      image: author.avatar,
      url: `/author/${author.nicename || author.username}`,
      schema: getBreadcrumbSchema(breadcrumbs)
    });

    res.render('author_profile', {
      author,
      posts,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalPosts,
        basePath: `/author/${author.nicename || author.username}`
      },
      seo,
      toBengaliNumber,
      formatBengaliDate,
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  } catch (err) {
    console.error('Error in getAuthorProfile:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি',
      message: 'লেখকের প্রোফাইল লোড করা যায়নি।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};
