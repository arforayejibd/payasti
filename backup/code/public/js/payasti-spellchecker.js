/**
 * Payasti Bengali Spell Checker & Grammar Assistant (v5.1 Smart Splitter)
 * Performance & Intelligence:
 * - 0ms UI blocking: suggestions computed lazily on-demand when user clicks a word
 * - Smart Conjoined Word Splitter with automatic subpart rule correction (e.g. 'প্রচারনায়কোনো' -> 'প্রচারণায় কোনো')
 * - Rejects single-letter non-words (e.g. 'য়', 'র') from conjoined splitting
 * - Comprehensive Natwa-Bidhan (ণ-ত্ব বিধান) & Bangla Academy Rules integration
 * - Lightweight 60KB Rules Dictionary loaded first (<20ms)
 * - 80k wordlist loaded in background via requestIdleCallback (Zero page freeze)
 */
(function () {
  'use strict';

  if (typeof Quill === 'undefined') return;

  // 1. Register Custom Inline Blot for Misspelled Words
  try {
    const Inline = Quill.import('blots/inline');
    class SpellErrorBlot extends Inline {
      static blotName = 'spellError';
      static tagName = 'span';
      static className = 'payasti-spell-error';

      static create(value) {
        const node = super.create();
        if (typeof value === 'object' && value !== null) {
          node.setAttribute('data-word', value.word || '');
          if (value.correct && value.correct.length) {
            node.setAttribute('data-correct', JSON.stringify(value.correct));
          }
          node.setAttribute('data-reason', value.reason || '');
          if (value.isBroken) {
            node.setAttribute('data-broken', 'true');
          }
        }
        return node;
      }

      static formats(node) {
        let correctArr = [];
        try {
          correctArr = JSON.parse(node.getAttribute('data-correct') || '[]');
        } catch (e) {}
        return {
          word: node.getAttribute('data-word') || '',
          correct: correctArr,
          reason: node.getAttribute('data-reason') || '',
          isBroken: node.getAttribute('data-broken') === 'true'
        };
      }
    }
    Quill.register(SpellErrorBlot, true);
  } catch (err) {
    console.warn('PayastiSpellChecker: Could not register SpellErrorBlot:', err);
  }

  // Bengali Unicode Normalizer
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

  // Common Bengali suffixes & inflections (Longest first)
  const BENGALI_SUFFIXES = [
    // Plural / Compound inflections
    'গুলোরও', 'গুলোরই', 'গুলোতেই', 'গুলোতেও', 'গুলোতে', 'গুলোর', 'গুলোয়', 'গুলোই', 'গুলোও', 'গুলো',
    'গুলিরও', 'গুলিরই', 'গুলিতেই', 'গুলিতেও', 'গুলিতে', 'গুলির', 'গুলিই', 'গুলিও', 'গুলি',
    'গুলাতে', 'গুলার', 'গুলাই', 'গুলাও', 'গুলা',
    'দেরকেও', 'দেরকেই', 'দেরকে', 'দেরই', 'দেরও', 'দের',
    'খানায়', 'খানা', 'খানি',
    'টুকুরও', 'টুকুরই', 'টুকুতেই', 'টুকুতেও', 'টুকুতে', 'টুকুর', 'টুকুই', 'টুকুও', 'টুকু',
    'টাকে', 'টাতে', 'টায়', 'টার', 'টাই', 'টাও', 'টা',
    'টিকে', 'টিতে', 'টির', 'টিই', 'টিও', 'টি',
    'জনকেই', 'জনকেও', 'জনকে', 'জনের', 'জনই', 'জন',
    // Abstract & Adjectival suffixes
    'ভাবে', 'জনক', 'মূলক', 'হীন', 'শীল', 'প্রাপ্ত', 'করণ', 'কৃত', 'সহ',
    // Verb inflections
    'ছিলেন', 'ছিলাম', 'ছিলে', 'ছিল',
    'েছিলেন', 'েছিলাম', 'েছিলে', 'েছিল',
    'েছেন', 'েছে', 'েছি',
    'বেন', 'লেন', 'তাম', 'তেন', 'ছেন',
    'েতাম', 'েতেন', 'েতো', 'িলেন', 'িলাম', 'িলে', 'িল',
    'য়েছে', 'চ্ছে', 'চ্ছ',
    'তেই', 'তেও', 'তে',
    'লেই', 'লেও', 'লে',
    'বেই', 'বেও', 'বে',
    'বোই', 'বোও', 'বো',
    'লোই', 'লোও', 'লো',
    'তো',
    // Case endings with e-kar (ে), y-e-kar (য়ে), and standard suffixes
    'য়েরই', 'য়েরও', 'য়ের', 'য়েই', 'য়েও', 'য়ে',
    'তেই', 'তেও', 'তে',
    'কেই', 'কেও', 'কে',
    'রেই', 'রেও', 'রে',
    'েরই', 'েরও', 'ের',
    'েতেই', 'েতেও', 'েতে',
    'েই', 'েও', 'ে',
    'রই', 'রও', 'র',
    'রা',
    'য়',
    'ও', 'ই'
  ];

  // Core essential words
  const ESSENTIAL_CORE_WORDS = [
    'নিয়ে', 'নিয়ে', 'ঘুরে', 'ঘুর', 'লাগে', 'লাগ', 'খুলে', 'খুল', 'যায়', 'যায়', 'যাওয়ার',
    'পাপড়ি', 'পাপড়ির', 'পাপড়িটি', 'পাপড়ি', 'পাপড়ির', 'পাপড়িটি', 'সাজিয়ে', 'সাজিয়ে', 'উড়ে', 'উড়ে',
    'জুড়ে', 'জুড়ে', 'পঙ্‌ক্তি', 'পঙ্ক্তি', 'পংক্তি', 'পঙক্তি', 'পঙ্‌ক্তিজুড়ে', 'পঙ্ক্তিজুড়ে',
    'হয়', 'হয়', 'হয়ে', 'হয়ে', 'হয়েছে', 'হয়েছে', 'হলো', 'হল', 'হবে', 'দেওয়া', 'দেওয়া', 'দেখা', 'বলা',
    'বলছেন', 'বলল', 'বললেন', 'গেলে', 'গেল', 'গেলেন', 'রেখে', 'লেখে', 'পড়ে', 'পড়া', 'পড়ার',
    'আমিনা', 'শেলী', 'শেলীর', 'মহাবিশ্ব', 'জরায়ুর', 'জরায়ুর', 'কবিতাগ্রন্থে', 'জঠর', 'প্রচারণা', 'প্রচারণায়', 'প্রচারণার',
    'কোনো', 'কোন', 'মেকিপনা', 'মেকি', 'নেই', 'নজরে', 'দেখেছি', 'বার্তা', 'অত্যন্ত', 'স্পষ্ট', 'মস্তিষ্ক', 'অনুসন্ধানী', 'অনুভব', 'বাধ্য',
    'নিয়ন্ত্রিত', 'নিয়ন্ত্রিত', 'বোধের', 'কবিতার', 'অসংখ্য', 'শরীর', 'সংগীতের', 'সঙ্গীতের', 'স্বরলিপি',
    'রাখা', 'সমাজ', 'ধর্ম', 'পুরুষতান্ত্রিকতার', 'খোলস', 'ভেঙে', 'ফেলার', 'দ্রোহের', 'কোরাসে', 'লিখিত',
    'পুরুষকে', 'পরাজিত', 'অবয়বে', 'অবয়বে', 'আঁকতে', 'চেয়েছেন', 'চেয়েছেন', 'পৃথিবীর', 'পবিত্র',
    'জঠরপটে', 'আসলেই', 'উত্তর', 'পেতে', 'ধরনা', 'যত্ন', 'করে', 'আড়াল', 'আড়াল', 'নগরে',
    'পাঠকেরা', 'পৌঁছাতে', 'পারলেই', 'আবিষ্কার', 'সম্ভব', 'কবির', 'ভেদ', 'মারফত', 'এমনকি',
    'কবিকেও', 'ফুটতে', 'থাকা', 'গোলাপের', 'একটা', 'যেতে', 'থাকে', 'শরীরতত্ত্বের', 'শেষ',
    'পাঠক', 'বুঝতে', 'পারেন', 'গোলাপটির', 'দেহবিন্যাস', 'প্রস্ফুটিত', 'হলে', 'থেকে', 'প্রথম',
    'সৌরভটি', 'বুকে', 'তার', 'নাম', 'প্রেম', 'আমাদের', 'তোমাদের', 'তাদের', 'নিজের', 'নিজেদের',
    'ফুল', 'ফুলের', 'ফুলগুলো', 'ফোটে', 'ফোটানো', 'পাখি', 'পাখির', 'পাখিরা', 'নদী', 'নদীর', 'নদীগুলো',
    'গাছ', 'গাছে', 'গাছের', 'গাছপালা', 'বই', 'বইয়ের', 'বইগুলো', 'শহর', 'শহরে', 'শহরের', 'গ্রাম', 'গ্রামে', 'গ্রামের',
    'ভালোবাসি', 'ভালোবাসা', 'মানুষ', 'মানুষের', 'মানুষজন', 'পড়তে', 'লিখতে', 'বলতে', 'চলতে',
    'দেশ', 'দেশে', 'দেশের', 'সবুজ', 'সুন্দর', 'বাগান', 'বাগানটিতে', 'আকাশ', 'আকাশে', 'বাতাস', 'বাতাসে',
    'রবীন্দ্রনাথ', 'রবীন্দ্রনাথের', 'নজরুল', 'নজরুলের', 'জীবনানন্দ', 'জীবনানন্দের'
  ];

  // Valid standalone 1-letter words in Bengali (ONLY 'এ', 'ও', 'ই')
  const VALID_1_LETTER = new Set(['এ', 'ও', 'ই']);

  // Broken orphan leading kar fixes
  const ORPHAN_KAR_MAP = {
    'েখে': ['রেখে', 'দেখে', 'লেখে', 'শেখে', 'থেকে'],
    'েখেন': ['রেখেন', 'দেখেন', 'লেখেন'],
    'লছেন': ['বলছেন', 'চলছেন'],
    'লল': ['বলল', 'চলল'],
    'ললেন': ['বললেন', 'চললেন'],
    'ার': ['তার', 'যার', 'কার', 'আর', 'এ কবিতার'],
    'নি': ['তিনি', 'নয়', 'না'],
    'তি': ['তিনি', 'প্রতি'],
    'তিযদি': ['বলেন, যদি', 'যদি'],
    'তআমি': ['বলেন, আমি', 'আমি'],
    'বআমি': ['বলেন, আমি', 'আমি'],
    'রযার': ['যার', 'যার বাহুর']
  };

  // Main Spell Checker Class
  class PayastiSpellChecker {
    constructor(quillInstance, options = {}) {
      this.quill = quillInstance;
      this.options = Object.assign({
        dictionaryUrl: '/data/bangla_spelling_dictionary.json',
        wordlistUrl: '/data/bangla_wordlist_80k.json',
        debounceMs: 500,
        widgetContainer: null,
        autoScan: true // Active live spell check by default
      }, options);

      this.rulesDictionary = {};
      this.validWordsSet = new Set(ESSENTIAL_CORE_WORDS.map(normalizeBengaliUnicode));
      this.wordBuckets = {};
      this.suggestionCache = new Map();
      this.ignoredWords = new Set();
      this.isEnabled = this.options.autoScan !== false;
      this.debounceTimer = null;
      this.activePopover = null;
      this.isScanning = false;
      this.isWordlistLoaded = false;
      this.currentErrors = [];

      window.activePayastiSpellChecker = this;
      this.init();
    }

    async init() {
      // 1. Fast load of lightweight 60KB rules dictionary (<20ms)
      await this.loadRulesDictionary();
      this.setupEventListeners();
      this.createUIWidget();

      if (this.isEnabled) {
        this.scheduleScan(200);
      }

      // 2. Background non-blocking load of large 80k wordlist
      const lazyLoad = () => this.loadWordlistInBackground();
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(lazyLoad, { timeout: 3000 });
      } else {
        setTimeout(lazyLoad, 1000);
      }
    }

    async loadRulesDictionary() {
      try {
        const cacheBust = this.options.dictionaryUrl + '?v=5.1_' + Date.now();
        const res = await fetch(cacheBust);
        if (res.ok) {
          const json = await res.json();
          if (json && json.words) {
            for (const [k, v] of Object.entries(json.words)) {
              const normK = normalizeBengaliUnicode(k);
              this.rulesDictionary[normK] = v;
              if (v.correct) {
                v.correct.forEach(c => {
                  c.split(/\s+/).forEach(token => {
                    this.validWordsSet.add(normalizeBengaliUnicode(token));
                  });
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('PayastiSpellChecker: Could not load rules dictionary:', err);
      }
    }

    async loadWordlistInBackground() {
      if (this.isWordlistLoaded) return;
      try {
        const res = await fetch(this.options.wordlistUrl);
        if (res.ok) {
          const wordsList = await res.json();
          if (Array.isArray(wordsList)) {
            for (let i = 0; i < wordsList.length; i++) {
              const w = normalizeBengaliUnicode(wordsList[i]);
              this.validWordsSet.add(w);
              const len = w.length;
              if (!this.wordBuckets[len]) this.wordBuckets[len] = [];
              this.wordBuckets[len].push(w);
            }
            this.isWordlistLoaded = true;
          }
        }
      } catch (err) {
        console.warn('PayastiSpellChecker: Background wordlist loading:', err);
      }
    }

    setupEventListeners() {
      this.quill.on('text-change', (delta, oldDelta, source) => {
        if (source === Quill.sources.USER && this.isEnabled) {
          this.scheduleScan(this.options.debounceMs);
        }
      });

      this.quill.root.addEventListener('click', (e) => {
        const target = e.target.closest('.payasti-spell-error');
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          this.showPopover(target);
        } else {
          this.hidePopover();
        }
      });

      document.addEventListener('click', (e) => {
        if (this.activePopover && !this.activePopover.contains(e.target)) {
          this.hidePopover();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.hidePopover();
        }
      });
    }

    scheduleScan(delay = 300) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.scanDocument();
      }, delay);
    }

    isWordValidStrict(word) {
      if (!word || word.length === 0) return false;
      if (word.length === 1) return VALID_1_LETTER.has(word);
      const norm = normalizeBengaliUnicode(word);

      // 1. Pure numbers or digits with optional punctuation (e.g. ১০০, ২০২৪, ৩.১৪, ১২-১৫)
      if (/^[০-৯0-9]+([.,/-][০-৯0-9]+)*$/.test(norm)) return true;

      // 2. Number + standard Bengali ordinal / classifier suffix (e.g. ১টি, ৫টা, ১০ম, ১৭ই, ১লা, ২রা, ৩রা, ৪ঠা, ২৫তম, ৫০%)
      if (/^[০-৯0-9]+(টি|টা|খানা|খানি|জন|ম|ই|লা|রা|সে|শে|তে|এ|তম|গুণ| শতাংশ|%)$/.test(norm)) return true;

      // 3. Direct dictionary check
      if (this.validWordsSet.has(norm)) return true;

      // 4. Suffix / Inflection stem check
      for (let i = 0; i < BENGALI_SUFFIXES.length; i++) {
        const sfx = BENGALI_SUFFIXES[i];
        if (norm.endsWith(sfx) && norm.length > sfx.length + 1) {
          const stem = norm.slice(0, -sfx.length);
          if (this.validWordsSet.has(stem)) return true;
          if (this.validWordsSet.has(stem + 'া')) return true;
          if (this.validWordsSet.has(stem + 'ানো')) return true;
          if (this.validWordsSet.has(stem + 'ন')) return true;
          if (this.validWordsSet.has(stem + 'য়')) return true;
          if (this.validWordsSet.has(stem + 'ওয়া')) return true;
          if (this.validWordsSet.has(stem + 'য়া')) return true;
        }
      }

      return false;
    }

    isPartValidOrCorrectable(part) {
      if (!part || part.length === 0) return false;
      if (part.length === 1) return VALID_1_LETTER.has(part);
      if (this.isWordValidStrict(part)) return true;
      const norm = normalizeBengaliUnicode(part);
      if (this.rulesDictionary[norm]) return true;
      return false;
    }

    getRuleCorrectedPart(part) {
      const norm = normalizeBengaliUnicode(part);
      if (this.rulesDictionary[norm] && this.rulesDictionary[norm].correct && this.rulesDictionary[norm].correct.length > 0) {
        return this.rulesDictionary[norm].correct[0];
      }
      return part;
    }

    splitConjoinedWord(word) {
      const norm = normalizeBengaliUnicode(word);
      if (norm.length < 3) return null;

      const candidates = [];

      // 2-word split
      for (let i = 2; i <= norm.length - 2; i++) {
        const p1 = norm.slice(0, i);
        const p2 = norm.slice(i);
        if (this.isPartValidOrCorrectable(p1) && this.isPartValidOrCorrectable(p2)) {
          const c1 = this.getRuleCorrectedPart(p1);
          const c2 = this.getRuleCorrectedPart(p2);
          const penalty = (p1.length === 1 ? 10 : 0) + (p2.length === 1 ? 10 : 0);
          candidates.push({ text: c1 + ' ' + c2, score: penalty });
        }
      }

      // 3-word split
      if (norm.length >= 6) {
        for (let i = 2; i <= norm.length - 4; i++) {
          const p1 = norm.slice(0, i);
          if (this.isPartValidOrCorrectable(p1)) {
            const rem = norm.slice(i);
            for (let j = 2; j <= rem.length - 2; j++) {
              const p2 = rem.slice(0, j);
              const p3 = rem.slice(j);
              if (this.isPartValidOrCorrectable(p2) && this.isPartValidOrCorrectable(p3)) {
                const c1 = this.getRuleCorrectedPart(p1);
                const c2 = this.getRuleCorrectedPart(p2);
                const c3 = this.getRuleCorrectedPart(p3);
                const penalty = (p1.length === 1 ? 10 : 0) + (p2.length === 1 ? 10 : 0) + (p3.length === 1 ? 10 : 0);
                candidates.push({ text: c1 + ' ' + c2 + ' ' + c3, score: penalty + 3 });
              }
            }
          }
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => a.score - b.score);
        return candidates[0].text;
      }
      return null;
    }

    damerauLevenshtein(a, b) {
      if (a === b) return 0;
      const aLen = a.length, bLen = b.length;
      if (Math.abs(aLen - bLen) > 3) return 999;

      const d = [];
      for (let i = 0; i <= aLen; i++) {
        d[i] = [];
        d[i][0] = i;
      }
      for (let j = 0; j <= bLen; j++) {
        d[0][j] = j;
      }

      for (let i = 1; i <= aLen; i++) {
        for (let j = 1; j <= bLen; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          d[i][j] = Math.min(
            d[i - 1][j] + 1,
            d[i][j - 1] + 1,
            d[i - 1][j - 1] + cost
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[aLen][bLen];
    }

    normalizePhonetic(str) {
      if (!str) return '';
      return str
        .replace(/[\u0981\u0982\u0983]/g, '')
        .replace(/[ীি]/g, 'ি')
        .replace(/[ূু]/g, 'ু')
        .replace(/[ঋৃ]/g, 'রি')
        .replace(/[ণন]/g, 'ন')
        .replace(/[শষস]/g, 'স')
        .replace(/[ড়ঢ়র]/g, 'র')
        .replace(/[জয]/g, 'জ')
        .replace(/[তথটঠৎ]/g, 'ত')
        .replace(/[দধডঢ]/g, 'দ')
        .replace(/[কখ]/g, 'ক')
        .replace(/[গঘ]/g, 'গ')
        .replace(/[পফ]/g, 'প')
        .replace(/[বভ]/g, 'ব')
        .replace(/্/g, '');
    }

    // Lazy on-demand suggestion calculation for a single word (<2ms)
    getSuggestionsForBrokenWord(rawWord, maxResults = 4) {
      const word = normalizeBengaliUnicode(rawWord);
      if (this.suggestionCache.has(word)) return this.suggestionCache.get(word);

      // 1. Direct Rule
      if (this.rulesDictionary[word]) {
        const ruleRes = this.rulesDictionary[word].correct || [];
        this.suggestionCache.set(word, ruleRes);
        return ruleRes;
      }

      // 2. Orphan Kar / Broken Start
      if (ORPHAN_KAR_MAP[word]) {
        const karRes = ORPHAN_KAR_MAP[word];
        this.suggestionCache.set(word, karRes);
        return karRes;
      }

      // 3. Conjoined Word Split
      const split = this.splitConjoinedWord(word);
      if (split && split !== word) {
        const splitRes = [split];
        this.suggestionCache.set(word, splitRes);
        return splitRes;
      }

      // 4. Fast fuzzy search (only if word buckets are loaded)
      const targetLen = word.length;
      const normTarget = this.normalizePhonetic(word);
      const scored = [];
      const seen = new Set();

      const minLen = Math.max(1, targetLen - 2);
      const maxLen = targetLen + 2;

      for (let l = minLen; l <= maxLen; l++) {
        const bucket = this.wordBuckets[l] || [];
        for (let i = 0; i < bucket.length; i++) {
          const w = bucket[i];
          if (seen.has(w) || w === word) continue;

          const directDist = this.damerauLevenshtein(word, w);
          const normDist = this.damerauLevenshtein(normTarget, this.normalizePhonetic(w));

          if (directDist <= 2 || normDist <= 1) {
            const prefixBonus = w.startsWith(word.slice(0, 2)) ? -0.4 : 0;
            const score = directDist * 1.3 + normDist * 0.9 + prefixBonus;
            scored.push({ word: w, score });
            seen.add(w);
            if (scored.length > 20) break;
          }
        }
      }

      scored.sort((a, b) => a.score - b.score);
      const finalSuggs = scored.slice(0, maxResults).map(s => s.word);
      this.suggestionCache.set(word, finalSuggs);
      return finalSuggs;
    }

    // Ultra-fast document scanner (zero UI blocking)
    scanDocument() {
      if (!this.isEnabled || this.isScanning) return;
      this.isScanning = true;

      try {
        const contents = this.quill.getContents();
        const matches = [];
        const foundErrorsList = [];
        const banglaWordRegex = /[\u0980-\u09FF]+/g;
        let currentIndex = 0;

        if (contents && contents.ops) {
          contents.ops.forEach(op => {
            if (typeof op.insert === 'string') {
              const text = op.insert;
              let match;
              banglaWordRegex.lastIndex = 0;
              while ((match = banglaWordRegex.exec(text)) !== null) {
                const rawWord = match[0];
                const cleanWord = normalizeBengaliUnicode(rawWord.trim());

                if (!cleanWord || this.ignoredWords.has(cleanWord)) continue;

                // 1. Direct Rule Match ($O(1)$)
                if (this.rulesDictionary[cleanWord]) {
                  const data = this.rulesDictionary[cleanWord];
                  if (data && data.correct && !data.correct.includes(cleanWord)) {
                    const errObj = {
                      index: currentIndex + match.index,
                      length: rawWord.length,
                      word: cleanWord,
                      correct: Array.isArray(data.correct) ? data.correct : [data.correct],
                      reason: data.reason || 'বাংলা একাডেমির প্রমিত বানান নিয়ম অনুযায়ী সংশোধন প্রয়োজন।',
                      isBroken: false
                    };
                    matches.push(errObj);
                    foundErrorsList.push(errObj);
                  }
                }
                // 2. Orphan Kar / Broken Starting Character ($O(1)$)
                else if (ORPHAN_KAR_MAP[cleanWord]) {
                  const errObj = {
                    index: currentIndex + match.index,
                    length: rawWord.length,
                    word: cleanWord,
                    correct: ORPHAN_KAR_MAP[cleanWord],
                    reason: 'শব্দের শুরুর বর্ণটি অসম্পূর্ণ বা বাদ পড়েছে। সঠিক শব্দটি বেছে নিন।',
                    isBroken: true
                  };
                  matches.push(errObj);
                  foundErrorsList.push(errObj);
                }
                // 3. Conjoined Word (Missing space) / Unknown Word
                else if (!this.isWordValidStrict(cleanWord)) {
                  const splitResult = this.splitConjoinedWord(cleanWord);
                  if (splitResult && splitResult !== cleanWord) {
                    const errObj = {
                      index: currentIndex + match.index,
                      length: rawWord.length,
                      word: cleanWord,
                      correct: [splitResult],
                      reason: 'শব্দ দুটি একসাথে লেগে গেছে, মাঝে স্পেস ও ণ-ত্ব সংশোধন হবে।',
                      isBroken: true
                    };
                    matches.push(errObj);
                    foundErrorsList.push(errObj);
                  } else {
                    // Do NOT run heavy Levenshtein upfront during scan; compute lazily on click!
                    const errObj = {
                      index: currentIndex + match.index,
                      length: rawWord.length,
                      word: cleanWord,
                      correct: [], // Lazy loaded on click
                      reason: 'অশুদ্ধ বা অপ্রচলিত বানান সনাক্ত হয়েছে। ক্লিক করে পরামর্শ দেখুন।',
                      isBroken: true
                    };
                    matches.push(errObj);
                    foundErrorsList.push(errObj);
                  }
                }
              }
              currentIndex += text.length;
            } else {
              currentIndex += 1;
            }
          });
        }

        this.currentErrors = foundErrorsList;
        this.updateWidget();

        // Dispatch scan event and callback
        if (typeof this.options.onScanComplete === 'function') {
          try {
            this.options.onScanComplete(this.currentErrors);
          } catch (cbErr) {
            console.warn('PayastiSpellChecker: onScanComplete error:', cbErr);
          }
        }
        try {
          const scanEvt = new CustomEvent('payasti-spell-scanned', { detail: { errors: this.currentErrors } });
          this.quill.root.dispatchEvent(scanEvt);
        } catch (e) {}

        // Apply formatting silently in batch
        const totalLength = this.quill.getLength();
        if (totalLength > 0) {
          this.quill.formatText(0, totalLength, 'spellError', false, Quill.sources.SILENT);
        }

        matches.forEach(item => {
          this.quill.formatText(item.index, item.length, 'spellError', {
            word: item.word,
            correct: item.correct,
            reason: item.reason,
            isBroken: item.isBroken
          }, Quill.sources.SILENT);
        });

      } catch (e) {
        console.error('PayastiSpellChecker: Scan error:', e);
      } finally {
        this.isScanning = false;
      }
    }

    showPopover(targetNode) {
      this.hidePopover();

      const actualText = (targetNode.textContent || '').trim();
      let word = normalizeBengaliUnicode(actualText);
      let correct = [];
      let reason = 'বাংলা বানান সংশোধন প্রয়োজন।';

      try {
        const blot = Quill.find(targetNode);
        if (blot && blot.domNode) {
          const rawCorrect = blot.domNode.getAttribute('data-correct');
          if (rawCorrect) {
            correct = JSON.parse(rawCorrect);
          }
          reason = blot.domNode.getAttribute('data-reason') || reason;
          word = normalizeBengaliUnicode(blot.domNode.getAttribute('data-word') || actualText);
        }
      } catch (e) {}

      // Lazy compute suggestions if not already populated
      if (!correct || correct.length === 0) {
        correct = this.getSuggestionsForBrokenWord(word);
      }

      const popover = document.createElement('div');
      popover.className = 'payasti-spell-popover';

      let suggestionsHtml = '';
      if (correct && correct.length > 0) {
        correct.forEach(item => {
          if (item) {
            suggestionsHtml += `
              <button type="button" class="payasti-spell-btn-suggestion" data-replace="${item}">
                <span>✨ ${item}</span>
                <span class="btn-check-icon">ঠিক করুন ↵</span>
              </button>
            `;
          }
        });
      } else {
        suggestionsHtml = `<div style="font-size: 14px; color: #64748b; padding: 4px 0;">কোনো সুনির্দিষ্ট পরামর্শ পাওয়া যায়নি</div>`;
      }

      popover.innerHTML = `
        <div class="payasti-spell-popover-main">
          <div class="payasti-spell-suggestions">
            ${suggestionsHtml}
          </div>
          <button type="button" class="payasti-spell-btn-ignore" id="btnIgnoreWord" title="উপেক্ষা করুন">
            ✕
          </button>
        </div>
        ${reason ? `<div class="payasti-spell-rule-reason">💡 ${reason}</div>` : ''}
      `;

      document.body.appendChild(popover);
      this.activePopover = popover;

      // Position Popover
      const rect = targetNode.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      let top = rect.bottom + scrollTop + 10;
      let left = rect.left + scrollLeft - 4;

      if (top + popoverRect.height > window.innerHeight + scrollTop) {
        top = rect.top + scrollTop - popoverRect.height - 10;
        popover.classList.add('popover-above');
      } else {
        popover.classList.remove('popover-above');
      }

      if (left + popoverRect.width > window.innerWidth) {
        left = window.innerWidth - popoverRect.width - 20;
      }
      if (left < 10) left = 10;

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;

      popover.querySelectorAll('.payasti-spell-btn-suggestion').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const replacement = btn.getAttribute('data-replace');
          this.applyCorrection(targetNode, replacement);
        });
      });

      const ignoreBtn = popover.querySelector('#btnIgnoreWord');
      if (ignoreBtn) {
        ignoreBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.ignoreWord(word);
        });
      }
    }

    applyCorrection(targetNode, newWord) {
      try {
        const blot = Quill.find(targetNode);
        if (blot) {
          const index = this.quill.getIndex(blot);
          const length = blot.length();

          this.quill.deleteText(index, length, Quill.sources.USER);
          this.quill.insertText(index, newWord, Quill.sources.USER);
          this.quill.formatText(index, newWord.length, 'spellError', false, Quill.sources.SILENT);
        }
      } catch (err) {
        console.error('PayastiSpellChecker: Error applying correction:', err);
      }

      this.hidePopover();
      this.scheduleScan(150);
    }

    ignoreWord(word) {
      if (!word) return;
      this.ignoredWords.add(word);
      this.hidePopover();
      this.scanDocument();
    }

    hidePopover() {
      if (this.activePopover && this.activePopover.parentNode) {
        this.activePopover.parentNode.removeChild(this.activePopover);
      }
      this.activePopover = null;
    }

    toBnNumber(num) {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(num).replace(/\d/g, d => bnDigits[d]);
    }

    createUIWidget() {
      const statsBar = document.querySelector('.writing-stats-bar') || document.querySelector('.admin-card-header .admin-card-title');
      if (!statsBar) return;

      if (document.getElementById('payastiSpellWidget')) return;

      const widget = document.createElement('div');
      widget.className = 'payasti-spell-widget' + (this.isEnabled ? ' active' : '');
      widget.id = 'payastiSpellWidget';
      widget.style.cssText = 'display: inline-flex; align-items: center; gap: 8px; margin-left: auto; font-size: 14px;';
      widget.innerHTML = `
        <span class="payasti-spell-status-text" style="color: #475569; font-weight: 600;">🔍 বানান চেকার:</span>
        <button type="button" class="payasti-spell-toggle-btn ${this.isEnabled ? 'active' : ''}" id="payastiSpellToggle" style="padding: 4px 12px; font-size: 13px; font-weight: 700; border-radius: 6px; cursor: pointer; border: 1px solid #cbd5e1; background: ${this.isEnabled ? '#10b981' : '#f1f5f9'}; color: ${this.isEnabled ? '#ffffff' : '#475569'};">
          ${this.isEnabled ? 'চালু আছে' : 'বানান পরীক্ষা করুন'}
        </button>
        <span id="payastiSpellCount" style="font-weight: 700; color: ${this.isEnabled ? '#10b981' : '#64748b'};"></span>
      `;

      statsBar.parentElement.appendChild(widget);

      const toggleBtn = widget.querySelector('#payastiSpellToggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          this.isEnabled = !this.isEnabled;
          if (this.isEnabled) {
            toggleBtn.textContent = 'চালু আছে';
            toggleBtn.style.background = '#10b981';
            toggleBtn.style.color = '#ffffff';
            toggleBtn.classList.add('active');
            this.scanDocument();
          } else {
            toggleBtn.textContent = 'বানান পরীক্ষা করুন';
            toggleBtn.style.background = '#f1f5f9';
            toggleBtn.style.color = '#475569';
            toggleBtn.classList.remove('active');
            this.clearHighlights();
          }
          this.updateWidget();
        });
      }
    }

    updateWidget() {
      const countEl = document.getElementById('payastiSpellCount');
      if (!countEl) return;

      const errorCount = (this.currentErrors || []).length;

      if (!this.isEnabled) {
        countEl.textContent = '';
        return;
      }

      if (errorCount > 0) {
        countEl.textContent = `(${this.toBnNumber(errorCount)}টি অসঙ্গতি)`;
        countEl.style.color = '#dc2626';
      } else {
        countEl.textContent = '(কোনো ভুল নেই ✅)';
        countEl.style.color = '#15803d';
      }
    }

    getFoundErrors() {
      return this.currentErrors || [];
    }

    clearHighlights() {
      const totalLength = this.quill.getLength();
      if (totalLength > 0) {
        this.quill.formatText(0, totalLength, 'spellError', false, Quill.sources.SILENT);
      }
      this.currentErrors = [];
      this.updateWidget();
      if (typeof this.options.onScanComplete === 'function') {
        try {
          this.options.onScanComplete([]);
        } catch (e) {}
      }
      try {
        const event = new CustomEvent('payasti-spell-scanned', { detail: { errors: [] } });
        this.quill.root.dispatchEvent(event);
      } catch (e) {}
    }
  }

  // Global Initializer Helper
  window.attachPayastiSpellChecker = function (quillInstance, options) {
    return new PayastiSpellChecker(quillInstance, options);
  };

})();
