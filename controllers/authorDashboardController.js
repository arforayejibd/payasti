const crypto = require('crypto');
const slugify = require('slugify');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateSeoMeta } = require('../middleware/seo');
const { toBengaliNumber, formatBengaliDate, formatDuration, generateCleanExcerpt } = require('../middleware/banglaDate');
const { SITE_NAME, TAGLINE, NAV_MENU, EDITORIAL_BOARD, CONTACT } = require('../config/constants');

// Author Dashboard Overview (/author/dashboard)
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Resolve Author Avatar
    let userAvatar = req.user.avatar;
    if (!userAvatar) {
      const emailHash = crypto.createHash('md5').update((req.user.email || '').trim().toLowerCase()).digest('hex');
      userAvatar = `https://secure.gravatar.com/avatar/${emailHash}?s=120&d=mp`;
    }
    const publicProfileUrl = '/author/' + encodeURIComponent(req.user.nicename || req.user.username);

    // Dynamic Time-based Greeting
    const currentHour = new Date().getHours();
    let greeting = 'স্বাগতম';
    if (currentHour >= 5 && currentHour < 12) {
      greeting = 'শুভ সকাল';
    } else if (currentHour >= 12 && currentHour < 17) {
      greeting = 'শুভ অপরাহ্ন';
    } else if (currentHour >= 17 && currentHour < 21) {
      greeting = 'শুভ সন্ধ্যা';
    } else {
      greeting = 'শুভ রাত্রি';
    }

    // 1. Author Stats
    const approvedCountRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'publish'").get(userId);
    const pendingCountRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'pending'").get(userId);
    const draftCountRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'draft'").get(userId);

    const approvedCount = approvedCountRow ? approvedCountRow.total : 0;
    const pendingCount = pendingCountRow ? pendingCountRow.total : 0;
    const draftCount = draftCountRow ? draftCountRow.total : 0;

    // Duration
    const registeredDuration = formatDuration(req.user.registered_at);

    // 2. Author Readership Analytics
    const totalViewsRow = await db.prepare("SELECT COALESCE(SUM(views), 0) AS total FROM posts WHERE author_id = ? AND status = 'publish'").get(userId);
    const totalViews = totalViewsRow ? totalViewsRow.total : 0;

    // Top 5 posts with category information
    const topPosts = await db.prepare(`
      SELECT p.id, p.title, p.slug, p.views, p.published_at, c.name AS category_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.author_id = ? AND p.status = 'publish'
      ORDER BY p.views DESC LIMIT 5
    `).all(userId);

    // 3. Comments on Author's Posts
    const totalCommentsRow = await db.prepare(`
      SELECT COUNT(*) AS total
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE p.author_id = ? AND (c.status = 'approved' OR c.status IS NULL)
    `).get(userId);
    const totalComments = totalCommentsRow ? totalCommentsRow.total : 0;

    const recentComments = await db.prepare(`
      SELECT c.id, c.author_name, c.content, c.created_at, p.title AS post_title, p.slug AS post_slug
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE p.author_id = ? AND (c.status = 'approved' OR c.status IS NULL)
      ORDER BY c.id DESC LIMIT 3
    `).all(userId);

    // 4. Latest post for editorial status tracking
    const latestPost = await db.prepare(`
      SELECT p.id, p.title, p.slug, p.status, p.created_at, p.published_at, c.name AS category_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.author_id = ?
      ORDER BY p.id DESC LIMIT 1
    `).get(userId);

    // 5. Notices & Ads
    const notices = await db.prepare("SELECT * FROM notices WHERE type = 'notice' AND is_active = 1 ORDER BY id DESC LIMIT 1").all();
    const ads = await db.prepare("SELECT * FROM notices WHERE type = 'ad' AND is_active = 1 ORDER BY id DESC LIMIT 1").all();

    // 6. Books Showcase (all books for carousel)
    const books = await db.prepare('SELECT * FROM books ORDER BY id DESC LIMIT 24').all();

    const seo = generateSeoMeta({
      title: 'লেখক প্যানেল - ড্যাশবোর্ড'
    });

    res.render('author/dashboard', {
      user: { ...req.user, avatar: userAvatar },
      publicProfileUrl,
      greeting,
      stats: {
        duration: registeredDuration,
        approved: approvedCount,
        pending: pendingCount,
        draft: draftCount,
        totalViews: totalViews,
        totalComments: totalComments
      },
      topPosts,
      recentComments,
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
  } catch (err) {
    console.error('Error in getDashboard:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি (৫০০)',
      message: 'ড্যাশবোর্ড লোড করতে সমস্যা হয়েছে।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};

// New Post Form GET
exports.getNewPostPage = async (req, res) => {
  try {
    const categories = await db.prepare('SELECT * FROM categories ORDER BY name ASC').all();

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
  } catch (err) {
    console.error('Error in getNewPostPage:', err);
    res.redirect('/author/dashboard');
  }
};

// New Post Form POST
exports.postNewPost = async (req, res) => {
  try {
    const { title, category_id, subcategory, content, excerpt, tags } = req.body;
    const categories = await db.prepare('SELECT * FROM categories ORDER BY name ASC').all();

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
    const existingSlug = await db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug);
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Clean content and strip temporary spell checker tags
    let cleanContent = (content || '')
      .replace(/<span class="payasti-spell-error[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1');

    // Auto-generate clean excerpt if blank
    let cleanExcerpt = (excerpt || '').trim();
    if (!cleanExcerpt) {
      cleanExcerpt = generateCleanExcerpt(cleanContent, 160);
    }

    // Insert post as 'pending' for admin review
    const info = await db.prepare(`
      INSERT INTO posts (author_id, title, slug, content, excerpt, featured_image, category_id, status, views, is_featured, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, NOW())
    `).run(
      req.user.id,
      title.trim(),
      slug,
      cleanContent,
      cleanExcerpt,
      featuredImage,
      parseInt(category_id, 10)
    );

    const postId = info.lastInsertRowid;

    // Process Tags
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      const insertTag = db.prepare('INSERT IGNORE INTO tags (name, slug) VALUES (?, ?)');
      const getTag = db.prepare('SELECT id FROM tags WHERE name = ?');
      const linkTag = db.prepare('INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');

      for (const tagName of tagList) {
        const tagSlug = slugify(tagName, { lower: true, strict: false }) || `tag-${Date.now()}`;
        await insertTag.run(tagName, tagSlug);
        const tagRecord = await getTag.get(tagName);
        if (tagRecord) {
          await linkTag.run(postId, tagRecord.id);
        }
      }
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
  } catch (err) {
    console.error('Error in postNewPost:', err);
    res.redirect('/author/dashboard');
  }
};

// All My Posts Page (/author/my-posts)
exports.getMyPosts = async (req, res) => {
  try {
    const statusFilter = req.query.status || 'all';
    const page = parseInt(req.query.page, 10) || 1;
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

    const totalRow = await db.prepare(countSql).get(...countParams);
    const totalPosts = totalRow ? totalRow.total : 0;
    const totalPages = Math.ceil(totalPosts / limit) || 1;

    postsSql += " ORDER BY p.id DESC LIMIT ? OFFSET ?";
    postsParams.push(limit, offset);

    const posts = await db.prepare(postsSql).all(...postsParams);

    // Stats for tabs
    const allCountRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ?").get(req.user.id);
    const pubCountRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'publish'").get(req.user.id);
    const pendCountRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'pending'").get(req.user.id);
    const draftCountRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE author_id = ? AND status = 'draft'").get(req.user.id);

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
exports.postProfile = async (req, res) => {
  try {
    const { display_name, email, bio, password } = req.body;

    let avatar = req.body.avatar !== undefined ? req.body.avatar : req.user.avatar;
    if (req.file) {
      avatar = `/uploads/${req.file.filename}`;
    }

    if (password && password.trim().length > 0) {
      const hashedPassword = bcrypt.hashSync(password.trim(), 10);
      await db.prepare(`
        UPDATE users SET display_name = ?, email = ?, bio = ?, avatar = ?, password = ? WHERE id = ?
      `).run(display_name.trim(), email.trim(), (bio || '').trim(), avatar, hashedPassword, req.user.id);
    } else {
      await db.prepare(`
        UPDATE users SET display_name = ?, email = ?, bio = ?, avatar = ? WHERE id = ?
      `).run(display_name.trim(), email.trim(), (bio || '').trim(), avatar, req.user.id);
    }

    // Refresh user object
    const updatedUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

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
  } catch (err) {
    console.error('Error in postProfile:', err);
    res.render('author/profile', {
      user: req.user,
      error: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।',
      success: null,
      activeMenu: 'profile',
      seo: generateSeoMeta({ title: 'প্রোফাইল সম্পাদন' }),
      toBengaliNumber,
      formatBengaliDate,
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};
