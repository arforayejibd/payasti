/**
 * Bengali & Multilingual to Clean English URL Slug Generator
 * Converts Bengali phonetics, compound conjuncts, English terms and numbers
 * into clean, SEO-friendly, URL-safe English slugs (e.g. "sera-10-mobile-phone-price-in-bd").
 */

const commonKeywords = [
  { regex: /রিভিউ/gi, rep: 'review' },
  { regex: /প্রাইস/gi, rep: 'price' },
  { regex: /সেরা/gi, rep: 'sera' },
  { regex: /তালিকা/gi, rep: 'talika' },
  { regex: /বাংলাদেশ/gi, rep: 'bangladesh' },
  { regex: /মোবাইল/gi, rep: 'mobile' },
  { regex: /ফোন/gi, rep: 'phone' },
  { regex: /ফিচার/gi, rep: 'feature' },
  { regex: /ক্যামেরা/gi, rep: 'camera' },
  { regex: /ব্যাটারি/gi, rep: 'battery' },
  { regex: /ল্যাপটপ/gi, rep: 'laptop' },
  { regex: /কম্পিউটার/gi, rep: 'computer' },
  { regex: /স্মার্টফোন/gi, rep: 'smartphone' },
  { regex: /স্মার্টওয়াচ|স্মার্টওয়াচ/gi, rep: 'smartwatch' },
  { regex: /ঘড়ি|ঘড়ি/gi, rep: 'ghori' },
  { regex: /টিভি/gi, rep: 'tv' },
  { regex: /দাম/gi, rep: 'dam' },
  { regex: /নতুন/gi, rep: 'notun' },
  { regex: /কেন/gi, rep: 'keno' },
  { regex: /কেমন/gi, rep: 'kemon' },
  { regex: /ভালো/gi, rep: 'bhalo' },
  { regex: /জন্য/gi, rep: 'jonno' },
  { regex: /সম্পর্কে/gi, rep: 'somporke' },
  { regex: /উপন্যাস/gi, rep: 'uponnash' },
  { regex: /গল্প/gi, rep: 'golpo' },
  { regex: /বই/gi, rep: 'boi' },
  { regex: /লেখক/gi, rep: 'lekhok' },
  { regex: /অনলাইন/gi, rep: 'online' },
  { regex: /অফার/gi, rep: 'offer' },
  { regex: /ডিসকাউন্ট/gi, rep: 'discount' },
  { regex: /ওয়ালটন|ওয়ালটন/gi, rep: 'walton' },
  { regex: /স্যামসাং/gi, rep: 'samsung' },
  { regex: /শাওমি/gi, rep: 'xiaomi' },
  { regex: /রিয়েলমি|রিয়েলমি/gi, rep: 'realme' },
  { regex: /অ্যাপল/gi, rep: 'apple' },
  { regex: /আইফোন/gi, rep: 'iphone' },
  { regex: /টি/g, rep: 'ti' },
  { regex: /গুলো/g, rep: 'gulo' },
  { regex: /এবং/g, rep: 'ebong' }
];

const conjuncts = [
  [/ক্ষ্ম/g, 'kkhm'],
  [/ক্ষ/g, 'kkh'],
  [/জ্ঞ/g, 'gg'],
  [/ষ্ণ/g, 'shn'],
  [/ষ্ঠ/g, 'shth'],
  [/ষ্ট/g, 'st'],
  [/স্ফ/g, 'sph'],
  [/স্থ/g, 'sth'],
  [/স্ত/g, 'st'],
  [/স্প/g, 'sp'],
  [/স্ক্র/g, 'skr'],
  [/স্ক/g, 'sk'],
  [/স্খ/g, 'skh'],
  [/স্ব/g, 'sw'],
  [/স্ম/g, 'sm'],
  [/শ্র/g, 'shr'],
  [/শ্ল/g, 'shl'],
  [/শ্ব/g, 'shw'],
  [/শ্ম/g, 'shm'],
  [/ষ্প/g, 'shp'],
  [/ষ্ফ/g, 'shph'],
  [/ষ্ক/g, 'shk'],
  [/প্ত/g, 'pt'],
  [/প্ট/g, 'pt'],
  [/প্স/g, 'ps'],
  [/প্ল/g, 'pl'],
  [/প্র/g, 'pr'],
  [/ব্দ/g, 'bd'],
  [/ব্ধ/g, 'bdh'],
  [/ব্ব/g, 'bb'],
  [/ব্ল/g, 'bl'],
  [/ব্র/g, 'br'],
  [/ভ্র/g, 'bhr'],
  [/ম্ন/g, 'mn'],
  [/ম্প/g, 'mp'],
  [/ম্ফ/g, 'mph'],
  [/ম্ব/g, 'mb'],
  [/ম্ভ/g, 'mbh'],
  [/ম্ম/g, 'mm'],
  [/ম্ল/g, 'ml'],
  [/ম্র/g, 'mr'],
  [/ল্ক/g, 'lk'],
  [/ল্গ/g, 'lg'],
  [/ল্ট/g, 'lt'],
  [/ল্ড/g, 'ld'],
  [/ল্প/g, 'lp'],
  [/ল্ফ/g, 'lph'],
  [/ল্ব/g, 'lb'],
  [/ল্ম/g, 'lm'],
  [/ল্ল/g, 'll'],
  [/ন্ত/g, 'nt'],
  [/ন্থ/g, 'nth'],
  [/ন্দ/g, 'nd'],
  [/ন্ধ/g, 'ndh'],
  [/ন্ন/g, 'nn'],
  [/ন্ম/g, 'nm'],
  [/ক্ট/g, 'kt'],
  [/ক্ত/g, 'kt'],
  [/ক্ব/g, 'kw'],
  [/ক্ক/g, 'kk'],
  [/ক্র/g, 'kr'],
  [/ক্ল/g, 'kl'],
  [/গ্ধ/g, 'gdh'],
  [/গ্ন/g, 'gn'],
  [/গ্ব/g, 'gw'],
  [/গ্র/g, 'gr'],
  [/গ্ল/g, 'gl'],
  [/ঙ্ক/g, 'nk'],
  [/ঙ্ক্ষ/g, 'nkkh'],
  [/ঙ্খ/g, 'nkh'],
  [/ঙ্গ/g, 'ng'],
  [/ঙ্ঘ/g, 'ngh'],
  [/চ্চ/g, 'cch'],
  [/চ্ছ/g, 'cchh'],
  [/চ্ছ্ব/g, 'cchw'],
  [/জ্জ/g, 'jj'],
  [/জ্জ্ব/g, 'jjw'],
  [/ঝ্ঝ/g, 'jhjh'],
  [/ঞ্চ/g, 'nch'],
  [/ঞ্ছ/g, 'nchh'],
  [/ঞ্জ/g, 'nj'],
  [/ট্ট/g, 'tt'],
  [/ট্ব/g, 'tw'],
  [/ট্র/g, 'tr'],
  [/ড্ড/g, 'dd'],
  [/ড্র/g, 'dr'],
  [/ণ্ট/g, 'nt'],
  [/ণ্ঠ/g, 'nth'],
  [/ণ্ড/g, 'nd'],
  [/ণ্ণ/g, 'nn'],
  [/ত্ন/g, 'tn'],
  [/ত্ব/g, 'tw'],
  [/ত্ম/g, 'tm'],
  [/ত্য/g, 'ty'],
  [/ত্র/g, 'tr'],
  [/থ্ব/g, 'thw'],
  [/থ্র/g, 'thr'],
  [/দ্গ/g, 'dg'],
  [/দ্ঘ/g, 'dgh'],
  [/দ্দ/g, 'dd'],
  [/দ্ধ/g, 'ddh'],
  [/দ্ব/g, 'dw'],
  [/দ্ভ/g, 'dbh'],
  [/দ্ম/g, 'dm'],
  [/দ্র/g, 'dr'],
  [/ধ্ব/g, 'dhw'],
  [/ধ্র/g, 'dhr'],
  [/হ্ণ/g, 'hn'],
  [/হ্ন/g, 'hn'],
  [/হ্ম/g, 'hm'],
  [/হ্য/g, 'hy'],
  [/হ্র/g, 'hr'],
  [/হ্ল/g, 'hl'],
  [/হ্ব/g, 'hw']
];

const charMap = {
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
  'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
  'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't', 'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n',
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

function generateEnglishSlug(input) {
  if (!input) return '';
  let str = input.toString().normalize('NFC').trim();

  // If input already contains only ASCII characters and no Bangla, simply clean it
  if (!/[\u0980-\u09FF]/.test(str)) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  // Normalize composite Bangla characters
  str = str.replace(/\u09AF\u09BC/g, 'য়'); // ja + nukta -> ya
  str = str.replace(/\u09A1\u09BC/g, 'ড়'); // da + nukta -> ra
  str = str.replace(/\u09A2\u09BC/g, 'ঢ়'); // dha + nukta -> rha

  // Replace popular keywords
  for (let i = 0; i < commonKeywords.length; i++) {
    str = str.replace(commonKeywords[i].regex, ' ' + commonKeywords[i].rep + ' ');
  }

  // W / Y syllables
  str = str
    .replace(/ওয়া|ওয়া/g, 'wa')
    .replace(/ওয়ে|ওয়ে/g, 'we')
    .replace(/ওয়াই|ওয়াই/g, 'wai')
    .replace(/ওয়|ওয়/g, 'w')
    .replace(/য়া|য়া/g, 'ya')
    .replace(/য়ে|য়ে/g, 'ye')
    .replace(/য়|য়/g, 'y');

  // Replace conjuncts
  for (let i = 0; i < conjuncts.length; i++) {
    str = str.replace(conjuncts[i][0], conjuncts[i][1]);
  }

  // Replace individual characters
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (charMap[ch] !== undefined) {
      out += charMap[ch];
    } else if (ch === '্') {
      continue;
    } else {
      out += ch;
    }
  }

  return out
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

module.exports = {
  generateEnglishSlug
};
