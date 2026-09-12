const db = require('../config/database');
const { CATEGORY_SLUG_MAP } = require('../config/constants');

const slug = 'goddya';
const resolvedSlug = CATEGORY_SLUG_MAP[slug] || decodeURIComponent(slug);
console.log('resolvedSlug:', resolvedSlug);

let category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(resolvedSlug);
console.log('category:', category);

let countQuery = "SELECT COUNT(p.id) AS total FROM posts p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'publish'";
let postsQuery = "SELECT p.id, p.title, c.name FROM posts p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'publish'";

if (category && category.id > 0) {
  countQuery += ' AND (p.category_id = ? OR c.parent_id = ?)';
  postsQuery += ' AND (p.category_id = ? OR c.parent_id = ?)';
  console.log('Count:', db.prepare(countQuery).get(category.id, category.id));
  console.log('Posts found:', db.prepare(postsQuery).all(category.id, category.id).length);
}
