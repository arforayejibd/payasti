/**
 * Payasti Bengali Spell Checker & Grammar Assistant
 * Integrates with Quill Editor, Bangla Academy Standards, 100k+ Bengali Dictionary,
 * and Fuzzy Suggestion Engine for broken spellings & famous personality names.
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
          node.setAttribute('data-correct', JSON.stringify(value.correct || []));
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

  // 2. Curated Bengali Famous Personalities, Authors, Literature, and Proper Entities
  const FAMOUS_ENTITIES = [
    'কাজী নজরুল ইসলাম', 'কাজী নজরুল', 'নজরুল ইসলাম', 'নজরুল',
    'রবীন্দ্রনাথ ঠাকুর', 'রবীন্দ্রনাথ', 'ঠাকুর',
    'ঈশ্বরচন্দ্র বিদ্যাসাগর', 'ঈশ্বরচন্দ্র', 'বিদ্যাসাগর',
    'শরৎচন্দ্র চট্টোপাধ্যায়', 'শরৎচন্দ্র',
    'বঙ্কিমচন্দ্র চট্টোপাধ্যায়', 'বঙ্কিমচন্দ্র',
    'জীবনানন্দ দাশ', 'জীবনানন্দ',
    'জসীমউদ্দীন',
    'মাইকেল মধুসূদন দত্ত', 'মধুসূদন দত্ত', 'মাইকেল', 'মধুসূদন',
    'হুমায়ূন আহমেদ', 'হুমায়ূন আহমেদ', 'হুমায়ূন', 'হুমায়ূন',
    'মুহম্মদ জাফর ইকবাল', 'জাফর ইকবাল',
    'মানিক বন্দ্যোপাধ্যায়', 'তারাশঙ্কর বন্দ্যোপাধ্যায়', 'বিভূতিভূষণ বন্দ্যোপাধ্যায়',
    'সুনীল গঙ্গোপাধ্যায়', 'শীর্ষেন্দু মুখোপাধ্যায়', 'সমরেশ মজুমদার', 'সৈয়দ মুজতবা আলী',
    'আখতারুজ্জামান ইলিয়াস', 'হাসান আজিজুল হক', 'শামসুর রাহমান', 'আল মাহমুদ', 'নির্মলেন্দু গুণ',
    'সুকান্ত ভট্টাচার্য', 'বেগম রোকেয়া', 'রোকেয়া', 'সুফিয়া কামাল', 'লালন শাহ', 'লালন',
    'সৈয়দ ওয়ালীউল্লাহ', 'শওকত ওসমান', 'আবুল মনসুর আহমদ', 'ফররুখ আহমদ', 'রুদ্র মুহম্মদ শহিদুল্লাহ',
    'জহির রায়হান', 'প্রমথ চৌধুরী', 'দ্বিজেন্দ্রলাল রায়', 'সত্যজিৎ রায়', 'সুকুমার রায়',
    'উপেন্দ্রকিশোর রায়চৌধুরী', 'মুহম্মদ শহীদুল্লাহ', 'হরপ্রসাদ শাস্ত্রী', 'সুনীতিকুমার চট্টোপাধ্যায়',
    'বঙ্গবন্ধু শেখ মুজিবুর রহমান', 'শেখ মুজিবুর রহমান', 'শেখ মুজিব', 'জিয়াউর রহমান', 'মাওলানা ভাসানী',
    'গীতাঞ্জলি', 'সঞ্চয়িতা', 'অগ্নিবীণা', 'বিষের বাঁশি', 'বিদ্রোহী', 'পদ্মানদীর মাঝি',
    'পথের পাঁচালী', 'চাঁদের পাহাড়', 'দেবদাস', 'পল্লীসমাজ', 'আনন্দমঠ', 'কপালকুণ্ডলা',
    'লালসালু', 'চিলেকোঠার সেপাই', 'খোয়াবনামা', 'একাত্তরের দিনগুলি', 'মেঘনাদবধ কাব্য',
    'নকশী কাঁথার মাঠ', 'সোজন বাদিয়ার ঘাট', 'বনলতা সেন', 'রূপসী বাংলা', 'গৃহদাহ', 'গৃহিণী'
  ];

  // Common Bengali suffixes and inflections
  const BENGALI_SUFFIXES = [
    'গুলোতেই', 'গুলোরই', 'গুলোকেই', 'গুলোকে', 'গুলোতে', 'গুলোর', 'গুলোয়', 'গুলোই', 'গুলোও', 'গুলো',
    'গুলিকেই', 'গুলিকেও', 'গুলিতেই', 'গুলিরই', 'গুলিকেও', 'গুলিকে', 'গুলিতে', 'গুলির', 'গুলিই', 'গুলিও', 'গুলি',
    'দেরকেই', 'দেরকেও', 'দেরকে', 'দেরই', 'দেরও', 'দের',
    'খানাকে', 'খানায়', 'খানা', 'খানিকে', 'খানিতে', 'খানি',
    'টুকুরই', 'টুকুরও', 'টুকুকে', 'টুকুর', 'টুকুতেই', 'টুকুতে', 'টুকুই', 'টুকুও', 'টুকু',
    'টাকেই', 'টাকেও', 'টাতেই', 'টারই', 'টাকে', 'টাতে', 'টায়', 'টার', 'টাই', 'টাও', 'টা',
    'টিকেই', 'টিকেও', 'টিতেই', 'টিরই', 'টিকে', 'টিতে', 'টির', 'টিই', 'টিও', 'টি',
    'ভাবেই', 'ভাবেও', 'ভাবে',
    'জনকভাবেই', 'জনকভাবে', 'জনক',
    'মূলকভাবেই', 'মূলকভাবে', 'মূলক',
    'হীনভাবেই', 'হীনভাবে', 'হীনতা', 'হীন',
    'শীলভাবেই', 'শীলভাবে', 'শীলতা', 'শীল',
    'প্রাপ্তদের', 'প্রাপ্ত',
    'করণে', 'করণ',
    'কৃত',
    'সহকারে', 'সহ',
    'ছিলেনই', 'ছিলেনও', 'ছিলেন',
    'ছিলিনা', 'ছিলেনা', 'ছিলাম', 'ছিলে', 'ছিল',
    'ছেনই', 'ছেনও', 'ছেন',
    'বেনই', 'বেনও', 'বেন',
    'লেনই', 'লেনও', 'লেন',
    'তামই', 'তামও', 'তাম',
    'তেই', 'তেও', 'তে',
    'লেই', 'লেও', 'লে',
    'বেই', 'বেও', 'বে',
    'বোই', 'বোও', 'বো',
    'বই', 'বও', 'ব',
    'লোই', 'লোও', 'লো',
    'লাই', 'লাও', 'লা',
    'তেন',
    'তোই', 'তোও', 'তো',
    'য়েই', 'য়েও', 'য়েরই', 'য়ের', 'য়ে',
    'তেই', 'তেও', 'তে',
    'কেই', 'কেও', 'কে',
    'রেই', 'রেও', 'রে',
    'রই', 'রও', 'র',
    'এরই', 'এরও', 'এর',
    'এতেই', 'এতেও', 'এতে',
    'এই', 'এও', 'এ',
    'য়ই', 'য়ও', 'য়',
    'ও', 'ই'
  ];

  // Common root words, auxiliaries & pronouns
  const COMMON_VALID_WORDS = [
    'আমাদের', 'তোমাদের', 'তাদের', 'নিজের', 'নিজেদের', 'তিনি', 'তারা', 'তিনিও', 'হলেন', 'হলো', 'হয়েছে',
    'হয়েছিল', 'হবে', 'হন', 'বললেন', 'বলল', 'করলেন', 'করল', 'গেলেন', 'গেল', 'থাকলেন', 'থাকল',
    'রওনা', 'পাঠানো', 'হতো', 'সাহেব', 'নতুন', 'জমা', 'দিতে', 'নিয়ে', 'ওঠার', 'আগেই', 'বিভিন্ন',
    'মানুষ', 'বাংলাদেশ', 'দেশ', 'দেশি', 'রবীন্দ্রনাথ', 'নজরুল', 'সঠিক', 'লেখা', 'পয়স্তি', 'পয়স্তি'
  ];

  // 3. Main Spell Checker Controller Class
  class PayastiSpellChecker {
    constructor(quillInstance, options = {}) {
      this.quill = quillInstance;
      this.options = Object.assign({
        dictionaryUrl: '/data/bangla_spelling_dictionary.json',
        wordlistUrl: '/data/bangla_wordlist_80k.json',
        debounceMs: 500,
        widgetContainer: null,
        autoScan: true
      }, options);

      this.rulesDictionary = null; // Specific rules map { wrong: { correct, reason } }
      this.validWordsSet = new Set(COMMON_VALID_WORDS);
      this.wordBuckets = {}; // Length indexed buckets for fast fuzzy matching
      this.famousTokens = [];
      this.suggestionCache = new Map();
      this.ignoredWords = new Set();
      this.isEnabled = true;
      this.debounceTimer = null;
      this.activePopover = null;
      this.isScanning = false;
      this.currentErrors = []; // All currently detected errors

      this.init();
    }

    async init() {
      await Promise.all([
        this.loadRulesDictionary(),
        this.loadWordlist()
      ]);
      this.setupFamousTokens();
      this.setupEventListeners();
      this.createUIWidget();
      if (this.options.autoScan) {
        this.scheduleScan(400);
      }
    }

    async loadRulesDictionary() {
      try {
        const cacheBust = this.options.dictionaryUrl + '?v=4.0_' + Date.now();
        const res = await fetch(cacheBust);
        if (res.ok) {
          const json = await res.json();
          if (json && json.words) {
            const cleanWords = {};
            for (const [k, v] of Object.entries(json.words)) {
              if (v && v.correct && !v.correct.includes(k)) {
                cleanWords[k] = v;
              }
            }
            this.rulesDictionary = cleanWords;
          }
        }
      } catch (err) {
        console.warn('PayastiSpellChecker: Could not load rules dictionary:', err);
      }
    }

    async loadWordlist() {
      try {
        const res = await fetch(this.options.wordlistUrl);
        if (res.ok) {
          const wordsList = await res.json();
          if (Array.isArray(wordsList)) {
            for (let i = 0; i < wordsList.length; i++) {
              const w = wordsList[i];
              this.validWordsSet.add(w);
              const len = w.length;
              if (!this.wordBuckets[len]) this.wordBuckets[len] = [];
              this.wordBuckets[len].push(w);
            }
          }
        }
      } catch (err) {
        console.warn('PayastiSpellChecker: Could not load 80k wordlist:', err);
      }
    }

    setupFamousTokens() {
      FAMOUS_ENTITIES.forEach(ent => {
        ent.split(/\s+/).forEach(t => {
          if (t && !this.famousTokens.includes(t)) {
            this.famousTokens.push(t);
            this.validWordsSet.add(t);
          }
        });
      });
    }

    setupEventListeners() {
      // Listen to text change in Quill
      this.quill.on('text-change', (delta, oldDelta, source) => {
        if (source === Quill.sources.USER && this.isEnabled) {
          this.scheduleScan(this.options.debounceMs);
        }
      });

      // Handle click on misspelled word
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

      // Close popover when clicking anywhere else
      document.addEventListener('click', (e) => {
        if (this.activePopover && !this.activePopover.contains(e.target)) {
          this.hidePopover();
        }
      });

      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.hidePopover();
        }
      });
    }

    scheduleScan(delay = 400) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.scanDocument();
      }, delay);
    }

    isWordValid(word) {
      if (!word) return true;
      if (this.validWordsSet.has(word)) return true;

      // Suffix stripping
      for (let i = 0; i < BENGALI_SUFFIXES.length; i++) {
        const sfx = BENGALI_SUFFIXES[i];
        if (word.endsWith(sfx) && word.length > sfx.length + 1) {
          const stem = word.slice(0, -sfx.length);
          if (this.validWordsSet.has(stem)) return true;
          if (this.validWordsSet.has(stem + 'া')) return true;
          if (this.validWordsSet.has(stem + 'হ')) return true;
          if (this.validWordsSet.has(stem + 'ন')) return true;
        }
      }

      if (word.endsWith('ে') && this.validWordsSet.has(word.slice(0, -1))) return true;
      if (word.endsWith('ের') && this.validWordsSet.has(word.slice(0, -2))) return true;

      return false;
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
            d[i - 1][j] + 1,       // deletion
            d[i][j - 1] + 1,       // insertion
            d[i - 1][j - 1] + cost // substitution
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
          }
        }
      }
      return d[aLen][bLen];
    }

    normalizeBanglaPhonetic(str) {
      if (!str) return '';
      return str
        .replace(/[\u0981\u0982\u0983]/g, '') // Chandrabindu, Anusvara, Visarga
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
        .replace(/ঞ্জ/g, 'নজ')
        .replace(/জ্ঞ/g, 'গগ')
        .replace(/ঙ্ক/g, 'ংক')
        .replace(/ঙ্গ/g, 'ংগ')
        .replace(/ঞ্চ/g, 'নচ')
        .replace(/ণ্ঠ/g, 'নঠ')
        .replace(/ণ্ড/g, 'নড')
        .replace(/ন্ত/g, 'নত')
        .replace(/ন্থ/g, 'নথ')
        .replace(/ন্দ/g, 'নদ')
        .replace(/ন্ধ/g, 'নধ')
        .replace(/ন্ম/g, 'নম')
        .replace(/্/g, ''); // Hasanta
    }

    getSuggestionsForBrokenWord(word, maxResults = 4) {
      if (this.suggestionCache.has(word)) return this.suggestionCache.get(word);

      const targetLen = word.length;
      const normTarget = this.normalizeBanglaPhonetic(word);
      const scored = [];
      const seen = new Set();

      // 1. Check Full Famous Multi-word Entities (Matches conjoined names like 'কাজিনজরুল' -> 'কাজী নজরুল')
      for (let i = 0; i < FAMOUS_ENTITIES.length; i++) {
        const ent = FAMOUS_ENTITIES[i];
        const directNoSpace = ent.replace(/\s+/g, '');
        const normEnt = this.normalizeBanglaPhonetic(ent);

        if (Math.abs(directNoSpace.length - targetLen) <= 4) {
          const directDist = this.damerauLevenshtein(word, directNoSpace);
          const normDist = this.damerauLevenshtein(normTarget, normEnt);

          if (directDist <= 3 || normDist <= 2) {
            const score = directDist * 1.1 + normDist * 0.8 - 0.8;
            if (!seen.has(ent)) {
              scored.push({ word: ent, score, isFamous: true });
              seen.add(ent);
            }
          }
        }
      }

      // 2. Famous single tokens check (Highest Priority)
      for (let i = 0; i < this.famousTokens.length; i++) {
        const ent = this.famousTokens[i];
        if (Math.abs(ent.length - targetLen) <= 3) {
          const directDist = this.damerauLevenshtein(word, ent);
          const normDist = this.damerauLevenshtein(normTarget, this.normalizeBanglaPhonetic(ent));
          if (directDist <= 2 || normDist <= 2) {
            const score = directDist * 1.2 + normDist * 0.9 - 0.6;
            if (!seen.has(ent)) {
              scored.push({ word: ent, score, isFamous: true });
              seen.add(ent);
            }
          }
        }
      }

      // 3. Search across 100k dictionary in relevant length buckets
      const minLen = Math.max(1, targetLen - 3);
      const maxLen = targetLen + 3;
      for (let l = minLen; l <= maxLen; l++) {
        const bucket = this.wordBuckets[l] || [];
        for (let i = 0; i < bucket.length; i++) {
          const w = bucket[i];
          if (seen.has(w) || w === word) continue;
          
          const directDist = this.damerauLevenshtein(word, w);
          const normDist = this.damerauLevenshtein(normTarget, this.normalizeBanglaPhonetic(w));

          if (directDist <= 2 || normDist <= 2) {
            const score = directDist * 1.2 + normDist * 1.0;
            scored.push({ word: w, score, isFamous: false });
            seen.add(w);
          }
        }
      }

      scored.sort((a, b) => a.score - b.score || Math.abs(a.word.length - targetLen));
      const finalSuggs = scored.slice(0, maxResults).map(s => s.word);
      this.suggestionCache.set(word, finalSuggs);
      return finalSuggs;
    }

    scanDocument() {
      if (!this.isEnabled || this.isScanning) return;
      this.isScanning = true;

      try {
        const contents = this.quill.getContents();
        const rulesMap = this.rulesDictionary || {};
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
                const cleanWord = rawWord.trim();

                if (!cleanWord || this.ignoredWords.has(cleanWord)) continue;

                // 1. Direct Rule Match
                if (rulesMap[cleanWord]) {
                  const data = rulesMap[cleanWord];
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
                // 2. Fuzzy / Broken Spelling / Unknown Word Match
                else if (!this.isWordValid(cleanWord)) {
                  const suggestions = this.getSuggestionsForBrokenWord(cleanWord);
                  const isFamous = suggestions.some(s => this.famousTokens.includes(s));
                  const errObj = {
                    index: currentIndex + match.index,
                    length: rawWord.length,
                    word: cleanWord,
                    correct: suggestions.length > 0 ? suggestions : [],
                    reason: isFamous
                      ? 'বিখ্যাত ব্যক্তিত্ব বা সাহিত্যের সঠিক বানান অনুযায়ী সংশোধন করুন।'
                      : 'ভাঙা বা অশুদ্ধ বানান সনাক্ত হয়েছে। কাছাকাছি সঠিক শব্দ বেছে নিন।',
                    isBroken: true
                  };
                  matches.push(errObj);
                  foundErrorsList.push(errObj);
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

        // 1. Clear existing formatting silently
        const totalLength = this.quill.getLength();
        if (totalLength > 0) {
          this.quill.formatText(0, totalLength, 'spellError', false, Quill.sources.SILENT);
        }

        // 2. Apply highlight blots on all matches
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

    getFoundErrors() {
      return this.currentErrors || [];
    }

    showPopover(targetNode) {
      this.hidePopover();

      const actualText = (targetNode.textContent || '').trim();
      let word = actualText;
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
          word = blot.domNode.getAttribute('data-word') || actualText;
        }
      } catch (e) {}

      if (!correct || correct.length === 0) {
        // Fallback to dictionary / fuzzy generator
        if (this.rulesDictionary && this.rulesDictionary[word]) {
          correct = this.rulesDictionary[word].correct || [];
          reason = this.rulesDictionary[word].reason || reason;
        } else {
          correct = this.getSuggestionsForBrokenWord(word);
        }
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

      // Event listener for suggestion buttons
      popover.querySelectorAll('.payasti-spell-btn-suggestion').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const replacement = btn.getAttribute('data-replace');
          this.applyCorrection(targetNode, replacement);
        });
      });

      // Ignore button
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
      const statsBar = document.querySelector('.writing-stats-bar');
      if (!statsBar) return;

      const widget = document.createElement('div');
      widget.className = 'stat-pill payasti-spell-widget';
      widget.id = 'payastiSpellWidget';
      widget.innerHTML = `
        <span class="payasti-spell-status-text">🔍 বানান যাচাই:</span>
        <strong id="payastiSpellCount" style="color: #10b981;">সক্রিয়</strong>
        <button type="button" class="payasti-spell-toggle-btn active" id="payastiSpellToggle">চালু</button>
      `;

      statsBar.appendChild(widget);

      const toggleBtn = widget.querySelector('#payastiSpellToggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          this.isEnabled = !this.isEnabled;
          if (this.isEnabled) {
            toggleBtn.textContent = 'চালু';
            toggleBtn.classList.add('active');
            this.scanDocument();
          } else {
            toggleBtn.textContent = 'বন্ধ';
            toggleBtn.classList.remove('active');
            this.clearHighlights();
          }
          this.updateWidget();
        });
      }
    }

    updateWidget() {
      const widget = document.getElementById('payastiSpellWidget');
      const countEl = document.getElementById('payastiSpellCount');
      if (!widget || !countEl) return;

      const errorCount = (this.currentErrors || []).length;

      if (!this.isEnabled) {
        widget.className = 'stat-pill payasti-spell-widget';
        countEl.textContent = 'বন্ধ আছে';
        countEl.style.color = '#64748b';
        return;
      }

      if (errorCount > 0) {
        widget.className = 'stat-pill payasti-spell-widget has-errors';
        countEl.textContent = `${this.toBnNumber(errorCount)}টি ভুল চিহ্নিত`;
        countEl.style.color = '#dc2626';
      } else {
        widget.className = 'stat-pill payasti-spell-widget is-clean';
        countEl.textContent = 'কোনো ভুল নেই ✅';
        countEl.style.color = '#15803d';
      }
    }

    clearHighlights() {
      const totalLength = this.quill.getLength();
      if (totalLength > 0) {
        this.quill.formatText(0, totalLength, 'spellError', false, Quill.sources.SILENT);
      }
      this.currentErrors = [];
    }
  }

  // Global Initializer Helper
  window.attachPayastiSpellChecker = function (quillInstance, options) {
    return new PayastiSpellChecker(quillInstance, options);
  };

})();
