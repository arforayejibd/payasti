const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require('dotenv');

dotenv.config();

const { checkUser } = require('./middleware/auth');
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const authorRoutes = require('./routes/author');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const { NAV_MENU, EDITORIAL_BOARD, CONTACT } = require('./config/constants');
const { generateSeoMeta } = require('./middleware/seo');
const { 
  toBengaliNumber, 
  formatBengaliDate, 
  formatDuration, 
  formatCardExcerpt, 
  renderArticleContent, 
  calculateReadingTime 
} = require('./middleware/banglaDate');

const app = express();
const PORT = process.env.PORT || 3000;

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
try {
  const compression = require('compression');
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));
} catch (e) {
  console.warn('Compression package not loaded, continuing without it:', e.message);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'payasti-session-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// Static files (ETag enabled for instant freshness checks, no stale caching)
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true
}));

// Dynamic routes: Never cache HTML pages so updates and new posts are immediately visible
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Global User / Auth state
app.use(checkUser);

// Attach helpers to app.locals for universal access in all views and sub-partials
app.locals.toBengaliNumber = toBengaliNumber;
app.locals.formatBengaliDate = formatBengaliDate;
app.locals.formatDuration = formatDuration;
app.locals.formatCardExcerpt = formatCardExcerpt;
app.locals.renderArticleContent = renderArticleContent;
app.locals.calculateReadingTime = calculateReadingTime;

// Global view variables
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.navMenu = NAV_MENU;
  res.locals.editorialBoard = EDITORIAL_BOARD;
  res.locals.contact = CONTACT;
  res.locals.toBengaliNumber = toBengaliNumber;
  res.locals.formatBengaliDate = formatBengaliDate;
  res.locals.formatDuration = formatDuration;
  res.locals.formatCardExcerpt = formatCardExcerpt;
  res.locals.renderArticleContent = renderArticleContent;
  res.locals.calculateReadingTime = calculateReadingTime;
  next();
});

// Mount Routes
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/author', authorRoutes);
app.use('/api', apiRoutes);
app.use('/', indexRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'পেজটি পাওয়া যায়নি (৪০৪)',
    message: 'আপনি যে পেজটি খুঁজছেন তা মুছে ফেলা হয়েছে বা লিঙ্কটি সঠিক নয়।',
    seo: generateSeoMeta({ title: 'পেজটি পাওয়া যায়নি' }),
    navMenu: NAV_MENU,
    editorialBoard: EDITORIAL_BOARD,
    contact: CONTACT
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render('error', {
    title: 'সার্ভার ত্রুটি (৫০০)',
    message: 'দুঃখিত, কোনো একটি সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
    navMenu: NAV_MENU,
    editorialBoard: EDITORIAL_BOARD,
    contact: CONTACT
  });
});

app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`পয়স্তি সাহিত্য ম্যাগাজিন সার্ভার রানিং!`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`=============================================`);
});

module.exports = app;
