const fs = require('fs');
const path = require('path');

const validWordsPath = path.join(__dirname, '../public/data/bangla_wordlist_80k.json');
const dictionaryPath = path.join(__dirname, '../public/data/bangla_spelling_dictionary.json');
const sqlBackupPath = path.join(__dirname, '../data/payasti_live_backup.sql');

function normalizeBengaliUnicode(str) {
  if (!str) return '';
  return str
    .normalize('NFC')
    .replace(/\u09AF\u09BC/g, 'য়')
    .replace(/\u09A1\u09BC/g, 'ড়')
    .replace(/\u09A2\u09BC/g, 'ঢ়')
    .replace(/\u0985\u09BE/g, 'আ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/া্ও/g, 'াও')
    .replace(/া্য়া/g, 'ায়া')
    .replace(/াাঁ/g, 'াঁ');
}

// 1. Load existing words
let existingWords = [];
if (fs.existsSync(validWordsPath)) {
  existingWords = JSON.parse(fs.readFileSync(validWordsPath, 'utf8'));
}

const wordSet = new Set(existingWords.map(normalizeBengaliUnicode));

// 2. Extract words from Payasti Live Database Backup
if (fs.existsSync(sqlBackupPath)) {
  const sql = fs.readFileSync(sqlBackupPath, 'utf8');
  const sqlWords = sql.match(/[\u0980-\u09FF\u200B-\u200D\uFEFF]+/g) || [];
  sqlWords.forEach(w => {
    const norm = normalizeBengaliUnicode(w.trim());
    if (norm.length >= 2) {
      wordSet.add(norm);
    }
  });
  console.log(`Added words from SQL backup. Word count now: ${wordSet.size}`);
}

// 3. Comprehensive Bengali Verb Roots & Conjugation Engine
const VERB_ROOTS = [
  // Primary monosyllabic and disyllabic verbs
  'কর', 'বল', 'চল', 'পড়', 'লিখ', 'দেখ', 'শোন', 'জান', 'মান', 'ভাব', 'খাও', 'যাও', 'হও', 'দে', 'নে',
  'থাক', 'আস', 'বস', 'ঘুমা', 'হাস', 'কাঁদ', 'উড়', 'ঘুর', 'খুল', 'ছুট', 'কাট', 'মার', 'মর', 'জিত', 'হার',
  'ডাক', 'লাগ', 'রাখ', 'ঢুক', 'বের', 'ফির', 'পাঠা', 'সাজ', 'ভাঙ', 'গড়', 'চিন', 'বুঝ', 'ধর', 'ছাড়',
  'বাঁচ', 'টান', 'ঠেকা', 'মেলা', 'পোড়া', 'ডোবা', 'ভাস', 'ওঠ', 'নাম', 'তোল', 'আঁক', 'মুছ', 'ধো', 'শো',
  'শিখ', 'পড়া', 'দেখা', 'বলা', 'কওয়া', 'বোঝা', 'চেনা', 'জানা', 'হারা', 'জিতা', 'দৌড়া', 'লাফা', 'চাপা',
  'গলা', 'জ্বালা', 'নেভা', 'ফোটা', 'ঝরা', 'ভাসা', 'ডোবা', 'ডুবা', 'কুড়া', 'খোঁচ', 'খোঁচা', 'গুঁতা',
  'চুষ', 'চোষা', 'কামড়া', 'চিবো', 'চিবানো', 'চাখা', 'মেপে', 'মাপ', 'মাপা', 'বাঁধ', 'বাঁধা', 'সাধ', 'সাধা',
  'যাচ', 'যাচনা', 'পূজা', 'পূজ', 'পুড়', 'পোড়া', 'কাটা', 'ছাঁটা', 'বাছা', 'ঘঁষা', 'ঘষা', 'ঘসা',
  'পিষ', 'পেষা', 'মাড়া', 'মাড়ানো', 'নাড়া', 'নাড়ানো', 'ঝাড়া', 'ঝাড়ানো', 'ঝাড়', 'তাড়া', 'তাড়ানো',
  'পাল্টা', 'পাল্টানো', 'উল্টা', 'উল্টানো', 'পাল্লা', 'হাঁটা', 'হাঁট', 'দৌড়', 'হাঁপা', 'হাঁপানো',
  'কাঁপা', 'কাঁপ', 'ঝুলা', 'ঝুল', 'ঝোলা', 'ডোবা', 'ভাসা', 'ভিজ', 'ভেজা', 'শুক', 'শুকানো', 'শোক',
  'জাগ', 'জাগা', 'জাগানো', 'ঘুমা', 'ঘুম', 'জড়া', 'জড়ানো', 'ছড়া', 'ছড়ানো', 'পোক', 'পাক', 'পাকা', 'পাকানো',
  'রাঁধ', 'রাঁধা', 'রান্না', 'ফোড়', 'ফোড়ন', 'ভাজ', 'ভাজা', 'সেদ্ধ', 'সিদ্ধ', 'পোড়া', 'পোড়ানো',
  'কষা', 'কষানো', 'গুল', 'গোলা', 'গলানো', 'চটকা', 'চটকানো', 'মাখ', 'মাখা', 'মাখানো'
];

// Verb Endings (Past, Present, Future, Conditional, Negative, Emphatic)
const VERB_ENDINGS = [
  // Present
  'ি', 'িস', 'ো', 'েন', 'ে', 'ুক', 'ুন', 'বেন', 'বেনই', 'বেনও',
  'ছি', 'ছিস', 'ছো', 'ছে', 'ছেন', 'ছেনই', 'ছেনও',
  'চ্ছি', 'চ্ছিস', 'চ্ছো', 'চ্ছে', 'চ্ছেন',
  // Past
  'লাম', 'লি', 'লে', 'লো', 'ল', 'লেন', 'লেনই', 'লেনও',
  'িলাম', 'িলি', 'িলে', 'িল', 'িলেন',
  'ছিলাম', 'ছিলি', 'ছিলে', 'ছিল', 'ছিলেন', 'ছিলেনই', 'ছিলেনও',
  'তাম', 'তিস', 'তে', 'তো', 'তেন', 'তেনই', 'তেনও',
  'িতাম', 'িতিস', 'িতে', 'িত', 'িতেন',
  // Future
  'ব', 'বি', 'বে', 'বেন', 'বই', 'বেই', 'বেও', 'বেনও',
  'িব', 'িবে', 'িবেন',
  // Non-finite
  'তে', 'তেই', 'তেও', 'লে', 'লেই', 'লেও', 'য়ে', 'য়েই', 'য়েও', 'িয়া', 'িলে', 'িতে',
  // Causative
  'ানো', 'ায়', 'ান', 'াবে', 'াব', 'ালে', 'ালাম', 'াল', 'ালেন', 'াচ্ছিল', 'াচ্ছিলেন', 'িয়েছেন', 'িয়েছে', 'িয়েছি',
  // Negative
  'নি', 'নিই', 'নিও', 'না', 'নাই', 'নাতো', 'নে'
];

VERB_ROOTS.forEach(root => {
  wordSet.add(root);
  VERB_ENDINGS.forEach(ending => {
    wordSet.add(root + ending);
    // Vowel harmony variants
    if (root.endsWith('া') && ending.startsWith('া')) {
      wordSet.add(root.slice(0, -1) + ending);
    }
    if (root.endsWith('ে') && ending.startsWith('ে')) {
      wordSet.add(root.slice(0, -1) + ending);
    }
  });
});

console.log(`Generated verb conjugations. Word count now: ${wordSet.size}`);

// 4. Case Inflection Generator for Top Base Nouns & Pronouns
const NOUN_BASES = [
  // Literary, Cultural, Everyday, Anatomy, Abstract
  'কবিতা', 'গল্প', 'উপন্যাস', 'নাটক', 'প্রবন্ধ', 'সাহিত্য', 'লেখক', 'কবি', 'পাঠক', 'সমালোচক',
  'মন', 'হৃদয়', 'অন্তর', 'আত্মা', 'দেহ', 'শরীর', 'প্রাণ', 'জীবন', 'মৃত্যু', 'প্রেম', 'ভালোবাসা',
  'বিরহ', 'বেদনা', 'কষ্ট', 'আনন্দ', 'সুখ', 'শান্তি', 'দ্রোহ', 'বিপ্লব', 'সংগ্রাম', 'আন্দোলন',
  'সমাজ', 'ধর্ম', 'রাজনীতি', 'সংস্কৃতি', 'অর্থনীতি', 'দর্শন', 'বিজ্ঞান', 'ইতিহাস', 'ঐতিহ্য',
  'নারী', 'পুরুষ', 'শিশু', 'কিশোর', 'যুবক', 'বৃদ্ধ', 'মানুষ', 'মানব', 'মনুষ্যত্ব', 'ব্যক্তিত্ব',
  'বিশ্ব', 'মহাবিশ্ব', 'পৃথিবী', 'আকাশ', 'বাতাস', 'নদী', 'সাগর', 'সমুদ্র', 'পাহাড়', 'পর্বত', 'বন', 'জঙ্গল',
  'সূর্য', 'চন্দ্র', 'চাঁদ', 'তারা', 'নক্ষত্র', 'গ্রহ', 'উপগ্রহ', 'মহাকাশ', 'দিগন্ত', 'প্রকৃতি',
  'চোখ', 'নয়ন', 'আঁখি', 'কান', 'নাক', 'মুখ', 'হাত', 'পা', 'বুক', 'মাথা', 'মস্তিষ্ক', 'রক্ত',
  'বীর্য', 'যোনি', 'যৌনাঙ্গ', 'জঠর', 'জরায়ু', 'ভ্রূণ', 'গর্ভ', 'স্তন', 'হাড়', 'মাংস', 'চামড়া',
  'ঈশ্বর', 'খোদা', 'আল্লাহ', 'ভগবান', 'দেবতা', 'দেবী', 'স্বর্গ', 'নরক', 'বেহেশত', 'দোজখ',
  'ঘর', 'বাড়ি', 'নগর', 'শহর', 'গ্রাম', 'দেশ', 'বিদেশ', 'রাষ্ট্র', 'সরকার', 'আইন', 'আদালত',
  'বই', 'কাগজ', 'কলম', 'কালি', 'খাতা', 'শব্দ', 'বাক্য', 'অর্থ', 'ভাব', 'ভাষা', 'স্বরলিপি',
  'গোলাপ', 'পাপড়ি', 'ফুল', 'পাতা', 'গাছ', 'শাখা', 'মূল', 'ফল', 'বীজ', 'সৌরভ', 'গন্ধ',
  'রাত', 'দিন', 'সন্ধ্যা', 'সকাল', 'দুপুর', 'বিকাল', 'ভোর', 'কাল', 'সময়', 'মুহূর্ত', 'যুগ',
  'রূপ', 'রং', 'বর্ণ', 'গন্ধ', 'রস', 'শব্দ', 'স্পর্শ', 'অনুভব', 'অনুভূতি', 'স্মৃতি', 'স্বপ্ন'
];

const NOUN_SUFFIXES = [
  '', 'টি', 'টা', 'খানা', 'খানি', 'গুলো', 'গুলি', 'সমূহ', 'রা', 'দের', 'দেরকে', 'দেরও', 'দেরই',
  'র', 'এর', 'য়ের', 'কে', 'তে', 'ে', 'য়ে', 'য়', 'টিতে', 'টাতে', 'টির', 'টার', 'টিকে', 'টাকে',
  'গুলোতে', 'গুলির', 'গুলোর', 'গুলোকে', 'গুলিকেও', 'গুলোকেও',
  'ই', 'ও', 'সহ', 'সহকারে', 'ভিত্তিক', 'বিষয়ক', 'হীন', 'যুক্ত', 'বিশিষ্ট', 'পূর্ণ', 'ময়', 'ময়ী', 'সম'
];

NOUN_BASES.forEach(base => {
  wordSet.add(base);
  NOUN_SUFFIXES.forEach(sfx => {
    wordSet.add(base + sfx);
    if (base.endsWith('া') && sfx.startsWith('ে')) {
      wordSet.add(base.slice(0, -1) + 'ে' + sfx.slice(1));
    }
    if (base.endsWith('ি') && sfx.startsWith('ে')) {
      wordSet.add(base.slice(0, -1) + 'িয়ে' + sfx.slice(1));
    }
  });
});

console.log(`Generated noun inflections. Word count now: ${wordSet.size}`);

// 5. Clean out any obvious wrong spellings according to Bangla Academy Rules:
const blacklistErrors = [
  'প্রচারনা', 'প্রচারনায়', 'আবিস্কার', 'আবিস্কারের', 'আবিস্কারে', 'আবিস্কারকে',
  'পোষ্ট', 'মাষ্টার', 'ষ্টেশন', 'ঘোষনা', 'বর্ননা', 'আচরন', 'ধারন', 'কারন',
  'পরিনতি', 'পরিনাম', 'প্রেরনা', 'উচ্চারন', 'নির্ধারন', 'নিরীক্ষন', 'লক্ষন',
  'ভ্রুণ', 'ভ্রুন', 'পুরষ্কার', 'ধরণ', 'ঝরণা', 'কোরাণ', 'কর্ণার', 'গুণ্ডা',
  'লণ্ডভণ্ড', 'রাণী', 'পরাণ', 'সোনালী', 'রূপালী', 'বর্ণালী', 'নিয়মাবলী',
  'শ্রদ্ধাঞ্জলী', 'প্রতিযোগীতা', 'সহযোগীতা', 'আইনজিবি', 'চাকরিজিবি'
];

blacklistErrors.forEach(err => {
  wordSet.delete(err);
  wordSet.delete(normalizeBengaliUnicode(err));
});

const finalValidWordsList = Array.from(wordSet).filter(w => {
  if (!w || w.length < 2) return false;
  // Exclude single character punctuation / garbage
  if (/^[^\u0980-\u09FF]/.test(w)) return false;
  return true;
}).sort();

console.log(`Final total valid words in vocabulary: ${finalValidWordsList.length}`);
fs.writeFileSync(validWordsPath, JSON.stringify(finalValidWordsList), 'utf8');

// 6. Enrich Bangla Academy Spelling Rules Dictionary
const currentDict = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
const wordsMap = Object.assign({}, currentDict.words);

// Add all direct grammar & natwa mappings
const ACADEMY_RULES = {
  'প্রচারনা': { correct: ['প্রচারণা'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর তৎসম শব্দে মূর্ধন্য 'ণ' হবে।" },
  'প্রচারনায়': { correct: ['প্রচারণায়'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর তৎসম শব্দে মূর্ধন্য 'ণ' হবে।" },
  'প্রচারনার': { correct: ['প্রচারণার'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর তৎসম শব্দে মূর্ধন্য 'ণ' হবে।" },
  'ঘোষনা': { correct: ['ঘোষণা'], reason: "ণ-ত্ব বিধান অনুযায়ী 'ষ'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'বর্ননা': { correct: ['বর্ণনা'], reason: "ণ-ত্ব বিধান অনুযায়ী রেফ ('র্')-এর পর মূর্ধন্য 'ণ' হবে।" },
  'আচরন': { correct: ['আচরণ'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'ধারন': { correct: ['ধারণ'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'কারন': { correct: ['কারণ'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'গ্রহন': { correct: ['গ্রহণ'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'মরন': { correct: ['মরণ'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'চরন': { correct: ['চরণ'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'স্মরন': { correct: ['স্মরণ'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'পরিনতি': { correct: ['পরিণতি'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'পরিনাম': { correct: ['পরিণাম'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'প্রেরনা': { correct: ['প্রেরণা'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'উচ্চারন': { correct: ['উচ্চারণ'], reason: "ণ-ত্ব বিধান অনুযায়ী 'র'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'নির্ধারন': { correct: ['নির্ধারণ'], reason: "ণ-ত্ব বিধান অনুযায়ী রেফের পর মূর্ধন্য 'ণ' হবে।" },
  'নিরীক্ষন': { correct: ['নিরীক্ষণ'], reason: "ণ-ত্ব বিধান অনুযায়ী 'ক্ষ'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'লক্ষন': { correct: ['লক্ষণ'], reason: "ণ-ত্ব বিধান অনুযায়ী 'ক্ষ'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'রক্ষনাবেক্ষন': { correct: ['রক্ষণাবেক্ষণ'], reason: "ণ-ত্ব বিধান অনুযায়ী 'ক্ষ'-এর পর মূর্ধন্য 'ণ' হবে।" },
  'ভ্রুণ': { correct: ['ভ্রূণ'], reason: "সংস্কৃত তৎসম শব্দে দীর্ঘ-ঊকার (ূ) ও মূর্ধন্য 'ণ' হবে ('ভ্রূণ')।" },
  'ভ্রুন': { correct: ['ভ্রূণ'], reason: "সংস্কৃত তৎসম শব্দে দীর্ঘ-ঊকার (ূ) ও মূর্ধন্য 'ণ' হবে ('ভ্রূণ')।" },
  'আবিস্কার': { correct: ['আবিষ্কার'], reason: "ষ-ত্ব বিধান অনুযায়ী ই-কারান্ত উপসর্গের পর ক-এর সাথে মূর্ধন্য 'ষ' হবে।" },
  'আবিস্কারের': { correct: ['আবিষ্কারের'], reason: "ষ-ত্ব বিধান অনুযায়ী ই-কারান্ত উপসর্গের পর ক-এর সাথে মূর্ধন্য 'ষ' হবে।" },
  'আবিস্কারে': { correct: ['আবিষ্কারে'], reason: "ষ-ত্ব বিধান অনুযায়ী ই-কারান্ত উপসর্গের পর ক-এর সাথে মূর্ধন্য 'ষ' হবে।" },
  'আবিস্কারটি': { correct: ['আবিষ্কারটি'], reason: "ষ-ত্ব বিধান অনুযায়ী ই-কারান্ত উপসর্গের পর ক-এর সাথে মূর্ধন্য 'ষ' হবে।" },
  'পুরষ্কার': { correct: ['পুরস্কার'], reason: "সন্ধির নিয়মে (পুরঃ + কার) দন্ত্য 'স' যুক্ত হয়ে 'পুরস্কার' হবে।" },
  'পুরষ্কারের': { correct: ['পুরস্কারের'], reason: "সন্ধির নিয়মে (পুরঃ + কার) দন্ত্য 'স' যুক্ত হয়ে 'পুরস্কার' হবে।" },
  'পোষ্ট': { correct: ['পোস্ট'], reason: "বিদেশি শব্দে /st/ ধ্বনিতে ষ-ত্ব বিধান প্রযোজ্য নয়, সর্বদা 'স্ট' হবে।" },
  'মাষ্টার': { correct: ['মাস্টার'], reason: "বিদেশি শব্দে সর্বদা 'স্ট' হবে।" },
  'ষ্টেশন': { correct: ['স্টেশন'], reason: "ইংরেজি ও বিদেশি শব্দে সর্বদা 'স্ট' হবে।" },
  'রেজিষ্টার': { correct: ['রেজিস্টার'], reason: "ইংরেজি ও বিদেশি শব্দে সর্বদা 'স্ট' হবে।" },
  'প্লাষ্টিক': { correct: ['প্লাস্টিক'], reason: "ইংরেজি ও বিদেশি শব্দে সর্বদা 'স্ট' হবে।" }
};

for (const [k, v] of Object.entries(ACADEMY_RULES)) {
  wordsMap[k] = v;
}

currentDict.totalRules = Object.keys(wordsMap).length;
currentDict.validWordCount = finalValidWordsList.length;
currentDict.words = wordsMap;

fs.writeFileSync(dictionaryPath, JSON.stringify(currentDict, null, 2), 'utf8');

console.log('✅ Successfully built super wordlist and enriched dictionary!');
console.log(`- Total valid words: ${finalValidWordsList.length}`);
console.log(`- Total rules: ${Object.keys(wordsMap).length}`);
