const db = require('../config/database');
const { generateSeoMeta, getBookSchema, getBreadcrumbSchema } = require('../middleware/seo');
const { toBengaliNumber, formatBengaliDate } = require('../middleware/banglaDate');
const { SITE_NAME, TAGLINE, NAV_MENU, EDITORIAL_BOARD, CONTACT } = require('../config/constants');

// All Books Page (/books)
exports.getBooksList = async (req, res) => {
  try {
    const books = await db.prepare('SELECT * FROM books ORDER BY id DESC').all();

    const breadcrumbs = [
      { name: 'প্রচ্ছদ', url: '/' },
      { name: 'পয়স্তি প্রকাশন-এর প্রকাশিত বইসমূহ', url: '/books' }
    ];

    const seo = generateSeoMeta({
      title: 'পয়স্তি প্রকাশন - প্রকাশিত বইসমূহ ও রকমারি সম্ভার',
      description: 'পয়স্তি প্রকাশন থেকে প্রকাশিত জনপ্রিয় সাহিত্য, কবিতা, গল্প, উপন্যাস ও সমকালীন চিন্তার বইসমূহ।',
      url: '/books',
      schema: getBreadcrumbSchema(breadcrumbs)
    });

    res.render('books_list', {
      books,
      seo,
      toBengaliNumber,
      formatBengaliDate,
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  } catch (err) {
    console.error('Error in getBooksList:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি',
      message: 'বইয়ের তালিকা লোড করা যায়নি।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};

// Single Book Page (/book/:slug)
exports.getSingleBook = async (req, res) => {
  try {
    const { slug } = req.params;

    const book = await db.prepare('SELECT * FROM books WHERE slug = ?').get(slug);

    if (!book) {
      return res.status(404).render('error', {
        title: 'বই পাওয়া যায়নি',
        message: 'আপনি যে বইটি খুঁজছেন তা খুঁজে পাওয়া যায়নি।',
        seo: generateSeoMeta({ title: 'বই পাওয়া যায়নি' }),
        navMenu: NAV_MENU,
        editorialBoard: EDITORIAL_BOARD,
        contact: CONTACT
      });
    }

    const otherBooks = await db.prepare('SELECT * FROM books WHERE id != ? ORDER BY id DESC LIMIT 6').all(book.id);

    const breadcrumbs = [
      { name: 'প্রচ্ছদ', url: '/' },
      { name: 'বই সম্ভার', url: '/books' },
      { name: book.title, url: `/book/${book.slug}` }
    ];

    const seo = generateSeoMeta({
      title: `${book.title} - ${book.author_name} | পয়স্তি প্রকাশন`,
      description: book.description || `${book.author_name} রচিত ${book.title} বইটি পয়স্তি প্রকাশন থেকে সরাসরি অর্ডার করুন।`,
      image: book.cover_image,
      url: `/book/${book.slug}`,
      schema: {
        '@context': 'https://schema.org',
        '@graph': [
          getBookSchema(book),
          getBreadcrumbSchema(breadcrumbs)
        ]
      }
    });

    res.render('single_book', {
      book,
      otherBooks,
      seo,
      toBengaliNumber,
      formatBengaliDate,
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  } catch (err) {
    console.error('Error in getSingleBook:', err);
    res.status(500).render('error', {
      title: 'সার্ভার ত্রুটি',
      message: 'বইয়ের বিস্তারিত লোড করা যায়নি।',
      seo: generateSeoMeta({ title: 'সার্ভার ত্রুটি' }),
      navMenu: NAV_MENU,
      editorialBoard: EDITORIAL_BOARD,
      contact: CONTACT
    });
  }
};
