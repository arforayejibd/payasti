module.exports = {
  SITE_NAME: 'পয়স্তি ম্যাগাজিন',
  TAGLINE: 'সাহিত্য স্মারক',
  SITE_SUBTITLE: 'বাংলা সাহিত্য বিষয়ক অনলাইন ম্যাগাজিন',
  SITE_URL: 'https://payasti.com',
  DEFAULT_DESCRIPTION: 'Payasti Magazine is one of the popular Bangali magazine of Bangladesh which publishes Poems, stories, articles, interviews & literary.',
  OG_IMAGE: 'https://payasti.com/content/uploads/2019/03/featured-image.png',
  FB_APP_ID: '560602190786845',
  SEARCH_PLACEHOLDER: 'কবিতা, গল্প, প্রবন্ধ কিংবা যে লেখা খুঁজতে চাচ্ছেন সে লেখার শিরোনাম লিখুন',
  NAV_MENU: [
    { title: 'প্রচ্ছদ', url: '/' },
    { title: 'যারা লিখেছেন', url: '/লেখক-তালিকা' },
    { 
      title: 'গদ্য', 
      url: '/section/গদ্য',
      subcategories: [
        { title: 'অণুগল্প', slug: 'অনুগল্প', url: '/section/গদ্য/অনুগল্প' },
        { title: 'ছোটগল্প', slug: 'ছোটগল্প', url: '/section/গদ্য/ছোটগল্প' },
        { title: 'বড় গল্প', slug: 'বড়-গল্প', url: '/section/গদ্য/বড়-গল্প' }
      ]
    },
    { title: 'পদ্য', url: '/section/পদ্য' },
    { title: 'প্রবন্ধ', url: '/section/প্রবন্ধ' },
    { title: 'অনুবাদ', url: '/section/অনুবাদ' },
    { title: 'ধারাবাহিক', url: '/section/ধারাবাহিক' },
    { title: 'সাক্ষাৎকার', url: '/section/সাক্ষাৎকার' },
    { title: 'অন্য সাহিত্য', url: '/section/অন্য-সাহিত্য' },
    { title: 'বানান শুদ্ধিকরণ', url: '/bangla-spell' }
  ],
  EDITORIAL_BOARD: [
    { role: 'সম্পাদক', name: 'আতিকুর ফরায়েজী' },
    { role: 'নির্বাহী সম্পাদক', name: 'মোস্তাফিজ ফরায়েজী' },
    { role: 'সহযোগী সম্পাদক', name: 'পিন্টু রহমান' },
    { role: 'সহযোগী সম্পাদক', name: 'মাহির তাজওয়ার' }
  ],
  CONTACT: {
    email: 'payastimag@gmail.com',
    phone: '+880 17 44682651',
    facebook: 'https://facebook.com/payastimag'
  },
  CATEGORY_SLUG_MAP: {
    'goddya': 'গদ্য',
    'poddya': 'পদ্য',
    'probondho': 'প্রবন্ধ',
    'onubad': 'অনুবাদ',
    'dharabahik': 'ধারাবাহিক',
    'shakkhatkar': 'সাক্ষাৎকার',
    'onno-shahitto': 'অন্য-সাহিত্য'
  }
};
