const crypto = require('crypto');
const db = require('../config/database');
const { generateSeoMeta, getArticleSchema, getBreadcrumbSchema } = require('../middleware/seo');
const { toBengaliNumber, formatBengaliDate, formatCardExcerpt, calculateReadingTime, generateTableOfContents } = require('../middleware/banglaDate');
const { SITE_NAME, TAGLINE, NAV_MENU, EDITORIAL_BOARD, CONTACT, CATEGORY_SLUG_MAP } = require('../config/constants');

// Single Post Page
exports.getSinglePost = async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await db.prepare(`
      SELECT p.*, u.id AS author_id, u.display_name AS author_name, u.nicename AS author_slug, u.avatar AS author_avatar, u.bio AS author_bio, u.email AS author_email,
             c.id AS category_id, c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.status = 'publish'
    `).get(slug);

    if (!post) {
      return res.status(404).render('error', {
        title: 'লেখাটি পাওয়া যায়নি',
        message: 'আপনি যে লেখাটি খুঁজছেন তা মুছে ফেলা হয়েছে বা স্থানান্তরিত হয়েছে।',
        seo: generateSeoMeta({ title: 'লেখাটি পাওয়া যায়নি' }),
        editorialBoard: EDITORIAL_BOARD,
        contact: CONTACT
      });
    }

    // Increment views
    await db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(post.id);
    post.views += 1;

    // Fetch Tags
    const tags = await db.prepare(`
      SELECT t.name, t.slug
      FROM tags t
      JOIN post_tags pt ON t.id = pt.tag_id
      WHERE pt.post_id = ?
    `).all(post.id);

    // Fetch Comments
    const comments = await db.prepare(`
      SELECT * FROM comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at DESC
    `).all(post.id);

    // Fetch Related Posts (same category)
    const relatedPosts = await db.prepare(`
      SELECT p.id, p.title, p.slug, p.excerpt, p.content, p.featured_image, p.published_at, p.views, 
             p.rating_score, p.rating_count, p.category_id, p.subcategory_id,
             u.display_name AS author_name, u.nicename AS author_slug, u.avatar AS author_avatar,
             c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.id != ? AND p.status = 'publish'
      ORDER BY p.published_at DESC
      LIMIT 4
    `).all(post.category_id, post.id);

    // Fetch Trending Reviews for Sidebar Widget
    const trendingPosts = await db.prepare(`
      SELECT p.id, p.title, p.slug, p.featured_image, p.rating_score, p.views, p.published_at,
             c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'publish' AND p.id != ?
      ORDER BY p.views DESC, p.published_at DESC
      LIMIT 5
    `).all(post.id);

    const author = {
      display_name: post.author_name || SITE_NAME,
      username: 'editor'
    };

    const category = {
      name: post.category_name,
      slug: post.category_slug
    };

    // SEO & Schema
    const breadcrumbs = [
      { name: 'প্রচ্ছদ', url: '/' },
      { name: post.category_name || 'বিভাগ', url: `/category/${post.category_slug}` },
      { name: post.title, url: `/post/${post.slug}` }
    ];

    const seo = generateSeoMeta({
      title: `${post.title} | ${SITE_NAME}`,
      description: post.excerpt || post.content.substring(0, 160),
      image: post.featured_image,
      url: `/post/${post.slug}`,
      type: 'article',
      author: post.author_name || SITE_NAME,
      publishedTime: post.published_at,
      schema: {
        '@context': 'https://schema.org',
        '@graph': [
          getArticleSchema(post, author, category),
          getBreadcrumbSchema(breadcrumbs)
        ]
      }
    });

    // Fetch User's existing rating if any
    let userRating = 0;
    try {
      if (req.user && req.user.id) {
        const r = await db.prepare('SELECT rating FROM post_ratings WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
        if (r) userRating = r.rating;
      } else {
        const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        if (ip) {
          const r = await db.prepare('SELECT rating FROM post_ratings WHERE post_id = ? AND ip_address = ? AND user_id IS NULL ORDER BY id DESC LIMIT 1').get(post.id, ip);
          if (r) userRating = r.rating;
        }
      }
    } catch (e) {
      // ignore
    }

    // Generate Table of Contents (TOC) for Review Articles
    const { toc, content: contentWithToc } = generateTableOfContents(post.content);
    post.contentWithToc = contentWithToc;

    res.render('single_post', {
      post,
      tags,
      comments,
      userRating,
      relatedPosts,
      trendingPosts,
      toc,
      readingTime: calculateReadingTime(post.content),
      calculateReadingTime,
      seo,
      toBengaliNumber,
      formatBengaliDate,
      formatCardExcerpt,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  } catch (err) {
    console.error('Error in getSinglePost:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি',
      message: 'লেখাটি লোড করা যায়নি।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};

// Category Archive Page
exports.getCategoryPage = async (req, res) => {
  try {
    let parentSlug = req.params.parent;
    let slug = req.params.slug;
    let subSlug = req.query.sub;

    if (parentSlug) {
      subSlug = slug;
      slug = parentSlug;
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    // Resolve English slug to Bengali if needed with Unicode normalization
    const resolvedSlug = (CATEGORY_SLUG_MAP[slug] || decodeURIComponent(slug)).normalize('NFC');

    // Find Category
    let category = await db.prepare('SELECT * FROM categories WHERE slug = ?').get(resolvedSlug);
    
    if (!category) {
      // Try decoded or LIKE search
      category = await db.prepare('SELECT * FROM categories WHERE slug = ? OR name = ?').get(slug, resolvedSlug);
    }

    if (!category) {
      // Try partial match
      category = await db.prepare('SELECT * FROM categories WHERE slug LIKE ? OR name LIKE ?').get(`%${resolvedSlug}%`, `%${resolvedSlug}%`);
    }

    if (category) {
      if (category.description) {
        category.description = category.description
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/<[^>]*>/g, ' ')
          .replace(/\\r|\\n|\\t/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/[\r\n\t]+/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
      }
    } else {
      // Fallback default category object
      category = {
        id: 0,
        name: resolvedSlug,
        slug: resolvedSlug,
        description: `${resolvedSlug} বিষয়ক সেরা ১০ তালিকা ও রিভিউ`
      };
    }

    // Subcategories definition & Parent-Child Hierarchy (dynamic from database)
    let subcategories = [];
    let parentCategory = null;
    let activeSubCategory = null;
    let activeSubSlug = subSlug ? (CATEGORY_SLUG_MAP[subSlug] || decodeURIComponent(subSlug)).normalize('NFC') : null;

    if (category.id > 0) {
      if (category.parent_id > 0) {
        parentCategory = (await db.prepare('SELECT * FROM categories WHERE id = ?').get(category.parent_id)) || category;
        activeSubCategory = category;
        activeSubSlug = category.slug;
      } else {
        parentCategory = category;
        if (subSlug) {
          const decodedSub = (CATEGORY_SLUG_MAP[subSlug] || decodeURIComponent(subSlug)).normalize('NFC');
          activeSubCategory = await db.prepare('SELECT * FROM categories WHERE (parent_id = ? OR id = ?) AND (slug = ? OR name = ?)').get(category.id, category.id, decodedSub, decodedSub);
          if (!activeSubCategory) {
            activeSubCategory = await db.prepare('SELECT * FROM categories WHERE slug = ? OR name = ?').get(decodedSub, decodedSub);
          }
          if (activeSubCategory) {
            activeSubSlug = activeSubCategory.slug;
          }
        }
      }

      const targetParentId = parentCategory.id;
      const children = await db.prepare('SELECT * FROM categories WHERE parent_id = ? ORDER BY count DESC, id ASC').all(targetParentId);
      if (children.length > 0) {
        subcategories = children.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          count: c.count,
          url: `/section/${encodeURIComponent(parentCategory.slug)}/${encodeURIComponent(c.slug)}`
        }));
      }
    }

    // Build query
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) AS total 
      FROM posts p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN categories sc ON p.subcategory_id = sc.id 
      WHERE p.status = 'publish'
    `;
    let postsQuery = `
      SELECT DISTINCT p.id, p.title, p.slug, p.excerpt, p.content, p.featured_image, p.published_at, p.views, 
             p.rating_score, p.rating_count, p.category_id, p.subcategory_id, p.is_featured,
             u.display_name AS author_name, u.nicename AS author_slug, u.avatar AS author_avatar,
             c.name AS category_name, c.slug AS category_slug,
             sc.name AS subcategory_name, sc.slug AS subcategory_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories sc ON p.subcategory_id = sc.id
      WHERE p.status = 'publish'
    `;
    const params = [];
    const countParams = [];

    if (activeSubCategory) {
      countQuery += " AND (p.category_id = ? OR p.subcategory_id = ?)";
      countParams.push(activeSubCategory.id, activeSubCategory.id);
      postsQuery += " AND (p.category_id = ? OR p.subcategory_id = ?)";
      params.push(activeSubCategory.id, activeSubCategory.id);
    } else if (category.id > 0) {
      countQuery += " AND (p.category_id = ? OR p.subcategory_id = ? OR c.parent_id = ? OR sc.parent_id = ?)";
      countParams.push(category.id, category.id, category.id, category.id);
      postsQuery += " AND (p.category_id = ? OR p.subcategory_id = ? OR c.parent_id = ? OR sc.parent_id = ?)";
      params.push(category.id, category.id, category.id, category.id);
    }

    const totalPostsRow = await db.prepare(countQuery).get(...countParams);
    const totalPosts = totalPostsRow ? totalPostsRow.total : 0;
    const totalPages = Math.ceil(totalPosts / limit);

    // Sorting support
    const sort = req.query.sort || 'latest';
    if (sort === 'popular') {
      postsQuery += " ORDER BY p.views DESC, p.published_at DESC LIMIT ? OFFSET ?";
    } else if (sort === 'rating') {
      postsQuery += " ORDER BY p.rating_score DESC, p.published_at DESC LIMIT ? OFFSET ?";
    } else if (sort === 'oldest') {
      postsQuery += " ORDER BY p.published_at ASC LIMIT ? OFFSET ?";
    } else {
      postsQuery += " ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?";
    }
    params.push(limit, offset);

    const posts = await db.prepare(postsQuery).all(...params);

    // Fetch popular categories for quick navigation
    const popularCategories = await db.prepare(`
      SELECT id, name, slug, count 
      FROM categories 
      WHERE count > 0 AND slug != 'uncategorized'
      ORDER BY count DESC 
      LIMIT 10
    `).all();

    // SEO & Breadcrumb
    const breadcrumbs = [
      { name: 'প্রচ্ছদ', url: '/' }
    ];

    if (parentCategory && parentCategory.id !== category.id) {
      breadcrumbs.push({ name: parentCategory.name, url: `/category/${encodeURIComponent(parentCategory.slug)}` });
    }
    if (activeSubCategory) {
      if (!parentCategory || parentCategory.id === category.id) {
        breadcrumbs.push({ name: category.name, url: `/category/${encodeURIComponent(category.slug)}` });
      }
      breadcrumbs.push({ name: activeSubCategory.name, url: `/category/${encodeURIComponent((parentCategory || category).slug)}/${encodeURIComponent(activeSubCategory.slug)}` });
    } else {
      breadcrumbs.push({ name: category.name, url: `/category/${encodeURIComponent(category.slug)}` });
    }

    const pageTitle = activeSubCategory 
      ? `${activeSubCategory.name} - ${parentCategory ? parentCategory.name : category.name} | ${SITE_NAME}`
      : `${category.name} | ${SITE_NAME}`;

    const currentCanonicalUrl = activeSubCategory 
      ? `/category/${encodeURIComponent((parentCategory || category).slug)}/${encodeURIComponent(activeSubCategory.slug)}`
      : `/category/${encodeURIComponent(category.slug)}`;

    const seo = generateSeoMeta({
      title: pageTitle,
      description: (activeSubCategory && activeSubCategory.description) || category.description || `${category.name} বিভাগের সকল সেরা তালিকা ও যাচাইকৃত রিভিউ।`,
      url: currentCanonicalUrl,
      schema: getBreadcrumbSchema(breadcrumbs)
    });

    const paginationBasePath = activeSubCategory 
      ? `/category/${encodeURIComponent((parentCategory || category).slug)}/${encodeURIComponent(activeSubCategory.slug)}${sort !== 'latest' ? '?sort=' + sort : ''}`
      : `/category/${encodeURIComponent(category.slug)}${sort !== 'latest' ? '?sort=' + sort : ''}`;

    res.render('category', {
      category,
      parentCategory: parentCategory || category,
      activeSubCategory,
      subcategories,
      activeSubSlug,
      popularCategories,
      posts,
      sort,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalPosts,
        basePath: paginationBasePath
      },
      seo,
      currentPath: req.originalUrl,
      toBengaliNumber,
      formatBengaliDate,
      formatCardExcerpt,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  } catch (err) {
    console.error('Error in getCategoryPage:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি',
      message: 'বিভাগের লেখা লোড করা যায়নি।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};

// Search
exports.searchPosts = async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    if (!query) {
      return res.redirect('/');
    }

    const searchTerm = `%${query}%`;

    const totalRow = await db.prepare(`
      SELECT COUNT(*) AS total
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.status = 'publish' AND (p.title LIKE ? OR p.content LIKE ? OR u.display_name LIKE ?)
    `).get(searchTerm, searchTerm, searchTerm);

    const totalPosts = totalRow ? totalRow.total : 0;
    const totalPages = Math.ceil(totalPosts / limit);

    const posts = await db.prepare(`
      SELECT p.id, p.title, p.slug, p.excerpt, p.content, p.published_at, p.views, p.category_id, p.subcategory_id,
             u.display_name AS author_name, u.nicename AS author_slug, u.avatar AS author_avatar,
             c.name AS category_name, c.slug AS category_slug
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'publish' AND (p.title LIKE ? OR p.content LIKE ? OR u.display_name LIKE ?)
      ORDER BY p.published_at DESC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, searchTerm, limit, offset);

    const seo = generateSeoMeta({
      title: `অনুসন্ধান: "${query}"`,
      description: `"${query}" এর জন্য পয়স্তি সাহিত্য ম্যাগাজিনের অনুসন্ধান ফলাফল।`,
      url: `/search?q=${encodeURIComponent(query)}`
    });

    res.render('search', {
      query,
      posts,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalPosts,
        basePath: `/search?q=${encodeURIComponent(query)}`
      },
      seo,
      toBengaliNumber,
      formatBengaliDate,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  } catch (err) {
    console.error('Error in searchPosts:', err);
    res.redirect('/');
  }
};

// AJAX Live Search Endpoint
exports.apiSearch = async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query || query.length < 2) {
      return res.json({ results: [] });
    }

    const searchTerm = `%${query}%`;
    const posts = await db.prepare(`
      SELECT p.id, p.title, p.slug, p.featured_image, u.display_name AS author_name, c.name AS category_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'publish' AND (p.title LIKE ? OR p.content LIKE ? OR u.display_name LIKE ?)
      ORDER BY p.published_at DESC
      LIMIT 6
    `).all(searchTerm, searchTerm, searchTerm);

    const books = await db.prepare(`
      SELECT id, title, slug, author_name, cover_image, discounted_price, order_url
      FROM books
      WHERE title LIKE ? OR author_name LIKE ?
      LIMIT 3
    `).all(searchTerm, searchTerm);

    res.json({ posts, books });
  } catch (err) {
    console.error('Error in apiSearch:', err);
    res.json({ results: [] });
  }
};

// Comment submission (Supports both guests and logged-in users with AJAX)
exports.postComment = async (req, res) => {
  try {
    const { slug } = req.params;
    const { content, author_name, author_email } = req.body;

    const name = (author_name || (req.user && req.user.display_name) || (req.user && req.user.username) || 'পাঠক').trim();
    const email = (author_email || (req.user && req.user.email) || '').trim();
    const commentText = (content || '').trim();

    if (!commentText) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(400).json({ success: false, error: 'অনুগ্রহ করে আপনার মন্তব্য লিখুন।' });
      }
      return res.redirect(`/post/${encodeURIComponent(slug)}#comments`);
    }

    const post = await db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug);
    if (!post) {
      if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(404).json({ success: false, error: 'পোস্টটি পাওয়া যায়নি।' });
      }
      return res.status(404).send('Post not found');
    }

    const result = await db.prepare(`
      INSERT INTO comments (post_id, author_name, author_email, content, status)
      VALUES (?, ?, ?, ?, 'approved')
    `).run(post.id, name, email, commentText);

    if (req.xhr || req.headers.accept?.includes('json') || req.headers['content-type']?.includes('application/json')) {
      return res.json({ 
        success: true, 
        message: 'আপনার মন্তব্য সফলভাবে প্রকাশিত হয়েছে!',
        comment: {
          id: result.insertId,
          author_name: name,
          content: commentText,
          created_at: new Date().toISOString()
        }
      });
    }

    res.redirect(`/post/${encodeURIComponent(slug)}#comments`);
  } catch (err) {
    console.error('Error in postComment:', err);
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(500).json({ success: false, error: 'মন্তব্য সংরক্ষণে ত্রুটি হয়েছে।' });
    }
    res.redirect('back');
  }
};

// Post Rating submission (AJAX)
exports.postRate = async (req, res) => {
  try {
    const { slug } = req.params;
    const rating = parseInt(req.body.rating, 10);

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'রেটিং ১ থেকে ৫-এর মধ্যে হতে হবে।' });
    }

    const post = await db.prepare('SELECT id, slug, rating_score, rating_count FROM posts WHERE slug = ?').get(slug);
    if (!post) {
      return res.status(404).json({ success: false, message: 'লেখাটি পাওয়া যায়নি।' });
    }

    const userId = req.user ? req.user.id : null;
    const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    // Check existing rating
    let existing = null;
    if (userId) {
      existing = await db.prepare('SELECT id FROM post_ratings WHERE post_id = ? AND user_id = ?').get(post.id, userId);
    } else if (ip) {
      existing = await db.prepare('SELECT id FROM post_ratings WHERE post_id = ? AND ip_address = ? AND user_id IS NULL').get(post.id, ip);
    }

    if (existing) {
      await db.prepare('UPDATE post_ratings SET rating = ?, updated_at = NOW() WHERE id = ?').run(rating, existing.id);
    } else {
      await db.prepare('INSERT INTO post_ratings (post_id, user_id, rating, ip_address) VALUES (?, ?, ?, ?)').run(post.id, userId, rating, ip);
    }

    // Recalculate stats
    const stats = await db.prepare('SELECT AVG(rating) AS avg_score, COUNT(*) AS total_count FROM post_ratings WHERE post_id = ?').get(post.id);
    const avgScore = stats && stats.avg_score ? parseFloat(stats.avg_score).toFixed(1) : parseFloat(rating).toFixed(1);
    const totalCount = stats && stats.total_count ? parseInt(stats.total_count, 10) : 1;

    await db.prepare('UPDATE posts SET rating_score = ?, rating_count = ? WHERE id = ?').run(avgScore, totalCount, post.id);

    return res.json({
      success: true,
      rating_score: avgScore,
      rating_count: totalCount,
      user_rating: rating,
      message: `ধন্যবাদ! আপনি ${toBengaliNumber(rating)} তারকা রেটিং দিয়েছেন।`
    });
  } catch (err) {
    console.error('Error in postRate:', err);
    return res.status(500).json({ success: false, message: 'রেটিং সংরক্ষণ করা সম্ভব হয়নি।' });
  }
};
