const slugify = require('slugify');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateSeoMeta } = require('../middleware/seo');
const { toBengaliNumber, formatBengaliDate, formatDuration } = require('../middleware/banglaDate');
const { SITE_NAME, TAGLINE, NAV_MENU, EDITORIAL_BOARD, CONTACT } = require('../config/constants');

// Author Dashboard Overview (/author/dashboard)
exports.getDashboard = (req, res) => {
  const userId = req.user.id;

  // 1. Author Stats
  const approvedCountRow = db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'publish'").get(userId);
  const pendingCountRow = db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'pending'").get(userId);
  const draftCountRow = db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'draft'").get(userId);

  const approvedCount = approvedCountRow ? approvedCountRow.total : 0;
  const pendingCount = pendingCountRow ? pendingCountRow.total : 0;
  const draftCount = draftCountRow ? draftCountRow.total : 0;

  // Duration
  const registeredDuration = formatDuration(req.user.registered_at);

  // 2. Author Readership Analytics
  const totalViewsRow = db.prepare("SELECT COALESCE(SUM(views), 0) AS total FROM posts WHERE author_id = ? AND status = 'publish'").get(userId);
  const totalViews = totalViewsRow ? totalViewsRow.total : 0;

  const topPosts = db.prepare("SELECT title, slug, views, published_at FROM posts WHERE author_id = ? AND status = 'publish' ORDER BY views DESC LIMIT 3").all(userId);

  // 3. Latest post for editorial status tracking
  const latestPost = db.prepare("SELECT id, title, slug, status, created_at, published_at FROM posts WHERE author_id = ? ORDER BY id DESC LIMIT 1").get(userId);

  // 4. Notices & Ads
  const notices = db.prepare("SELECT * FROM notices WHERE type = 'notice' AND is_active = 1 ORDER BY id DESC LIMIT 1").all();
  const ads = db.prepare("SELECT * FROM notices WHERE type = 'ad' AND is_active = 1 ORDER BY id DESC LIMIT 1").all();

  // 5. Books Showcase (all books for carousel)
  const books = db.prepare('SELECT * FROM books ORDER BY id DESC LIMIT 24').all();

  const seo = generateSeoMeta({
    title: 'লেখক প্যানেল - ড্যাশবোর্ড'
  });

  res.render('author/dashboard', {
    user: req.user,
    stats: {
      duration: registeredDuration,
      approved: approvedCount,
      pending: pendingCount,
      draft: draftCount,
      totalViews: totalViews
    },
    topPosts,
    latestPost,
    notices,
    ads,
    books,
    activeMenu: 'dashboard',
    seo,
    toBengaliNumber,
    formatBengaliDate,
    navMenu: NAV_MENU,
    editorialBoard: EDITORIAL_BOARD,
    contact: CONTACT
  });
};

// New Post Form GET
exports.getNewPostPage = (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();

  const seo = generateSeoMeta({
    title: 'নতুন লেখা জমা দিন - লেখক প্যানেল'
  });

  res.render('author/new_post', {
    user: req.user,
    categories,
    error: null,
    success: null,
    activeMenu: 'new_post',
    seo,
    toBengaliNumber,
    formatBengaliDate,
    navMenu: NAV_MENU,
    editorialBoard: EDITORIAL_BOARD,
    contact: CONTACT
  });
};

// New Post Form POST
exports.postNewPost = (req, res) => {
  const { title, category_id, subcategory, content, excerpt, tags } = req.body;
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();

  if (!title || !category_id || !content) {
    return res.render('author/new_post', {
      user: req.user,
      categories,
      error: 'অনুগ্রহ করে লেখার শিরোনাম, বিভাগ এবং মূল লেখাটি পূরণ করুন।',
      success: null,
      activeMenu: 'new_post',
      seo: generateSeoMeta({ title: 'নতুন লেখা জমা দিন' }),
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }

  // Handle uploaded or selected featured image
  let featuredImage = req.body.featured_image || '';
  if (req.file) {
    featuredImage = `/uploads/${req.file.filename}`;
  }

  // Generate unique slug
  let slug = slugify(title, { lower: true, strict: false, remove: /[*+~.()'"!:@]/g }) || `post-${Date.now()}`;
  // Check collision
  const existingSlug = db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug);
  if (existingSlug) {
    slug = `${slug}-${Date.now()}`;
  }

  // Auto-generate clean excerpt if blank
  let cleanExcerpt = (excerpt || '').trim();
  if (!cleanExcerpt) {
    cleanExcerpt = content.replace(/<[^>]+>/g, '').trim().substring(0, 160) + '...';
  }

  // Insert post as 'pending' for admin review
  const info = db.prepare(`
    INSERT INTO posts (author_id, title, slug, content, excerpt, featured_image, category_id, status, views, is_featured, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, datetime('now'))
  `).run(
    req.user.id,
    title.trim(),
    slug,
    content,
    cleanExcerpt,
    featuredImage,
    parseInt(category_id)
  );

  const postId = info.lastInsertRowid;

  // Process Tags
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)');
    const getTag = db.prepare('SELECT id FROM tags WHERE name = ?');
    const linkTag = db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');

    tagList.forEach(tagName => {
      const tagSlug = slugify(tagName, { lower: true, strict: false }) || `tag-${Date.now()}`;
      insertTag.run(tagName, tagSlug);
      const tagRecord = getTag.get(tagName);
      if (tagRecord) {
        linkTag.run(postId, tagRecord.id);
      }
    });
  }

  res.render('author/new_post', {
    user: req.user,
    categories,
    error: null,
    success: 'আপনার লেখাটি সফলভাবে জমা হয়েছে! এডমিন এটি পর্যালোচনা করে অনুমোদন দেওয়ার পর সাইটে প্রকাশিত হবে।',
    activeMenu: 'new_post',
    seo: generateSeoMeta({ title: 'নতুন লেখা জমা দিন' }),
    toBengaliNumber,
    formatBengaliDate,
    navMenu: NAV_MENU,
    editorialBoard: EDITORIAL_BOARD,
    contact: CONTACT
  });
};

// All My Posts Page (/author/my-posts)
exports.getMyPosts = (req, res) => {
  try {
    const statusFilter = req.query.status || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    let countSql = "SELECT COUNT(*) AS total FROM posts p WHERE p.author_id = ?";
    let postsSql = `
      SELECT p.*, c.name AS category_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.author_id = ?
    `;
    const countParams = [req.user.id];
    const postsParams = [req.user.id];

    if (statusFilter !== 'all') {
      countSql += " AND p.status = ?";
      countParams.push(statusFilter);
      postsSql += " AND p.status = ?";
      postsParams.push(statusFilter);
    }

    const totalRow = db.prepare(countSql).get(...countParams);
    const totalPosts = totalRow ? totalRow.total : 0;
    const totalPages = Math.ceil(totalPosts / limit) || 1;

    postsSql += " ORDER BY p.id DESC LIMIT ? OFFSET ?";
    postsParams.push(limit, offset);

    const posts = db.prepare(postsSql).all(...postsParams);

    // Stats for tabs
    const allCountRow = db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ?").get(req.user.id);
    const pubCountRow = db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'publish'").get(req.user.id);
    const pendCountRow = db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'pending'").get(req.user.id);
    const draftCountRow = db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'draft'").get(req.user.id);

    const allCount = allCountRow ? allCountRow.total : 0;
    const pubCount = pubCountRow ? pubCountRow.total : 0;
    const pendCount = pendCountRow ? pendCountRow.total : 0;
    const draftCount = draftCountRow ? draftCountRow.total : 0;

    const seo = generateSeoMeta({
      title: 'আপনার সব পোস্ট - লেখক প্যানেল'
    });

    res.render('author/my_posts', {
      user: req.user,
      posts,
      statusFilter,
      counts: {
        all: allCount,
        publish: pubCount,
        pending: pendCount,
        draft: draftCount
      },
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalPosts,
        basePath: `/author/my-posts${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`
      },
      activeMenu: 'my_posts',
      seo,
      toBengaliNumber,
      formatBengaliDate,
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  } catch (err) {
    console.error('Error in getMyPosts:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি (৫০০)',
      message: 'দুঃখিত, কোনো একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};

// Profile Page GET (/author/profile)
exports.getProfilePage = (req, res) => {
  const seo = generateSeoMeta({
    title: 'প্রোফাইল সম্পাদন - লেখক প্যানেল'
  });

  res.render('author/profile', {
    user: req.user,
    error: null,
    success: null,
    activeMenu: 'profile',
    seo,
    toBengaliNumber,
    formatBengaliDate,
    navMenu: NAV_MENU,
    editorialBoard: EDITORIAL_BOARD,
    contact: CONTACT
  });
};

// Profile Page POST
exports.postProfile = (req, res) => {
  const { display_name, email, bio, password } = req.body;

  let avatar = req.body.avatar !== undefined ? req.body.avatar : req.user.avatar;
  if (req.file) {
    avatar = `/uploads/${req.file.filename}`;
  }

  if (password && password.trim().length > 0) {
    const hashedPassword = bcrypt.hashSync(password.trim(), 10);
    db.prepare(`
      UPDATE users SET display_name = ?, email = ?, bio = ?, avatar = ?, password = ? WHERE id = ?
    `).run(display_name.trim(), email.trim(), (bio || '').trim(), avatar, hashedPassword, req.user.id);
  } else {
    db.prepare(`
      UPDATE users SET display_name = ?, email = ?, bio = ?, avatar = ? WHERE id = ?
    `).run(display_name.trim(), email.trim(), (bio || '').trim(), avatar, req.user.id);
  }

  // Refresh user object
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  res.render('author/profile', {
    user: updatedUser,
    error: null,
    success: 'আপনার প্রোফাইল সফলভাবে আপডেট করা হয়েছে!',
    activeMenu: 'profile',
    seo: generateSeoMeta({ title: 'প্রোফাইল সম্পাদন' }),
    toBengaliNumber,
    formatBengaliDate,
    navMenu: NAV_MENU,
    editorialBoard: EDITORIAL_BOARD,
    contact: CONTACT
  });
};
