/**
 * Smart Bilingual (Bengali + English) Keyword & Tag Extractor
 * Optimized for Bengali Content, Tech, Review, Crypto, Lifestyle & Product Articles
 */

const { generateEnglishSlug } = require('./slugify');

// Exhaustive Bengali Stopwords, Function Words, Auxiliary Verbs, and Generic Fillers
const BANGLA_STOPWORDS = new Set([
  // Conjunctions, Pronouns, Prepositions
  'এবং', 'ও', 'বা', 'কিন্তু', 'অথবা', 'নতুবা', 'যদি', 'তবে', 'কারণ', 'যেহেতু',
  'জন্য', 'কারণে', 'থেকে', 'হতে', 'চেয়ে', 'দ্বারা', 'দিয়ে', 'নিয়ে', 'সাথে',
  'এই', 'সেই', 'ওই', 'এটি', 'সেটি', 'ঐটি', 'এগুলো', 'সেগুলো', 'ঐগুলো', 'এখানে', 'সেখানে',
  'কোনো', 'কিছু', 'অনেক', 'সব', 'সকল', 'সবাই', 'উভয়', 'প্রত্যেক', 'অন্য', 'অন্যান্য',
  'আমি', 'আমরা', 'তুমি', 'তোমরা', 'তিনি', 'তারা', 'সে', 'যে', 'যা', 'যার', 'যাদের', 'যাকে',
  'নিজে', 'নিজের', 'নিজেদের', 'পরস্পর', 'কেহ', 'কারো', 'কাউকে', 'যেকোনো', 'কিছুটা',
  
  // Verbs, Auxiliary & State Words
  'করতে', 'করার', 'করে', 'করি', 'করেন', 'করবেন', 'করছিল', 'করা', 'করেছে', 'করছে', 'করুন', 'করবে',
  'হলো', 'হল', 'হয়েছে', 'হচ্ছে', 'হবে', 'হয়', 'হন', 'হলে', 'হওয়া', 'হওয়ার', 'হওয়ারপর', 'হলে',
  'ছিল', 'ছিলেন', 'থাকে', 'থাকেন', 'থাকবে', 'আছে', 'আছেন', 'নেই', 'নাই', 'না', 'নয়', 'নহে',
  'পারে', 'পারেন', 'পারা', 'পারবে', 'পাবেন', 'যায়', 'যাবে', 'যাওয়া', 'গেছে', 'গিয়েছে',
  'বলা', 'বলে', 'বলেন', 'বলছেন', 'দেখা', 'দেখে', 'দেখছেন', 'দেওয়া', 'দেয়', 'নেওয়া', 'নেয়',
  'জানা', 'জানি', 'জানেন', 'জানান', 'জানতে', 'বোঝা', 'বুঝতে', 'ধরা', 'ধরতে', 'রাখা', 'রাখতে',
  'পড়া', 'পড়তে', 'ওঠা', 'উঠে', 'নামা', 'নামতে', 'চলুন', 'জানুন', 'যাক', 'আসুন',

  // Question Words & Particles
  'কী', 'কে', 'কেন', 'কিভাবে', 'কীভাবে', 'কখন', 'কোথায়', 'কোন্', 'কোন', 'কত', 'কতো',
  'কি', 'নাকি', 'তো', 'ই', 'ও', 'মাত্র', 'মতো', 'মতন', 'মতোই', 'যেন', 'বাস্তবে', 'সত্যি', 'সত্যেই', 'সত্যিকারের',

  // Quantifiers, Generic Adjectives, Numbers & Time Fillers
  'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ', 'শত', 'হাজার', 'লাখ', 'কোটি', 'মিলিয়ন', 'বিলিয়ন',
  'প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম',
  'একটি', 'দুটি', 'তিনটি', 'চারটি', 'পাঁচটি', 'ছয়টি', 'সাতটি', 'আটটি', 'নয়টি', 'দশটি',
  'টি', 'টা', 'খানা', 'খানি', 'জন', 'টাকা', 'টাকার', 'ডলার', 'ডলারের', 'শতাংশ', 'পারসেন্ট',
  'খুব', 'বেশি', 'কম', 'অল্প', 'আরো', 'আরও', 'ছাড়া', 'ব্যতীত', 'ছাড়া', 'বাদে', 'ছাড়া',
  'বড়', 'ছোট', 'নতুন', 'পুরাতন', 'পুরনো', 'ভালো', 'খারাপ', 'উচ্চ', 'নিচু', 'সহজ', 'কঠিন',
  'সাম্প্রতিক', 'বর্তমান', 'বর্তমানে', 'অতীত', 'ভবিষ্যৎ', 'ভবিষ্যতে', 'আজ', 'আজকে', 'কাল', 'আগামীকাল',
  'বছর', 'বছরের', 'মাস', 'মাসের', 'দিন', 'দিনের', 'সপ্তাহ', 'সপ্তাহের', 'সময়', 'সময়ে', 'কালের', 'কাল',
  'সালের', 'সাল', 'সালে', 'সেরা', 'তালিকা', 'রিভিউ', 'দাম', 'বাজেট', 'বাজেটে', 'মূল্য',
  'উত্থান', 'পতন', 'গতি', 'বৃদ্ধি', 'হ্রাস', 'কারণ', 'পেছনে', 'সামনে', 'আগে', 'পরে',
  'কথা', 'বিষয়', 'কাজের', 'পদ্ধতি', 'নিয়ম', 'টিপস', 'তথ্য', 'প্রতিবেদন', 'খবর', 'সংবাদ',
  'সবচেয়ে', 'অন্যতম', 'আজকের', 'আমাদের', 'আপনার', 'তাদের', 'মাধ্যমে', 'ক্ষেত্রে', 'হিসেবে', 'হিসাবে',
  'পর্যন্ত', 'অনুযায়ী', 'অনুসারে', 'তুলনামূলক', 'সঠিক', 'ভুল', 'দরকার', 'প্রয়োজন', 'উচিত',
  'মার্কেট', 'বাজার', 'দোকান', 'কোম্পানি', 'ব্র্যান্ড', 'ব্যবসা', 'গ্রাহক', 'মানুষ', 'ব্যক্তি',
  'প্রাইস', 'বাংলাদেশ', 'বিডি', 'ইন', 'অনলাইন', 'কিনুন', 'কেনাকাটা', 'গাইড', 'শেষ', 'শুরু'
]);

// English Stopwords List
const ENGLISH_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'aren', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her',
  'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
  'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not',
  'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'best', 'top', 'review', 'guide', 'price', 'in', 'of',
  'features', 'specifications', 'bangladesh', 'bd', 'buy', 'online', 'overview', 'pros', 'cons',
  'details', 'list', 'latest', 'new', 'cheap', 'budget', 'quality', 'vs', 'comparison', 'rating',
  'high', 'low', 'today', 'yesterday', 'tomorrow', 'week', 'month', 'year', 'days', 'time'
]);

/**
 * Clean text from HTML markup and entities
 */
function stripHtml(html = '') {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Stem common Bengali inflection suffixes to get the root keyword
 * e.g., "বিটকয়েনের" -> "বিটকয়েন", "ক্রিপ্টোতে" -> "ক্রিপ্টো"
 */
function stemBengali(word = '') {
  if (!word || word.length <= 3) return word;
  
  // Normalize Bengali Y / ya characters
  let w = word.replace(/\u09AF\u09BC/g, '\u09DF');

  const suffixes = [
    'গুলোর', 'গুলির', 'গুলো', 'গুলি', 'দেরকে', 'দের',
    'সমূহ', 'গুলোয়', 'গুলিরে',
    'ের', 'র', 'কে', 'তে', 'ে', 'য়', 'য়ে', 'টি', 'টা', 'খানা', 'খানি'
  ];

  for (const suf of suffixes) {
    if (w.endsWith(suf) && (w.length - suf.length) >= 3) {
      const stem = w.slice(0, w.length - suf.length);
      if (!BANGLA_STOPWORDS.has(stem)) {
        return stem;
      }
    }
  }
  return w;
}

/**
 * Extract high-relevance bilingual keywords/tags from post title and content
 * @param {string} title - Post title
 * @param {string} content - Post content (HTML or plain text)
 * @param {number} maxTags - Maximum tags to return (default: 8)
 * @returns {Array<string>} Array of suggested tag strings
 */
function extractBilingualTags(title = '', content = '', maxTags = 8) {
  const scores = new Map();

  function addScore(rawTerm, weight) {
    if (!rawTerm) return;
    let clean = rawTerm.trim();
    clean = clean.replace(/^[\s,।;:|–—\-()[\]{}'"`‘’“”]+|[\s,।;:|–—\-()[\]{}'"`‘’“”]+$/g, '');
    
    // Clean leading/trailing standalone numbers or symbols
    clean = clean.replace(/^[0-9০-৯]+(?:টি|টা|তম|ম|য়|র্থ|ষ্ঠ|শ|শে|ই|র|এর)?\s+/g, '')
                 .replace(/\s+[0-9০-৯]+(?:টি|টা|তম|ম|য়|র্থ|ষ্ঠ|শ|শে|ই|র|এর)?$/g, '')
                 .trim();
    if (clean.length < 2) return;

    // Check if it's pure numbers or number with suffix
    if (/^[0-9০-৯.,\s]+(?:টি|টা|তম|ম|য়|র্থ|ষ্ঠ|শ|শে|ই|র|এর|খানা|খানি)?$/i.test(clean)) return;

    // Stem if it is a single Bengali word
    if (!clean.includes(' ') && /[\u0980-\u09FF]/.test(clean)) {
      clean = stemBengali(clean);
    }

    const lower = clean.toLowerCase();
    if (BANGLA_STOPWORDS.has(clean) || ENGLISH_STOPWORDS.has(lower)) return;

    // Check words in multi-word phrase
    const words = clean.split(/\s+/);
    if (words.length === 1 && (BANGLA_STOPWORDS.has(words[0]) || ENGLISH_STOPWORDS.has(words[0].toLowerCase()) || words[0].length < 3)) {
      return;
    }
    // If every word in the phrase is a stopword, skip
    if (words.every(w => BANGLA_STOPWORDS.has(w) || ENGLISH_STOPWORDS.has(w.toLowerCase()))) {
      return;
    }

    scores.set(clean, (scores.get(clean) || 0) + weight);
  }

  const rawHtml = content || '';
  const plainTitle = stripHtml(title);
  const plainContent = stripHtml(rawHtml);
  const fullText = (plainTitle + ' ' + plainContent).trim();

  // 1. EXTRACT QUOTED TERMS & KEY PHRASES (e.g. ‘ক্রিপ্টো উইন্টার’, "Crypto Spring")
  const quoteRegex = /[‘“"']([^‘“"'”’\n\r]{2,30})[’”"']/g;
  let quoteMatch;
  while ((quoteMatch = quoteRegex.exec(fullText)) !== null) {
    const qTerm = quoteMatch[1].trim();
    if (qTerm.length >= 3 && !BANGLA_STOPWORDS.has(qTerm) && !ENGLISH_STOPWORDS.has(qTerm.toLowerCase())) {
      addScore(qTerm, 24);
    }
  }

  // 2. EXTRACT SPECIFIC ENTITIES & HEADINGS (Headings: <h2>, <h3>, <h4>)
  const headingRegex = /<h[1-4][^>]*>(.*?)<\/h[1-4]>/gi;
  let hMatch;
  while ((hMatch = headingRegex.exec(rawHtml)) !== null) {
    const headingText = stripHtml(hMatch[1]);
    
    // Extract English words or Brand names inside headings (e.g., Binance, ETF, AI)
    const engInHeading = headingText.match(/[A-Z][a-zA-Z0-9]*(?:\s+[A-Z0-9][a-zA-Z0-9]*)*|[A-Z]{2,}/g);
    if (engInHeading) {
      engInHeading.forEach(e => {
        if (!ENGLISH_STOPWORDS.has(e.toLowerCase()) && e.length >= 2) {
          addScore(e, 22);
        }
      });
    }

    // Extract key phrases inside heading if heading contains colon or dash
    if (headingText.includes(':') || headingText.includes('—') || headingText.includes('-')) {
      const parts = headingText.split(/[:—–-]/);
      parts.forEach(p => {
        const cleanP = p.replace(/\?|\!|[\u0964]/g, '').trim();
        if (cleanP.length >= 3 && cleanP.length <= 25 && !BANGLA_STOPWORDS.has(cleanP)) {
          addScore(cleanP, 16);
        }
      });
    }
  }

  // 3. EXTRACT ENGLISH PROPER NOUNS & ACRONYMS (e.g. Binance, Bitcoin, ETF, SEC, BlackRock, AI)
  const englishEntities = fullText.match(/\b(?:[A-Z]{2,}|[A-Z][a-z0-9]+(?:\s+[A-Z0-9][a-z0-9]+){0,2})\b/g);
  if (englishEntities) {
    const entityFreq = new Map();
    englishEntities.forEach(ent => {
      const trimmed = ent.trim();
      if (trimmed.length >= 2 && !ENGLISH_STOPWORDS.has(trimmed.toLowerCase())) {
        entityFreq.set(trimmed, (entityFreq.get(trimmed) || 0) + 1);
      }
    });

    entityFreq.forEach((count, ent) => {
      // Entities that appear multiple times or in title/heading get high priority
      const weight = count >= 2 ? 18 + (count * 2) : 10;
      addScore(ent, weight);
    });
  }

  // 4. EXTRACT DOMAIN KEYWORDS & COMPOUND PHRASES (Crypto, Tech, Finance, Gadgets, Health)
  const DOMAIN_KEYWORDS = [
    // Crypto & Finance
    'বিটকয়েন', 'বিটকয়েন', 'Bitcoin', 'ক্রিপ্টোকারেন্সি', 'ক্রিপ্টো', 'Cryptocurrency', 'Crypto',
    'বিটকয়েন ETF', 'বিটকয়েন ETF', 'Bitcoin ETF', 'স্পট ইটিএফ', 'স্পট বিটকয়েন', 'Spot Bitcoin',
    'ব্লকচেইন', 'Blockchain', 'বাইনান্স', 'Binance', 'ইথেরিয়াম', 'Ethereum', 'Altcoin',
    'ক্রিপ্টো উইন্টার', 'Crypto Winter', 'ক্রিপ্টো স্প্রিং', 'স্পট ট্রেডিং', 'ফিউচারস', 'লিভারেজ',
    'ডিজিটাল সম্পদ', 'শেয়ার বাজার', 'বিনিয়োগ', 'ইনভেস্টমেন্ট', 'ট্রেডার', 'ট্রেডিং',
    'কৃত্রিম বুদ্ধিমত্তা', 'AI', 'Artificial Intelligence',
    // Tech & Gadgets
    'স্মার্টফোন', 'Smartphone', 'স্মার্টওয়াচ', 'Smart Watch', 'স্মার্ট টিভি', 'Smart TV',
    'ল্যাপটপ', 'Laptop', 'ট্যাবলেট', 'গেমিং', 'Gaming', 'প্রোসেসর', 'ক্যামেরা',
    'ইনভার্টার এসি', 'এয়ার কন্ডিশনার', 'মাইক্রোওয়েভ ওভেন', 'রাইস কুকার', 'রেফ্রিজারেটর'
  ];

  DOMAIN_KEYWORDS.forEach(kw => {
    const regex = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
    const matches = fullText.match(regex);
    if (matches && matches.length > 0) {
      addScore(kw, 20 + (matches.length * 3));
    }
  });

  // 5. EXTRACT REPEATED BENGALI NOUN PHRASES (2-word meaningful concepts)
  const cleanBodyForNgrams = plainContent
    .replace(/[‘“"'][^‘“"'”’\n\r]*[’”"']/g, ' ') // exclude quoted parts already handled
    .replace(/[0-9০-৯.,%]+/g, ' ')
    .replace(/[:;?।!–—\-\n\r,]/g, ' , ');

  const tokens = cleanBodyForNgrams.split(/\s+/).map(t => stemBengali(t.trim())).filter(Boolean);
  const phraseCounts = new Map();

  for (let i = 0; i < tokens.length - 1; i++) {
    const w1 = tokens[i];
    const w2 = tokens[i+1];
    if (w1 === ',' || w2 === ',') continue;
    if (w1.length >= 3 && w2.length >= 3 && !BANGLA_STOPWORDS.has(w1) && !BANGLA_STOPWORDS.has(w2)) {
      const phrase = `${w1} ${w2}`;
      phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
    }
  }

  phraseCounts.forEach((count, phrase) => {
    if (count >= 2) {
      addScore(phrase, 12 + (count * 2));
    }
  });

  // 6. FREQUENT STEMMED SINGLE BENGALI NOUNS
  const singleTokenCounts = new Map();
  tokens.forEach(t => {
    if (t !== ',' && t.length >= 3 && !BANGLA_STOPWORDS.has(t) && /[\u0980-\u09FF]/.test(t)) {
      singleTokenCounts.set(t, (singleTokenCounts.get(t) || 0) + 1);
    }
  });

  singleTokenCounts.forEach((count, token) => {
    if (count >= 3) {
      addScore(token, 8 + count);
    }
  });

  // 7. RANK, FILTER AND DEDUPLICATE
  const sorted = Array.from(scores.entries())
    .filter(([term, score]) => {
      if (!term || term.length < 2) return false;
      const lower = term.toLowerCase();
      if (BANGLA_STOPWORDS.has(term) || ENGLISH_STOPWORDS.has(lower)) return false;
      return true;
    })
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  const finalTags = [];
  const seenLower = new Set();

  for (const tag of sorted) {
    const lowerTag = tag.toLowerCase();

    // Check if this tag is already represented
    if (seenLower.has(lowerTag)) continue;

    // Check if a longer, more specific multi-word version already exists (e.g. skip "বিটকয়েন" if "বিটকয়েন ETF" is already selected, or vice versa if needed)
    const isSubsumed = finalTags.some(existing => {
      const lowerEx = existing.toLowerCase();
      // If one is exact duplicate
      if (lowerEx === lowerTag) return true;
      // If existing is "বিটকয়েন ETF" and current is "ETF", skip "ETF"
      if (lowerEx.includes(lowerTag) && lowerEx.split(/\s+/).length > lowerTag.split(/\s+/).length && lowerTag.length <= 4) {
        return true;
      }
      return false;
    });

    if (!isSubsumed) {
      finalTags.push(tag);
      seenLower.add(lowerTag);
    }

    if (finalTags.length >= maxTags) break;
  }

  return finalTags;
}

/**
 * Parse tags from user input (array or comma-separated string)
 * @param {string|Array} input
 * @returns {Array<string>} Clean unique tag names
 */
function parseTagsInput(input) {
  if (!input) return [];
  let rawList = [];

  if (Array.isArray(input)) {
    rawList = input;
  } else if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        rawList = parsed;
      } else {
        rawList = input.split(/[,,\n\r]+/);
      }
    } catch (e) {
      rawList = input.split(/[,,\n\r]+/);
    }
  }

  const seen = new Set();
  const cleaned = [];

  rawList.forEach(item => {
    if (!item) return;
    const t = String(item).trim().replace(/^#+/, '');
    if (t.length > 0 && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      cleaned.push(t);
    }
  });

  return cleaned;
}

module.exports = {
  extractBilingualTags,
  parseTagsInput
};
