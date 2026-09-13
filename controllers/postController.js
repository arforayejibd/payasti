const db = require('../config/database');
const { generateSeoMeta, getArticleSchema, getBreadcrumbSchema } = require('../middleware/seo');
const { toBengaliNumber, formatBengaliDate, calculateReadingTime } = require('../middleware/banglaDate');
const { SITE_NAME, TAGLINE, NAV_MENU, EDITORIAL_BOARD, CONTACT, CATEGORY_SLUG_MAP } = require('../config/constants');

// Single Post Page
exports.getSinglePost = (req, res) => {
  const { slug } = req.params;

  const post = db.prepare(`
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
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }

  // Increment views
  db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(post.id);
  post.views += 1;

  // Fetch Tags
  const tags = db.prepare(`
    SELECT t.name, t.slug
    FROM tags t
    JOIN post_tags pt ON t.id = pt.tag_id
    WHERE pt.post_id = ?
  `).all(post.id);

  // Fetch Comments
  const comments = db.prepare(`
    SELECT * FROM comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at DESC
  `).all(post.id);

  // Fetch Related Posts (same category)
  const relatedPosts = db.prepare(`
    SELECT p.id, p.title, p.slug, p.excerpt, p.content, p.published_at, p.views, p.category_id, p.subcategory_id,
           u.display_name AS author_name, u.nicename AS author_slug, u.avatar AS author_avatar,
           c.name AS category_name, c.slug AS category_slug
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = ? AND p.id != ? AND p.status = 'publish'
    ORDER BY p.published_at DESC
    LIMIT 4
  `).all(post.category_id, post.id);

  const crypto = require('crypto');

  // Resolve Author Avatar
  let authorAvatar = post.author_avatar;
  if (!authorAvatar && post.author_email) {
    const hash = crypto.createHash('sha256').update(post.author_email.toLowerCase().trim()).digest('hex');
    authorAvatar = `https://secure.gravatar.com/avatar/${hash}?s=150&d=mm&r=g`;
  }

  // Resolve Related Posts Avatars
  relatedPosts.forEach(rp => {
    if (!rp.author_avatar && rp.author_email) {
      const hash = crypto.createHash('sha256').update(rp.author_email.toLowerCase().trim()).digest('hex');
      rp.author_avatar = `https://secure.gravatar.com/avatar/${hash}?s=150&d=mm&r=g`;
    }
  });

  // Author details
  const author = {
    id: post.author_id,
    display_name: post.author_name,
    username: post.author_slug,
    nicename: post.author_slug,
    avatar: authorAvatar,
    bio: post.author_bio
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
    title: `${post.title} - ${post.author_name}`,
    description: post.excerpt || post.content.substring(0, 160),
    image: post.featured_image,
    url: `/post/${post.slug}`,
    type: 'article',
    author: post.author_name,
    publishedTime: post.published_at,
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        getArticleSchema(post, author, category),
        getBreadcrumbSchema(breadcrumbs)
      ]
    }
  });

  res.render('single_post', {
    post,
    author,
    tags,
    comments,
    relatedPosts,
    readingTime: calculateReadingTime(post.content),
    calculateReadingTime,
    seo,
    toBengaliNumber,
    formatBengaliDate,
    navMenu: NAV_MENU,
    editorialBoard: EDITORIAL_BOARD,
    contact: CONTACT
  });
};

// Category Archive Page
exports.getCategoryPage = (req, res) => {
  let parentSlug = req.params.parent;
  let slug = req.params.slug;
  let subSlug = req.query.sub;

  if (parentSlug) {
    subSlug = slug;
    slug = parentSlug;
  }

  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  // Resolve English slug to Bengali if needed with Unicode normalization
  const resolvedSlug = (CATEGORY_SLUG_MAP[slug] || decodeURIComponent(slug)).normalize('NFC');

  // Find Category
  let category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(resolvedSlug);
  
  if (!category) {
    // Try decoded or LIKE search
    category = db.prepare('SELECT * FROM categories WHERE slug = ? OR name = ?').get(slug, resolvedSlug);
  }

  if (!category) {
    // Try partial match
    category = db.prepare('SELECT * FROM categories WHERE slug LIKE ? OR name LIKE ?').get(`%${resolvedSlug}%`, `%${resolvedSlug}%`);
  }

  if (!category) {
    // Fallback default category object
    category = {
      id: 0,
      name: resolvedSlug,
      slug: resolvedSlug,
      description: `${resolvedSlug} বিষয়ক সাহিত্যের সংকলন`
    };
  }

  // Subcategories definition & Parent-Child Hierarchy (dynamic from database)
  let subcategories = [];
  let parentCategory = null;
  let activeSubCategory = null;
  let activeSubSlug = subSlug ? (CATEGORY_SLUG_MAP[subSlug] || decodeURIComponent(subSlug)).normalize('NFC') : null;

  if (category.id > 0) {
    if (category.parent_id > 0) {
      // Direct access to a subcategory (e.g. /section/কবিতা or /category/ছোটগল্প)
      parentCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(category.parent_id) || category;
      activeSubCategory = category;
      activeSubSlug = category.slug;
    } else {
      // Parent category (e.g. /section/পদ্য or /section/গদ্য)
      parentCategory = category;
      if (subSlug) {
        const decodedSub = (CATEGORY_SLUG_MAP[subSlug] || decodeURIComponent(subSlug)).normalize('NFC');
        activeSubCategory = db.prepare('SELECT * FROM categories WHERE (parent_id = ? OR id = ?) AND (slug = ? OR name = ?)').get(category.id, category.id, decodedSub, decodedSub);
        if (!activeSubCategory) {
          activeSubCategory = db.prepare('SELECT * FROM categories WHERE slug = ? OR name = ?').get(decodedSub, decodedSub);
        }
        if (activeSubCategory) {
          activeSubSlug = activeSubCategory.slug;
        }
      }
    }

    const targetParentId = parentCategory.id;
    const children = db.prepare('SELECT * FROM categories WHERE parent_id = ? ORDER BY count DESC, id ASC').all(targetParentId);
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
    SELECT DISTINCT p.id, p.title, p.slug, p.excerpt, p.content, p.published_at, p.views, p.category_id, p.subcategory_id,
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

  const totalPostsRow = db.prepare(countQuery).get(...countParams);
  const totalPosts = totalPostsRow ? totalPostsRow.total : 0;
  const totalPages = Math.ceil(totalPosts / limit);

  postsQuery += " ORDER BY p.published_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const posts = db.prepare(postsQuery).all(...params);

  // SEO & Breadcrumb
  const breadcrumbs = [
    { name: 'প্রচ্ছদ', url: '/' }
  ];

  if (parentCategory && parentCategory.id !== category.id) {
    breadcrumbs.push({ name: parentCategory.name, url: `/section/${encodeURIComponent(parentCategory.slug)}` });
  }
  if (activeSubCategory) {
    if (!parentCategory || parentCategory.id === category.id) {
      breadcrumbs.push({ name: category.name, url: `/section/${encodeURIComponent(category.slug)}` });
    }
    breadcrumbs.push({ name: activeSubCategory.name, url: `/section/${encodeURIComponent((parentCategory || category).slug)}/${encodeURIComponent(activeSubCategory.slug)}` });
  } else {
    breadcrumbs.push({ name: category.name, url: `/section/${encodeURIComponent(category.slug)}` });
  }

  const pageTitle = activeSubCategory 
    ? `${activeSubCategory.name} - ${parentCategory ? parentCategory.name : category.name} | ${SITE_NAME}`
    : `${category.name} | ${SITE_NAME}`;

  const currentCanonicalUrl = activeSubCategory 
    ? `/section/${encodeURIComponent((parentCategory || category).slug)}/${encodeURIComponent(activeSubCategory.slug)}`
    : `/section/${encodeURIComponent(category.slug)}`;

  const seo = generateSeoMeta({
    title: pageTitle,
    description: (activeSubCategory && activeSubCategory.description) || category.description || `${category.name} বিভাগের সকল সাহিত্য, কবিতা, প্রবন্ধ ও গল্প সংকলন।`,
    url: currentCanonicalUrl,
    schema: getBreadcrumbSchema(breadcrumbs)
  });

  const paginationBasePath = activeSubCategory 
    ? `/section/${encodeURIComponent((parentCategory || category).slug)}/${encodeURIComponent(activeSubCategory.slug)}`
    : `/section/${encodeURIComponent(category.slug)}`;

  res.render('category', {
    category,
    parentCategory: parentCategory || category,
    activeSubCategory,
    subcategories,
    activeSubSlug,
    posts,
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
    navMenu: NAV_MENU,
    editorialBoard: EDITORIAL_BOARD,
    contact: CONTACT
  });
};

// Search
exports.searchPosts = (req, res) => {
  const query = (req.query.q || '').trim();
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  if (!query) {
    return res.redirect('/');
  }

  const searchTerm = `%${query}%`;

  const totalRow = db.prepare(`
    SELECT COUNT(*) AS total
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.status = 'publish' AND (p.title LIKE ? OR p.content LIKE ? OR u.display_name LIKE ?)
  `).get(searchTerm, searchTerm, searchTerm);

  const totalPosts = totalRow ? totalRow.total : 0;
  const totalPages = Math.ceil(totalPosts / limit);

  const posts = db.prepare(`
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
    navMenu: NAV_MENU,
    editorialBoard: EDITORIAL_BOARD,
    contact: CONTACT
  });
};

// AJAX Live Search Endpoint
exports.apiSearch = (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.json({ results: [] });
  }

  const searchTerm = `%${query}%`;
  const posts = db.prepare(`
    SELECT p.id, p.title, p.slug, p.featured_image, u.display_name AS author_name, c.name AS category_name
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'publish' AND (p.title LIKE ? OR p.content LIKE ? OR u.display_name LIKE ?)
    ORDER BY p.published_at DESC
    LIMIT 6
  `).all(searchTerm, searchTerm, searchTerm);

  const books = db.prepare(`
    SELECT id, title, slug, author_name, cover_image, discounted_price, order_url
    FROM books
    WHERE title LIKE ? OR author_name LIKE ?
    LIMIT 3
  `).all(searchTerm, searchTerm);

  res.json({ posts, books });
};

// Comment submission
exports.postComment = (req, res) => {
  const { slug } = req.params;
  const { author_name, author_email, content } = req.body;

  const post = db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug);
  if (!post) {
    return res.status(404).send('Post not found');
  }

  if (!author_name || !content) {
    return res.redirect(`/post/${slug}#comment-form`);
  }

  db.prepare(`
    INSERT INTO comments (post_id, author_name, author_email, content, status)
    VALUES (?, ?, ?, ?, 'approved')
  `).run(post.id, author_name.trim(), (author_email || '').trim(), content.trim());

  res.redirect(`/post/${slug}#comments`);
};
