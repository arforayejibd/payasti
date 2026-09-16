const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateSeoMeta } = require('../middleware/seo');
const { toBengaliNumber, formatBengaliDate, generateCleanExcerpt } = require('../middleware/banglaDate');
const { sendAccountApprovedEmail } = require('../services/mailService');

// ==========================================
// 1. DASHBOARD OVERVIEW
// ==========================================
exports.getDashboard = async (req, res) => {
  try {
    const pendingRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE status = 'pending'").get();
    const publishedRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE status = 'publish'").get();
    const draftRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE status = 'draft'").get();
    const usersRow = await db.prepare("SELECT COUNT(*) AS total FROM users").get();
    const booksRow = await db.prepare("SELECT COUNT(*) AS total FROM books").get();
    const totalViewsRow = await db.prepare("SELECT COALESCE(SUM(views), 0) AS total FROM posts").get();

    const pendingPostsCount = pendingRow ? pendingRow.total : 0;
    const publishedPostsCount = publishedRow ? publishedRow.total : 0;
    const draftPostsCount = draftRow ? draftRow.total : 0;
    const usersCount = usersRow ? usersRow.total : 0;
    const booksCount = booksRow ? booksRow.total : 0;
    const totalViews = totalViewsRow ? totalViewsRow.total : 0;

    const pendingUsersRow = await db.prepare("SELECT COUNT(1) AS total FROM users WHERE status IN ('pending_approval', 'pending_verification') OR (role = 'author' AND is_approved = 0)").get();
    const pendingUsersCount = pendingUsersRow ? pendingUsersRow.total : 0;

    // Recent pending submissions
    const recentPending = await db.prepare(`
      SELECT p.*, u.display_name AS author_name, u.email AS author_email, c.name AS category_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'pending'
      ORDER BY p.id DESC LIMIT 5
    `).all();

    // Recent published submissions
    const recentPublished = await db.prepare(`
      SELECT p.*, u.display_name AS author_name, c.name AS category_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'publish'
      ORDER BY p.id DESC LIMIT 5
    `).all();

    // Recent registered users
    const recentUsers = await db.prepare(`
      SELECT id, display_name, username, email, role, registered_at, created_at
      FROM users
      ORDER BY id DESC LIMIT 5
    `).all();

    const seo = generateSeoMeta({ title: 'এডমিন ড্যাশবোর্ড ও মডারেশন' });

    res.render('admin/dashboard', {
      user: req.user,
      stats: {
        pending: pendingPostsCount,
        published: publishedPostsCount,
        drafts: draftPostsCount,
        users: usersCount,
        pendingUsers: pendingUsersCount,
        books: booksCount,
        totalViews: totalViews
      },
      recentPending,
      recentPublished,
      recentUsers,
      activeMenu: 'admin_dashboard',
      seo,
      toBengaliNumber,
      formatBengaliDate
    });
  } catch (err) {
    console.error('Error in getDashboard:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি',
      message: 'এডমিন ড্যাশবোর্ড লোড করতে সমস্যা হয়েছে।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      navMenu: [],
      editorialBoard: [],
      contact: {}
    });
  }
};

// ==========================================
// 2. ALL POSTS MANAGEMENT
// ==========================================
exports.getAllPosts = async (req, res) => {
  try {
    const statusFilter = req.query.status || 'all';
    const categoryFilter = req.query.category || 'all';
    const searchQuery = (req.query.q || '').trim();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    // Counts for tabs
    const allRow = await db.prepare("SELECT COUNT(*) AS total FROM posts").get();
    const pubRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE status = 'publish'").get();
    const pendRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE status = 'pending'").get();
    const draftRow = await db.prepare("SELECT COUNT(*) AS total FROM posts WHERE status = 'draft'").get();

    const countAll = allRow ? allRow.total : 0;
    const countPublish = pubRow ? pubRow.total : 0;
    const countPending = pendRow ? pendRow.total : 0;
    const countDraft = draftRow ? draftRow.total : 0;

    let whereClauses = [];
    let params = [];

    if (statusFilter && statusFilter !== 'all') {
      whereClauses.push('p.status = ?');
      params.push(statusFilter);
    }

    if (categoryFilter && categoryFilter !== 'all') {
      whereClauses.push('p.category_id = ?');
      params.push(parseInt(categoryFilter, 10));
    }

    if (searchQuery) {
      whereClauses.push('(p.title LIKE ? OR u.display_name LIKE ? OR u.username LIKE ?)');
      params.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const totalFilteredRow = await db.prepare(`
      SELECT COUNT(*) AS total
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      ${whereSql}
    `).get(...params);
    const totalFiltered = totalFilteredRow ? totalFilteredRow.total : 0;
    const totalPages = Math.ceil(totalFiltered / limit) || 1;

    const posts = await db.prepare(`
      SELECT p.*, u.display_name AS author_name, u.username AS author_username, u.email AS author_email, c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const categories = await db.prepare('SELECT id, name FROM categories ORDER BY name ASC').all();
    const seo = generateSeoMeta({ title: 'সকল লেখা পরিচালনা - এডমিন' });

    res.render('admin/posts', {
      user: req.user,
      posts,
      statusFilter,
      categoryFilter,
      searchQuery,
      page,
      totalPages,
      totalFiltered,
      counts: {
        all: countAll,
        publish: countPublish,
        pending: countPending,
        draft: countDraft
      },
      categories,
      activeMenu: 'all_posts',
      seo,
      toBengaliNumber,
      formatBengaliDate
    });
  } catch (err) {
    console.error('Error in getAllPosts:', err);
    res.redirect('/admin');
  }
};

// New Post (Admin) GET
exports.getNewPost = async (req, res) => {
  try {
    const categories = await db.prepare('SELECT id, name FROM categories ORDER BY name ASC').all();
    const authors = await db.prepare('SELECT id, display_name, username, role FROM users ORDER BY display_name ASC').all();
    const seo = generateSeoMeta({ title: 'নতুন লেখা যোগ করুন - এডমিন' });

    res.render('admin/post_new', {
      user: req.user,
      categories,
      authors,
      error: null,
      activeMenu: 'new_post',
      seo,
      toBengaliNumber
    });
  } catch (err) {
    console.error('Error in getNewPost:', err);
    res.redirect('/admin/posts');
  }
};

// New Post (Admin) POST
exports.postNewPost = async (req, res) => {
  try {
    const { title, author_id, category_id, excerpt, content, status, is_featured } = req.body;
    const categories = await db.prepare('SELECT id, name FROM categories ORDER BY name ASC').all();
    const authors = await db.prepare('SELECT id, display_name, username, role FROM users ORDER BY display_name ASC').all();

    if (!title || !category_id || !content) {
      return res.render('admin/post_new', {
        user: req.user,
        categories,
        authors,
        error: 'অনুগ্রহ করে শিরোনাম, বিভাগ এবং মূল লেখা প্রদান করুন।',
        activeMenu: 'new_post',
        seo: generateSeoMeta({ title: 'নতুন লেখা যোগ করুন - এডমিন' }),
        toBengaliNumber
      });
    }

    let featuredImage = req.body.featured_image || '';
    if (req.file) {
      featuredImage = `/uploads/${req.file.filename}`;
    }

    let slug = slugify(title, { lower: true, strict: false, remove: /[*+~.()'"!:@]/g }) || `post-${Date.now()}`;
    const existingSlug = await db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug);
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    let cleanContent = (content || '')
      .replace(/<span class="payasti-spell-error[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1');

    let cleanExcerpt = (excerpt || '').trim();
    if (!cleanExcerpt) {
      cleanExcerpt = generateCleanExcerpt(cleanContent, 160);
    }

    const postAuthorId = author_id && !isNaN(parseInt(author_id, 10)) ? parseInt(author_id, 10) : req.user.id;
    const postCategoryId = category_id && !isNaN(parseInt(category_id, 10)) ? parseInt(category_id, 10) : null;
    const postStatus = status || 'publish';
    const postFeatured = is_featured === '1' ? 1 : 0;

    await db.prepare(`
      INSERT INTO posts (author_id, title, slug, content, excerpt, featured_image, category_id, status, views, is_featured, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW(), NOW())
    `).run(
      postAuthorId,
      title.trim(),
      slug,
      cleanContent,
      cleanExcerpt,
      featuredImage,
      postCategoryId,
      postStatus,
      postFeatured
    );

    res.redirect('/admin/posts');
  } catch (err) {
    console.error('Error in postNewPost:', err);
    res.redirect('/admin/posts');
  }
};

// Edit Post GET
exports.getEditPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(id);

    if (!post) {
      return res.redirect('/admin/posts');
    }

    const categories = await db.prepare('SELECT id, name FROM categories ORDER BY name ASC').all();
    const authors = await db.prepare('SELECT id, display_name, username, role FROM users ORDER BY display_name ASC').all();
    const seo = generateSeoMeta({ title: `লেখা সম্পাদনা: ${post.title}` });

    res.render('admin/post_edit', {
      user: req.user,
      post,
      categories,
      authors,
      error: null,
      activeMenu: 'all_posts',
      seo,
      toBengaliNumber,
      formatBengaliDate
    });
  } catch (err) {
    console.error('Error in getEditPost:', err);
    res.redirect('/admin/posts');
  }
};

// Edit Post POST
exports.postEditPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author_id, category_id, excerpt, content, status, is_featured } = req.body;

    const existingPost = await db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!existingPost) {
      return res.redirect('/admin/posts');
    }

    let featuredImage = req.body.featured_image !== undefined ? req.body.featured_image : existingPost.featured_image;
    if (req.file) {
      featuredImage = `/uploads/${req.file.filename}`;
    }

    let cleanContent = (content !== undefined && content.trim() !== '' ? content : (existingPost.content || ''))
      .replace(/<span class="payasti-spell-error[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1');

    let cleanExcerpt = (excerpt || '').trim();
    if (!cleanExcerpt) {
      cleanExcerpt = generateCleanExcerpt(cleanContent, 160);
    }

    const postTitle = (title || existingPost.title || '').trim();
    const postAuthorId = author_id && !isNaN(parseInt(author_id, 10)) ? parseInt(author_id, 10) : (existingPost.author_id || req.user.id);
    const postCategoryId = category_id && !isNaN(parseInt(category_id, 10)) ? parseInt(category_id, 10) : (existingPost.category_id || null);
    const postStatus = status || existingPost.status;
    const postFeatured = is_featured === '1' ? 1 : 0;

    // Set published_at if moving to publish for the first time
    let publishedAt = existingPost.published_at;
    if (postStatus === 'publish' && !publishedAt) {
      publishedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    await db.prepare(`
      UPDATE posts
      SET title = ?, author_id = ?, category_id = ?, excerpt = ?, content = ?, featured_image = ?, status = ?, is_featured = ?, published_at = ?, updated_at = NOW()
      WHERE id = ?
    `).run(
      postTitle,
      postAuthorId,
      postCategoryId,
      cleanExcerpt,
      cleanContent,
      featuredImage,
      postStatus,
      postFeatured,
      publishedAt,
      id
    );

    res.redirect('/admin/posts');
  } catch (err) {
    console.error('Error in postEditPost:', err);
    res.redirect('/admin/posts');
  }
};

// Delete Post Action
exports.deletePost = async (req, res) => {
  const { id } = req.params;
  try {
    await db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(id);
    await db.prepare('DELETE FROM comments WHERE post_id = ?').run(id);
    await db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  } catch (err) {
    console.error('Error deleting post:', err);
  }
  res.redirect('/admin/posts');
};

// ==========================================
// 3. PENDING POSTS QUEUE
// ==========================================
exports.getPendingPosts = async (req, res) => {
  try {
    const pendingPosts = await db.prepare(`
      SELECT p.*, u.display_name AS author_name, u.email AS author_email, c.name AS category_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'pending'
      ORDER BY p.id DESC
    `).all();

    const seo = generateSeoMeta({ title: 'পেন্ডিং লেখা অনুমোদন - এডমিন' });

    res.render('admin/pending_posts', {
      user: req.user,
      pendingPosts,
      activeMenu: 'pending_posts',
      seo,
      toBengaliNumber,
      formatBengaliDate
    });
  } catch (err) {
    console.error('Error in getPendingPosts:', err);
    res.redirect('/admin');
  }
};

exports.approvePost = async (req, res) => {
  const { id } = req.params;
  try {
    await db.prepare("UPDATE posts SET status = 'publish', published_at = NOW(), updated_at = NOW() WHERE id = ?").run(id);
  } catch (err) {
    console.error('Error approving post:', err);
  }
  res.redirect(req.headers.referer || '/admin/pending');
};

exports.rejectPost = async (req, res) => {
  const { id } = req.params;
  try {
    await db.prepare("UPDATE posts SET status = 'draft', updated_at = NOW() WHERE id = ?").run(id);
  } catch (err) {
    console.error('Error rejecting post:', err);
  }
  res.redirect(req.headers.referer || '/admin/pending');
};

// ==========================================
// 4. AUTHORS & USERS MANAGEMENT
// ==========================================
exports.getUsers = async (req, res) => {
  try {
    const roleFilter = req.query.role || 'all';
    const statusFilter = req.query.status || 'all';
    const searchQuery = (req.query.q || '').trim();

    let whereClauses = [];
    let params = [];

    if (roleFilter && roleFilter !== 'all') {
      whereClauses.push('u.role = ?');
      params.push(roleFilter);
    }

    if (statusFilter === 'pending_approval') {
      whereClauses.push("(u.status = 'pending_approval' OR (u.role = 'author' AND u.is_approved = 0 AND u.email_verified = 1))");
    } else if (statusFilter === 'pending_verification') {
      whereClauses.push("(u.status = 'pending_verification' OR u.email_verified = 0)");
    } else if (statusFilter === 'active') {
      whereClauses.push("(u.status = 'active' AND (u.is_approved = 1 OR u.role = 'admin'))");
    } else if (statusFilter === 'suspended') {
      whereClauses.push("u.status = 'suspended'");
    }

    if (searchQuery) {
      whereClauses.push('(u.display_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)');
      params.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const users = await db.prepare(`
      SELECT u.*, 
        (SELECT COUNT(*) FROM posts WHERE author_id = u.id) AS post_count,
        (SELECT COUNT(*) FROM posts WHERE author_id = u.id AND status = 'publish') AS published_count
      FROM users u
      ${whereSql}
      ORDER BY u.id DESC
    `).all(...params);

    // Stats for user roles & approval statuses
    const totalRow = await db.prepare("SELECT COUNT(*) AS total FROM users").get();
    const adminRow = await db.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'").get();
    const editorRow = await db.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'editor'").get();
    const authorRow = await db.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'author'").get();
    const pendingApprovalRow = await db.prepare("SELECT COUNT(*) AS total FROM users WHERE status = 'pending_approval' OR (role = 'author' AND is_approved = 0 AND email_verified = 1)").get();
    const pendingVerificationRow = await db.prepare("SELECT COUNT(*) AS total FROM users WHERE status = 'pending_verification' OR email_verified = 0").get();

    const totalUsers = totalRow ? totalRow.total : 0;
    const totalAdmins = adminRow ? adminRow.total : 0;
    const totalEditors = editorRow ? editorRow.total : 0;
    const totalAuthors = authorRow ? authorRow.total : 0;
    const totalPendingApproval = pendingApprovalRow ? pendingApprovalRow.total : 0;
    const totalPendingVerification = pendingVerificationRow ? pendingVerificationRow.total : 0;

    const seo = generateSeoMeta({ title: 'লেখক ও ইউজার তালিকা - এডমিন' });

    res.render('admin/users', {
      user: req.user,
      users,
      roleFilter,
      statusFilter,
      searchQuery,
      userStats: {
        total: totalUsers,
        admins: totalAdmins,
        editors: totalEditors,
        authors: totalAuthors,
        pendingApproval: totalPendingApproval,
        pendingVerification: totalPendingVerification
      },
      activeMenu: 'manage_users',
      seo,
      toBengaliNumber,
      formatBengaliDate
    });
  } catch (err) {
    console.error('Error in getUsers:', err);
    res.redirect('/admin');
  }
};

// New User GET
exports.getNewUser = (req, res) => {
  const seo = generateSeoMeta({ title: 'নতুন লেখক/ইউজার তৈরি - এডমিন' });
  res.render('admin/user_new', {
    user: req.user,
    error: null,
    activeMenu: 'manage_users',
    seo,
    toBengaliNumber
  });
};

// New User POST
exports.postNewUser = async (req, res) => {
  try {
    const { display_name, username, email, password, role, bio } = req.body;

    if (!display_name || !username || !email || !password) {
      return res.render('admin/user_new', {
        user: req.user,
        error: 'অনুগ্রহ করে পূর্ণ নাম, ইউজারনেম, ইমেইল এবং পাসওয়ার্ড প্রদান করুন।',
        activeMenu: 'manage_users',
        seo: generateSeoMeta({ title: 'নতুন লেখক/ইউজার তৈরি - এডমিন' }),
        toBengaliNumber
      });
    }

    // Check unique username or email
    const existingUser = await db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.trim(), email.trim());
    if (existingUser) {
      return res.render('admin/user_new', {
        user: req.user,
        error: 'এই ইউজারনেম বা ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা আছে।',
        activeMenu: 'manage_users',
        seo: generateSeoMeta({ title: 'নতুন লেখক/ইউজার তৈরি - এডমিন' }),
        toBengaliNumber
      });
    }

    let avatar = req.body.avatar || '';
    if (req.file) {
      avatar = `/uploads/${req.file.filename}`;
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userRole = role || 'author';

    await db.prepare(`
      INSERT INTO users (display_name, username, email, password, role, avatar, bio, registered_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `).run(
      display_name.trim(),
      username.trim().toLowerCase(),
      email.trim().toLowerCase(),
      hashedPassword,
      userRole,
      avatar,
      bio ? bio.trim() : ''
    );

    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error in postNewUser:', err);
    res.redirect('/admin/users');
  }
};

// Edit User GET
exports.getEditUser = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!targetUser) {
      return res.redirect('/admin/users');
    }

    const seo = generateSeoMeta({ title: `লেখক সম্পাদনা: ${targetUser.display_name}` });

    res.render('admin/user_edit', {
      user: req.user,
      targetUser,
      error: null,
      activeMenu: 'manage_users',
      seo,
      toBengaliNumber,
      formatBengaliDate
    });
  } catch (err) {
    console.error('Error in getEditUser:', err);
    res.redirect('/admin/users');
  }
};

// Edit User POST
exports.postEditUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, email, role, bio, new_password } = req.body;

    const targetUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!targetUser) {
      return res.redirect('/admin/users');
    }

    let avatar = req.body.avatar !== undefined ? req.body.avatar : targetUser.avatar;
    if (req.file) {
      avatar = `/uploads/${req.file.filename}`;
    }

    let password = targetUser.password;
    if (new_password && new_password.trim().length >= 6) {
      password = bcrypt.hashSync(new_password.trim(), 10);
    }

    await db.prepare(`
      UPDATE users
      SET display_name = ?, email = ?, role = ?, avatar = ?, bio = ?, password = ?
      WHERE id = ?
    `).run(
      display_name.trim(),
      email.trim().toLowerCase(),
      role || targetUser.role,
      avatar,
      bio ? bio.trim() : '',
      password,
      id
    );

    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error in postEditUser:', err);
    res.redirect('/admin/users');
  }
};

// Delete User Action
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  // Prevent deleting currently logged-in account
  if (parseInt(req.user.id, 10) === parseInt(id, 10)) {
    return res.redirect('/admin/users');
  }

  try {
    // Reassign posts to administrator (id 1)
    await db.prepare('UPDATE posts SET author_id = 1 WHERE author_id = ?').run(id);
    await db.prepare('DELETE FROM email_verifications WHERE user_id = ?').run(id);
    await db.prepare('DELETE FROM users WHERE id = ?').run(id);
  } catch (err) {
    console.error('Error deleting user:', err);
  }

  res.redirect('/admin/users');
};

// Approve User Action (Admin) POST
exports.approveUser = async (req, res) => {
  const { id } = req.params;
  try {
    const targetUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (targetUser) {
      await db.prepare("UPDATE users SET is_approved = 1, email_verified = 1, status = 'active' WHERE id = ?").run(id);
      sendAccountApprovedEmail(targetUser).catch(e => {
        console.warn('[MAIL ERROR] approveUser notification email failed:', e.message);
      });
    }
  } catch (err) {
    console.error('Error approving user:', err);
  }
  res.redirect(req.headers.referer || '/admin/users');
};

// ==========================================
// 5. MANAGE BOOKS
// ==========================================
exports.getManageBooks = async (req, res) => {
  try {
    const books = await db.prepare('SELECT * FROM books ORDER BY id DESC').all();
    const seo = generateSeoMeta({ title: 'বই সম্ভার ব্যবস্থাপনা' });

    res.render('admin/manage_books', {
      user: req.user,
      books,
      error: null,
      success: null,
      activeMenu: 'manage_books',
      seo,
      toBengaliNumber,
      formatBengaliDate
    });
  } catch (err) {
    console.error('Error in getManageBooks:', err);
    res.redirect('/admin');
  }
};

exports.postAddBook = async (req, res) => {
  try {
    const { title, author_name, regular_price, discounted_price, order_url, description } = req.body;

    let coverImage = req.body.cover_image || '';
    if (req.file) {
      coverImage = `/uploads/${req.file.filename}`;
    }

    const slug = (title || `book-${Date.now()}`).toLowerCase().replace(/\s+/g, '-');

    await db.prepare(`
      INSERT INTO books (title, slug, author_name, cover_image, regular_price, discounted_price, order_url, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, slug, author_name, coverImage, regular_price, discounted_price, order_url, description);

    res.redirect('/admin/books');
  } catch (err) {
    console.error('Error in postAddBook:', err);
    res.redirect('/admin/books');
  }
};

exports.deleteBook = async (req, res) => {
  const { id } = req.params;
  try {
    await db.prepare('DELETE FROM books WHERE id = ?').run(id);
  } catch (err) {
    console.error('Error deleting book:', err);
  }
  res.redirect('/admin/books');
};

// ==========================================
// 6. CATEGORIES & TAGS (Under Posts Submenu)
// ==========================================
exports.getCategories = async (req, res) => {
  try {
    const categories = await db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM posts WHERE category_id = c.id) AS post_count
      FROM categories c
      ORDER BY c.name ASC
    `).all();

    const seo = generateSeoMeta({ title: 'বিভাগ / ক্যাটাগরি - এডমিন' });

    res.render('admin/categories', {
      user: req.user,
      categories,
      error: null,
      activeMenu: 'posts_categories',
      openSubmenu: 'posts',
      seo,
      toBengaliNumber
    });
  } catch (err) {
    console.error('Error in getCategories:', err);
    res.redirect('/admin');
  }
};

exports.postAddCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    if (!name || !name.trim()) {
      return res.redirect('/admin/categories');
    }

    let catSlug = (slug || slugify(name, { lower: true, strict: false })).trim();
    const existing = await db.prepare('SELECT id FROM categories WHERE slug = ?').get(catSlug);
    if (existing) {
      catSlug = `${catSlug}-${Date.now()}`;
    }

    await db.prepare(`
      INSERT INTO categories (name, slug, description, parent_id, count)
      VALUES (?, ?, ?, 0, 0)
    `).run(name.trim(), catSlug, description ? description.trim() : '');

    res.redirect('/admin/categories');
  } catch (err) {
    console.error('Error in postAddCategory:', err);
    res.redirect('/admin/categories');
  }
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    await db.prepare('UPDATE posts SET category_id = 8 WHERE category_id = ?').run(id);
    await db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  } catch (err) {
    console.error('Error deleting category:', err);
  }
  res.redirect('/admin/categories');
};

exports.getTags = async (req, res) => {
  try {
    const tags = await db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM post_tags WHERE tag_id = t.id) AS post_count
      FROM tags t
      ORDER BY t.id DESC
    `).all();

    const seo = generateSeoMeta({ title: 'ট্যাগ সমূহ - এডমিন' });

    res.render('admin/tags', {
      user: req.user,
      tags,
      error: null,
      activeMenu: 'posts_tags',
      openSubmenu: 'posts',
      seo,
      toBengaliNumber
    });
  } catch (err) {
    console.error('Error in getTags:', err);
    res.redirect('/admin');
  }
};

exports.postAddTag = async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name || !name.trim()) {
      return res.redirect('/admin/tags');
    }

    let tagSlug = (slug || slugify(name, { lower: true, strict: false })).trim();
    const existing = await db.prepare('SELECT id FROM tags WHERE slug = ?').get(tagSlug);
    if (existing) {
      tagSlug = `${tagSlug}-${Date.now()}`;
    }

    await db.prepare('INSERT INTO tags (name, slug) VALUES (?, ?)').run(name.trim(), tagSlug);
    res.redirect('/admin/tags');
  } catch (err) {
    console.error('Error in postAddTag:', err);
    res.redirect('/admin/tags');
  }
};

exports.deleteTag = async (req, res) => {
  const { id } = req.params;
  try {
    await db.prepare('DELETE FROM post_tags WHERE tag_id = ?').run(id);
    await db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  } catch (err) {
    console.error('Error deleting tag:', err);
  }
  res.redirect('/admin/tags');
};

// ==========================================
// 7. MEDIA LIBRARY
// ==========================================
exports.getMedia = (req, res) => {
  const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
  let mediaFiles = [];

  try {
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      mediaFiles = files.map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          url: `/uploads/${file}`,
          size: (stats.size / 1024).toFixed(1) + ' KB',
          createdAt: stats.birthtime || stats.mtime
        };
      }).reverse();
    }
  } catch (err) {
    console.error('Error reading media dir:', err);
  }

  const seo = generateSeoMeta({ title: 'মিডিয়া লাইব্রেরি - এডমিন' });

  res.render('admin/media', {
    user: req.user,
    mediaFiles,
    activeMenu: 'media',
    seo,
    toBengaliNumber,
    formatBengaliDate
  });
};

exports.postUploadMedia = (req, res) => {
  res.redirect('/admin/media');
};

exports.deleteMedia = (req, res) => {
  const { filename } = req.body;
  if (filename) {
    const cleanFilename = path.basename(filename);
    const targetPath = path.join(__dirname, '..', 'public', 'uploads', cleanFilename);
    try {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
    } catch (err) {
      console.error('Error deleting media file:', err);
    }
  }
  res.redirect('/admin/media');
};

// ==========================================
// 8. COMMENTS
// ==========================================
exports.getComments = async (req, res) => {
  try {
    const comments = await db.prepare(`
      SELECT c.*, p.title AS post_title, p.slug AS post_slug
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      ORDER BY c.id DESC
    `).all();

    const seo = generateSeoMeta({ title: 'মন্তব্য পরিচালনা - এডমিন' });

    res.render('admin/comments', {
      user: req.user,
      comments,
      activeMenu: 'comments',
      seo,
      toBengaliNumber,
      formatBengaliDate
    });
  } catch (err) {
    console.error('Error in getComments:', err);
    res.redirect('/admin');
  }
};

exports.approveComment = async (req, res) => {
  const { id } = req.params;
  try {
    await db.prepare("UPDATE comments SET status = 'approved' WHERE id = ?").run(id);
  } catch (err) {
    console.error('Error approving comment:', err);
  }
  res.redirect('/admin/comments');
};

exports.deleteComment = async (req, res) => {
  const { id } = req.params;
  try {
    await db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  } catch (err) {
    console.error('Error deleting comment:', err);
  }
  res.redirect('/admin/comments');
};

// ==========================================
// 9. SETTINGS
// ==========================================
exports.getSettings = async (req, res) => {
  try {
    const settingsRows = await db.prepare('SELECT `key`, `value` FROM settings').all();
    const settingsMap = {};
    settingsRows.forEach(row => {
      settingsMap[row.key] = row.value;
    });

    const seo = generateSeoMeta({ title: 'সাইট সেটিংস - এডমিন' });

    res.render('admin/settings', {
      user: req.user,
      settings: settingsMap,
      success: req.query.saved === '1',
      activeMenu: 'settings',
      seo,
      toBengaliNumber
    });
  } catch (err) {
    console.error('Error in getSettings:', err);
    res.redirect('/admin');
  }
};

exports.postSettings = async (req, res) => {
  try {
    const { site_title, site_tagline, site_description, contact_email, contact_phone, facebook_url } = req.body;

    const updates = [
      { key: 'site_title', value: site_title || '' },
      { key: 'site_tagline', value: site_tagline || '' },
      { key: 'site_description', value: site_description || '' },
      { key: 'contact_email', value: contact_email || '' },
      { key: 'contact_phone', value: contact_phone || '' },
      { key: 'facebook_url', value: facebook_url || '' }
    ];

    for (const item of updates) {
      await db.prepare('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)').run(item.key, item.value.trim());
    }

    res.redirect('/admin/settings?saved=1');
  } catch (err) {
    console.error('Error in postSettings:', err);
    res.redirect('/admin/settings');
  }
};
