module.exports = {
  SITE_NAME: 'সেরা ১০',
  SITE_ENGLISH_NAME: 'Sera 10',
  TAGLINE: 'নির্ভরযোগ্য প্রোডাক্ট রিভিউ ও সেরা ১০ তালিকা',
  SITE_SUBTITLE: 'সেরা ১০ গ্যাজেট, ইলেকট্রনিক্স, বই এবং লাইফস্টাইল রিভিউ পোর্টাল',
  SITE_URL: 'https://sera10.com',
  DEFAULT_DESCRIPTION: 'সেরা ১০ (Sera 10) বাংলাদেশের শীর্ষস্থানীয় প্রোডাক্ট রিভিউ, শীর্ষ ১০ তালিকা এবং নিরপেক্ষ কেনাকাটার গাইড পোর্টাল।',
  OG_IMAGE: 'https://sera10.com/wp-content/uploads/2024/01/20240118_102541.png',
  FB_APP_ID: '',
  SEARCH_PLACEHOLDER: 'সেরা স্মার্টওয়াচ, বই, গ্যাজেট বা যেকোনো প্রোডাক্ট রিভিউ খুঁজুন...',
  
  // High-converting affiliate disclosure
  AFFILIATE_DISCLOSURE: 'বিজ্ঞপ্তি: সেরা ১০ একটি নিরপেক্ষ রিভিউ ও গাইড ওয়েবসাইট। আমাদের আর্টিকেলের কিছু এফিলিয়েট লিঙ্কের মাধ্যমে কেনাকাটা করলে আমরা কমিশন পেতে পারি, যা সাইট পরিচালনার খরচ মেটাতে সাহায্য করে— তবে এতে আপনার কেনাকাটার মূল্যে কোনো অতিরিক্ত খরচ হবে না।',

  NAV_MENU: [
    { title: 'হোম', url: '/' },
    { 
      title: 'সেরা ১০ তালিকা', 
      url: '/category/sera-10-lists',
      slug: 'sera-10-lists'
    },
    { 
      title: 'টেক ও গ্যাজেট', 
      url: '/category/tech',
      slug: 'tech',
      subcategories: [
        { title: 'স্মার্টওয়াচ ও এক্সেসরিজ', slug: 'tech', url: '/category/tech' },
        { title: 'টুলস ও গ্যাজেটস', slug: 'tools', url: '/category/tools' }
      ]
    },
    { 
      title: 'বই রিভিউ', 
      url: '/category/books',
      slug: 'books'
    },
    { 
      title: 'বিউটি ও বেবি কেয়ার', 
      url: '/category/beauty-and-personal-care',
      slug: 'beauty-and-personal-care',
      subcategories: [
        { title: 'বেবি প্রোডাক্টস', slug: 'baby-products', url: '/category/baby-products' },
        { title: 'পার্সোনাল কেয়ার', slug: 'beauty-and-personal-care', url: '/category/beauty-and-personal-care' }
      ]
    },
    { 
      title: 'লাইফস্টাইল ও হেলথ', 
      url: '/category/health-and-wellness',
      slug: 'health-and-wellness',
      subcategories: [
        { title: 'ফুড ও রেসিপি', slug: 'food', url: '/category/food' },
        { title: 'ট্রাভেল ও কান্ট্রি', slug: 'travel', url: '/category/travel' }
      ]
    },
    { 
      title: 'স্পোর্টস ও মুভি', 
      url: '/category/football',
      slug: 'football',
      subcategories: [
        { title: 'ফুটবল', slug: 'football', url: '/category/football' },
        { title: 'মুভি ও এন্টারটেইনমেন্ট', slug: 'movie', url: '/category/movie' }
      ]
    },
    { title: 'ব্লগ', url: '/category/blog', slug: 'blog' }
  ],

  EDITORIAL_BOARD: [
    { role: 'প্রধান সম্পাদক ও গবেষক', name: 'আতিকুর ফরায়েজী' },
    { role: 'টেক রিভিউয়ার', name: 'সেরা ১০ টেক টিম' }
  ],

  CONTACT: {
    email: 'info@sera10.com',
    phone: '+880 17 44682651',
    facebook: 'https://facebook.com/sera10bd'
  },

  CATEGORY_SLUG_MAP: {
    'sera-10-lists': 'সেরা ১০ তালিকা',
    'tech': 'টেক ও গ্যাজেট',
    'books': 'বই রিভিউ',
    'blog': 'ব্লগ',
    'football': 'ফুটবল',
    'beauty-and-personal-care': 'বিউটি ও পার্সোনাল কেয়ার',
    'movie': 'মুভি',
    'health-and-wellness': 'স্বাস্থ্য ও লাইফস্টাইল',
    'baby-products': 'বেবি প্রোডাক্টস',
    'fashion': 'ফ্যাশন',
    'food': 'খাবার ও ফুড',
    'travel': 'ভ্রমণ',
    'tools': 'টুলস ও যন্ত্রপাতি'
  }
};
