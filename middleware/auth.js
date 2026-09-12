const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { generateSeoMeta } = require('./seo');

const JWT_SECRET = process.env.JWT_SECRET || 'payasti-super-secret-jwt-key-2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Middleware to extract user from session or JWT cookie
function checkUser(req, res, next) {
  res.locals.user = null;
  const token = req.cookies.token || (req.session && req.session.token);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, wp_id, username, email, display_name, nicename, role, avatar, bio, registered_at FROM users WHERE id = ?').get(decoded.id);
    if (user) {
      req.user = user;
      res.locals.user = user;
    }
  } catch (err) {
    res.clearCookie('token');
  }
  next();
}

// Middleware to protect routes that require login
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
}

// Middleware to require specific roles
function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).render('error', {
        title: 'অ্যাক্সেস নেই (৪০৩)',
        message: 'এই পেজটি দেখার অনুমতি আপনার নেই। শুধুমাত্র এডমিন ও সম্পাদকদের জন্য নির্ধারিত।',
        seo: generateSeoMeta({ title: 'অ্যাক্সেস ডিনায়েড' }),
        navMenu: res.locals.navMenu,
        editorialBoard: res.locals.editorialBoard,
        contact: res.locals.contact
      });
    }
    next();
  };
}

module.exports = {
  generateToken,
  checkUser,
  requireAuth,
  requireRole,
  JWT_SECRET
};
