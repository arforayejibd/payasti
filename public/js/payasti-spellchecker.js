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
      .replace(/ৌ/g, 'ৌ')
      .replace(/ো/g, 'ো')
      .replace(/া্ও/g, 'াও')
      .replace(/া্য়া/g, 'ায়া')
      .replace(/াাঁ/g, 'াঁ')
      .replace(/া+ঁ?া+/g, 'া');
  }

  // Common Bengali suffixes & inflections (Longest first)
  const BENGALI_SUFFIXES = [
    // Plural / Compound inflections
    'গুলোরও', 'গুলোরই', 'গুলোতেই', 'গুলোতেও', 'গুলোতে', 'গুলোর', 'গুলোয়', 'গুলোই', 'গুলোও', 'গুলো',
    'গুলিরও', 'গুলিরই', 'গুলিতেই', 'গুলিতেও', 'গুলিতে', 'গুলির', 'গুলিই', 'গুলিও', 'গুলি',
    'গুলাতে', 'গুলার', 'গুলাই', 'গুলাও', 'গুলা',
    'দেরকেও', 'দেরকেই', 'দেরকে', 'দেরই', 'দেরও', 'দের',
    'খানায়', 'খানা', 'খানি', 'খানিতে', 'খানির',
    'টুকুরও', 'টুকুরই', 'টুকুতেই', 'টুকুতেও', 'টুকুতে', 'টুকুর', 'টুকুই', 'টুকুও', 'টুকু',
    'টাকে', 'টাতে', 'টায়', 'টার', 'টাই', 'টাও', 'টা',
    'টিকে', 'টিতে', 'টির', 'টিই', 'টিও', 'টি',
    'জনকেই', 'জনকেও', 'জনকে', 'জনের', 'জনই', 'জন',
    'বাবু', 'বাবুকে', 'বাবুর', 'সাহেব', 'সাহেবকে', 'সাহেবের', 'গণ', 'গণের', 'বর্গ', 'বর্গের',

    // Abstract, Adjectival, Semblance & Compound suffixes
    'ভিত্তিক', 'বিষয়ক', 'কালীন', 'মুখী', 'প্রবণ', 'শীল',
    'তুল্য', 'সদৃশ', 'রূপ', 'মতো', 'মত', 'সম',
    'প্রাপ্ত', 'করণ', 'কৃত', 'যুক্ত', 'হীন', 'বিহীন', 'বিশিষ্ট', 'যোগ্য', 'পূর্ণ', 'ভরা',
    'ভাবে', 'জনক', 'মূলক', 'সহ',
    'গিরি', 'পনা', 'বাজ', 'বাজি', 'দার', 'দারি', 'ত্ব', 'তা',
    'ওয়ালাদেরকে', 'ওয়ালাদের', 'ওয়ালারা', 'ওয়ালা', 'ওয়ালি',

    // Verb inflections (Past, Perfect, Progressive, Causative, Colloquial & Polite)
    'িয়েছিলেনই', 'িয়েছিলেনও', 'িয়েছিলেন',
    'িয়েছিলামই', 'িয়েছিলামও', 'িয়েছিলাম',
    'িয়েছিলেই', 'িয়েছিলেও', 'িয়েছিলে',
    'িয়েছিলই', 'িয়েছিলও', 'িয়েছিল',
    'িয়েছেনই', 'িয়েছেনও', 'িয়েছেন',
    'িয়েছেই', 'িয়েছেও', 'িয়েছে',
    'িয়েছিই', 'িয়েছিও', 'িয়েছি',
    'িয়েছোই', 'িয়েছোও', 'িয়েছো', 'িয়েছ',
    'িয়েন', 'িয়ো', 'িও', 'িয়ে',

    'েছিলেনই', 'েছিলেনও', 'েছিলেন',
    'েছিলামই', 'েছিলামও', 'েছিলাম',
    'েছিলেই', 'েছিলেও', 'েছিলে',
    'েছিলই', 'েছিলও', 'েছিল',
    'েছেনই', 'েছেনও', 'েছেন',
    'েছেই', 'েছেও', 'েছে',
    'েছিই', 'েছিও', 'েছি',
    'েছোই', 'েছোও', 'েছো', 'েছ',

    'ছিলেন', 'ছিলাম', 'ছিলে', 'ছিল',
    'ছেন', 'ছে', 'ছি', 'ছো', 'ছ',
    'বেন', 'লেন', 'লাম', 'লে', 'লো', 'তাম', 'তেন', 'বে', 'বো', 'বা',
    'েতাম', 'েতেন', 'েতো', 'িলেন', 'িলাম', 'িলে', 'িল',
    'েছিলি', 'েতিস', 'তিস', 'লিস', 'বি', 'িস', 'িসনে',

    'য়েছে', 'য়েছেই', 'য়েছেও',
    'চ্ছে', 'চ্ছেই', 'চ্ছেও', 'চ্ছ', 'চ্ছো', 'চ্ছি', 'চ্ছেন',
    'তেই', 'তেও', 'তে',
    'লেই', 'লেও', 'লে',
    'বেই', 'বেও', 'বে',
    'বোই', 'বোও', 'বো',
    'লোই', 'লোও', 'লো',
    'তো', 'তোই', 'তোও',
    'ছিলই', 'ছিলও',
    'যাবে', 'যাবেই', 'যাবেও', 'যাব', 'যাবই', 'যাবও', 'যায়', 'যায়ই', 'যায়ও',

    // Negative past / present verb endings (-নি, -েনি, -না, -েনা)
    'নিই', 'নিও', 'নি', 'েনি', 'না', 'েনা',

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

  // Common Bengali Prefixes (উপসর্গ)
  const BENGALI_PREFIXES = [
    'পুনর', 'পুনর্', 'পুনঃ', 'প্রতি',
    'আমৃত্যু', 'আজীবন', 'আমরণ', 'আকণ্ঠ', 'আজন্ম', 'আপাদমস্তক', 'আসমুদ্র',
    'সু', 'কু', 'বে', 'না', 'নি', 'নির্', 'নিঃ',
    'অপ', 'উপ', 'অন', 'অ', 'আ'
  ];

  // Core essential literary & modern Bengali vocabulary
  const ESSENTIAL_CORE_WORDS = [
    // Causative & Literary verbs
    'জিতিয়ে', 'জিতিয়েছিলেন', 'জিতিয়েছিলাম', 'জিতিয়েছিলে', 'জিতিয়েছে', 'জিতিয়েছেন', 'জিতিয়েছো', 'জিতিয়েছ',
    'জিতে', 'জিতলো', 'জিতবে', 'জিতানো', 'জিতা', 'জেতা', 'জিতনি', 'জিতোনি',
    'করনি', 'করোনি', 'বলনি', 'বলোনি', 'যাওনি', 'খাওনি', 'দেখনি', 'দেখোনি', 'শোননি', 'শোনোনি', 'পাওনি', 'হওনি',
    'আসনি', 'আসোনি', 'বোঝনি', 'বুঝনি', 'বোঝোনি', 'হারনি', 'হারোনি', 'চাওনি', 'পড়নি', 'লিখনি',
    'গিয়েছো', 'গিয়েছ', 'গেছো', 'গেছি', 'গেছে', 'গেছেন', 'গেলে', 'গেলো', 'গেল', 'গেলেন', 'গেলাম',
    'চেয়েছিলে', 'চেয়েছিলেন', 'চেয়েছিলাম', 'চেয়েছিল', 'চেয়েছো', 'চেয়েছ', 'চেয়েছে', 'চেয়েছেন',
    'দিয়েছেন', 'দিয়েছে', 'দিয়েছি', 'দিয়েছিলেন', 'দিয়েছিলাম', 'দিয়েছিলে', 'দিয়েছো', 'দিয়েছ',
    'দিলে', 'দিলো', 'দিল', 'দিলেন', 'দিলাম', 'নিতে', 'নিলে', 'নিলো', 'নিলেন', 'নিলাম',
    'হেরে', 'হারানো', 'হারিয়ে', 'হারিয়েছে', 'হারিয়েছেন', 'হারিয়েছো', 'হারিয়েছ',
    'রেখেছো', 'রেখেছ', 'লিখেছো', 'লিখেছ', 'পড়েছো', 'পড়েছ', 'দেখেছো', 'দেখেছ',
    'শুনেছো', 'শুনেছ', 'বসেছো', 'বসেছ', 'এসেছো', 'এসেছ', 'বলেছো', 'বলেছ', 'করেছো', 'করেছ',

    // Primary Bengali root verbs and everyday conjugations
    'দেখ', 'দেখা', 'দেখি', 'দেখিস', 'দেখুক', 'দেখে', 'দেখেন', 'দেখবে', 'দেখব', 'দেখলে', 'দেখলাম', 'দেখলি', 'দেখছিল', 'দেখতাম', 'দেখতেন', 'দেখতে', 'দেখানো', 'দেখায়', 'দেখিয়ে',
    'বল', 'বলা', 'বলি', 'বলিস', 'বলুক', 'বলে', 'বলেন', 'বলবে', 'বলব', 'বললে', 'বললাম', 'বললি', 'বলছিল', 'বলতাম', 'বলতেন', 'বলতে', 'বলানো', 'বলায়', 'বলিয়ে', 'বলল', 'বললেন',
    'শোন', 'শোনা', 'শুনি', 'শুনুন', 'শোনে', 'শোনেন', 'শুনবে', 'শুনব', 'শুনলে', 'শুনলাম', 'শুনলি', 'শুনছিল', 'শুনতে', 'শোনাচ্ছি',
    'কর', 'করা', 'করি', 'করুন', 'করে', 'করেন', 'করবে', 'করব', 'করলে', 'করলাম', 'করলি', 'করছিল', 'করতাম', 'করতেন', 'করতে', 'করানো', 'করায়', 'করিয়ে', 'করল', 'করলেন',
    'লিখ', 'লেখা', 'লিখি', 'লিখুন', 'লেখে', 'লেখেন', 'লিখবে', 'লিখব', 'লিখলে', 'লিখলাম', 'লিখতে', 'লিখানো', 'লিখল', 'লিখলেন',
    'পড়', 'পড়া', 'পড়ি', 'পড়ুন', 'পড়ে', 'পড়েন', 'পড়বে', 'পড়ব', 'পড়লে', 'পড়লাম', 'পড়তে', 'পড়ানো', 'পড়াল', 'পড়ল', 'পড়লেন',
    'খাও', 'খাওয়া', 'খাই', 'খান', 'খায়', 'খাবেন', 'খাবে', 'খাব', 'খেলে', 'খেলাম', 'খেয়ে', 'খেয়েছে', 'খেয়েছেন', 'খেতে',
    'যাও', 'যাওয়া', 'যাই', 'যান', 'যায়', 'যাবেন', 'যাবে', 'যাব', 'গেলে', 'গেলাম', 'গিয়ে', 'গিয়েছে', 'গিয়েছেন', 'যেতে',
    'হও', 'হওয়া', 'হই', 'হন', 'হয়', 'হবেন', 'হবে', 'হব', 'হলে', 'হলাম', 'হয়ে', 'হয়েছে', 'হয়েছেন', 'হতে', 'হচ্ছিল', 'হয়নি', 'হইনি',
    'থাক', 'থাকা', 'থাকি', 'থাকুন', 'থাকে', 'থাকেন', 'থাকবে', 'থাকব', 'থাকলে', 'থাকলাম', 'থেকে', 'থাকতে',
    'আস', 'আসা', 'আসি', 'আসুন', 'আসে', 'আসেন', 'আসবে', 'আসব', 'আসলে', 'আসলাম', 'এসে', 'এসেছে', 'এসেছেন', 'আসতে',
    'নে', 'নেওয়া', 'নিই', 'নেন', 'নেয়', 'নেবেন', 'নেবে', 'নেব', 'নিলে', 'নিলাম', 'নিয়ে', 'নিয়েছে', 'নিয়েছেন', 'নিতে',
    'দে', 'দেওয়া', 'দিই', 'দেন', 'দেয়', 'দেবেন', 'দেবে', 'দেব', 'দিলে', 'দিলাম', 'দিয়ে', 'দিয়েছে', 'দিয়েছেন', 'দিতে',
    'চল', 'চলা', 'চলি', 'চলুন', 'চলে', 'চলেন', 'চলবে', 'চলব', 'চললে', 'চললাম', 'চলতে',
    'বস', 'বসা', 'বসি', 'বসুন', 'বসে', 'বসেন', 'বসবে', 'বসব', 'বসলে', 'বসলাম', 'বসতে',
    'ঘুমা', 'ঘুমানো', 'ঘুমাই', 'ঘুমান', 'ঘুমায়', 'ঘুমাবেন', 'ঘুমাবে', 'ঘুমাব', 'ঘুমাল', 'ঘুমাতে',
    'হাস', 'হাসা', 'হাসি', 'হাসুন', 'হাসে', 'হাসেন', 'হাসবে', 'হাসব', 'হাসলে', 'হাসতে',
    'কাঁদ', 'কাঁদা', 'কাঁদি', 'কাঁদে', 'কাঁদবে', 'কাঁদলে', 'কাঁদতে',
    'উড়', 'উড়া', 'উড়ি', 'উড়ে', 'উড়বে', 'উড়লে', 'উড়তে',
    'ঘুর', 'ঘুরা', 'ঘুরি', 'ঘুরে', 'ঘুরবে', 'ঘুরলে', 'ঘুরতে',
    'খুল', 'খোলা', 'খুলি', 'খোলে', 'খুলবে', 'খুললে', 'খুলতে',
    'ছুট', 'ছুটা', 'ছুটি', 'ছুটে', 'ছুটবে', 'ছুটলে', 'ছুটতে',
    'কাট', 'কাটা', 'কাটি', 'কাটে', 'কাটবে', 'কাটলে', 'কাটতে',
    'মার', 'মারা', 'মারি', 'মারে', 'মারবে', 'মারলে', 'মারতে',
    'মর', 'মরা', 'মরি', 'মরে', 'মরবে', 'মরলে', 'মরতে',
    'জান', 'জানা', 'জানি', 'জানুন', 'জানে', 'জানেন', 'জানবে', 'জানব', 'জানলে', 'জানলাম', 'জানতে',
    'মান', 'মানা', 'মানি', 'মানুন', 'মানে', 'মানেন', 'মানবে', 'মানব', 'মানলে', 'মানলাম', 'মানতে',
    'ভাব', 'ভাবা', 'ভাবি', 'ভাবুন', 'ভবে', 'ভাবেন', 'ভাববে', 'ভাবব', 'ভাবলে', 'ভাবলাম', 'ভাবতে',

    // Literary, Philosophical, Anatomical & Essential vocabulary
    'মহাকাশ', 'মহাকাশসম', 'ব্যবধান', 'দূরত্ব', 'ঈশ্বর', 'ভগবান', 'আল্লাহ', 'বারংবার', 'বারবার',
    'আমৃত্যু', 'আজীবন', 'আমরণ', 'আকণ্ঠ', 'আজন্ম', 'নেশায়', 'বিভোর',
    'প্রার্থনাটুকুও', 'প্রার্থনাটুকু', 'প্রার্থনা', 'মনুষ্যত্ব', 'মহাবিশ্ব', 'ভালোবাসা', 'ভালোবাসি',
    'যৌনাঙ্গ', 'যৌনাঙ্গের', 'যৌনাঙ্গে', 'যৌন', 'অঙ্গ', 'যোনিপথ', 'যোনিপথে', 'যোনি', 'যোনির',
    'জিজ্ঞাস', 'জিজ্ঞাসা', 'জিজ্ঞেস', 'বেহেশতবাসী', 'বেহেশত', 'দস্তাবেজ', 'মারফত', 'মারেফাত', 'মারিফত', 'মারেফত',
    'দেহবিন্যাস', 'দেহকাঠামো', 'শরীরকাঠামো', 'মনস্তাত্ত্বিক', 'মনস্তাত্ত্বিকনগরে',
    'পাওয়া', 'খাওয়া', 'যাওয়া', 'দেওয়া', 'নেওয়া', 'হওয়া', 'শোওয়া', 'ধোওয়া', 'বওয়া', 'রওয়া',
    'পাওয়ার', 'খাওয়ার', 'যাওয়ার', 'দেওয়ার', 'নেওয়ার', 'হওয়ার',
    'সাহসী', 'সাহসীদের', 'সাহসীদেরকে', 'সাহসীদেরও', 'বীর্য', 'বীর্যের', 'বীর্যে', 'বীর্যবান',
    'বেড়ানো', 'বেড়াতে', 'বেড়াই', 'বেড়াও', 'বেড়ায়', 'বেড়াচ্ছে', 'বেড়াচ্ছিল',
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
    'রবীন্দ্রনাথ', 'রবীন্দ্রনাথের', 'নজরুল', 'নজরুলের', 'জীবনানন্দ', 'জীবনানন্দের',
    'কাঠ', 'কয়লা', 'কয়লা', 'কয়লার', 'কাঠ-কয়লা', 'কাঠকয়লা'
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
    'রযার': ['যার', 'যার বাহুর'],
    'দেখেি': ['দেখেছি', 'দেখি', 'দেখেছেন']
  };

  // User persistent dictionary key
  const USER_DICTIONARY_STORAGE_KEY = 'payasti_user_custom_dictionary';

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

      this.loadUserCustomDictionary();

      window.activePayastiSpellChecker = this;
      this.init();
    }

    loadUserCustomDictionary() {
      try {
        const raw = localStorage.getItem(USER_DICTIONARY_STORAGE_KEY);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach(w => {
              const norm = normalizeBengaliUnicode(w);
              if (norm) this.validWordsSet.add(norm);
            });
          }
        }
      } catch (e) {}
    }

    saveUserCustomWord(word) {
      if (!word) return;
      const norm = normalizeBengaliUnicode(word);
      this.validWordsSet.add(norm);
      try {
        let list = [];
        const raw = localStorage.getItem(USER_DICTIONARY_STORAGE_KEY);
        if (raw) {
          try { list = JSON.parse(raw) || []; } catch (e) {}
        }
        if (!list.includes(norm)) {
          list.push(norm);
          localStorage.setItem(USER_DICTIONARY_STORAGE_KEY, JSON.stringify(list));
        }
      } catch (e) {}
    }

    async init() {
      this.setupEventListeners();
      this.createUIWidget();

      // Load lightweight rules dictionary and 100k background wordlist in parallel
      this.loadRulesDictionary().then(() => {
        if (this.isEnabled) this.scheduleScan(50);
      });

      this.loadWordlistInBackground();
    }

    async loadRulesDictionary() {
      try {
        const cacheBust = this.options.dictionaryUrl + '?v=7.0_' + Date.now();
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
        const cacheBust = this.options.wordlistUrl + '?v=7.0_' + Date.now();
        const res = await fetch(cacheBust);
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
            // Rescan immediately when 134k words finish loading so no valid word is falsely flagged!
            if (this.isEnabled) {
              this.scheduleScan(50);
            }
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

    isWordValidStrict(word, depth = 0) {
      if (!word || word.length === 0) return false;
      const norm = normalizeBengaliUnicode(word);

      // 1. Pure numbers or digits with optional punctuation (e.g. ১, ২, ৩, ১০০, ২০২৪, ৩.১৪, ১২-১৫)
      if (/^[০-৯0-9]+([.,/-][০-৯0-9]+)*$/.test(norm)) return true;

      // 2. Number + standard Bengali ordinal / classifier suffix (e.g. ১টি, ৫টা, ১০ম, ১৭ই, ১লা, ২রা, ৩রা, ৪ঠা, ২৫তম, ৫০%)
      if (/^[০-৯0-9]+(টি|টা|খানা|খানি|জন|ম|ই|লা|রা|সে|শে|তে|এ|তম|গুণ| শতাংশ|%)$/.test(norm)) return true;

      // 3. Single letter check
      if (norm.length === 1) return VALID_1_LETTER.has(norm);

      // 4. Direct dictionary check
      if (this.validWordsSet.has(norm)) return true;

      // 4. Prefix checking (e.g. আমৃত্যু, আজীবন, অজানা, প্রতিদিন, সুদূর, নিখুঁত)
      if (depth === 0) {
        for (let i = 0; i < BENGALI_PREFIXES.length; i++) {
          const pfx = BENGALI_PREFIXES[i];
          if (norm.startsWith(pfx) && norm.length > pfx.length + 1) {
            const root = norm.slice(pfx.length);
            if (this.validWordsSet.has(root) || this.isWordValidStrict(root, depth + 1)) {
              return true;
            }
          }
        }
      }

      // 5. Suffix / Inflection stem check
      for (let i = 0; i < BENGALI_SUFFIXES.length; i++) {
        const sfx = BENGALI_SUFFIXES[i];
        if (norm.endsWith(sfx) && norm.length > sfx.length + 1) {
          const stem = norm.slice(0, -sfx.length);
          if (this.validWordsSet.has(stem)) return true;
          if (this.validWordsSet.has(stem + 'া')) return true;
          if (this.validWordsSet.has(stem + 'ানো')) return true;
          if (this.validWordsSet.has(stem + 'নো')) return true;
          if (this.validWordsSet.has(stem + 'ো')) return true;
          if (this.validWordsSet.has(stem + 'ে')) return true;
          if (this.validWordsSet.has(stem + 'ন')) return true;
          if (this.validWordsSet.has(stem + 'য়')) return true;
          if (this.validWordsSet.has(stem + 'ওয়া')) return true;
          if (this.validWordsSet.has(stem + 'য়া')) return true;
          if (this.validWordsSet.has(stem + 'ওয়ালা')) return true;

          // Stem harmony for common irregular verbs
          if (stem === 'গে' && (this.validWordsSet.has('গেল') || this.validWordsSet.has('গেলে'))) return true;
          if (stem === 'গিয়ে' && (this.validWordsSet.has('গেলে') || this.validWordsSet.has('যাওয়া'))) return true;

          // Recursive check for compound suffixes (depth 1)
          if (depth === 0 && stem.length >= 3 && this.isWordValidStrict(stem, depth + 1)) {
            return true;
          }
        }
      }

      // 6. Compound word check (সমাসবদ্ধ ও তুলনাবাচক শব্দ - e.g. মহাকাশসম, দূরদর্শন, জীবনসংগ্রাম, রক্তরাঙা)
      if (depth === 0 && norm.length >= 4) {
        // Check comparison and adjectival particles at tail
        const compParticles = ['সম', 'তুল্য', 'সদৃশ', 'রূপ', 'হীন', 'যুক্ত', 'বিশিষ্ট', 'পূর্ণ', 'মুখী', 'ভিত্তিক', 'বিষয়ক', 'বিদ', 'বাদী', 'ময়', 'ময়ী', 'লোক', 'বাসী'];
        for (let i = 0; i < compParticles.length; i++) {
          const part = compParticles[i];
          if (norm.endsWith(part) && norm.length > part.length + 1) {
            const head = norm.slice(0, -part.length);
            if (this.validWordsSet.has(head) || this.isWordValidStrict(head, depth + 1)) {
              return true;
            }
          }
        }

        // Generic 2-stem compound match
        for (let i = 2; i <= norm.length - 2; i++) {
          const p1 = norm.slice(0, i);
          const p2 = norm.slice(i);
          if (this.validWordsSet.has(p1) && (this.validWordsSet.has(p2) || this.isWordValidStrict(p2, depth + 1))) {
            return true;
          }
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

    checkBanglaAcademyGrammar(word) {
      if (!word || word.length < 2) return null;
      const norm = normalizeBengaliUnicode(word);

      // 1. রেফের পর ব্যঞ্জন দ্বিত্ব বর্জন (যেমন: কর্ম্ম -> কর্ম, সূর্য্য -> সূর্য, অর্জ্জন -> অর্জন)
      const refDwittoMap = [
        { regex: /র্ম্ম/g, rep: 'র্ম' },
        { regex: /র্জ্জ/g, rep: 'র্জ' },
        { regex: /র্ত্ত/g, rep: 'র্ত' },
        { regex: /র্য্য/g, rep: 'র্য' },
        { regex: /র্দ্দ/g, rep: 'র্দ' },
        { regex: /র্ব্ব/g, rep: 'র্ব' },
        { regex: /র্শ্শ/g, rep: 'র্শ' },
        { regex: /র্চ্চ/g, rep: 'র্চ' },
        { regex: /র্দ্ধ/g, rep: 'র্ধ' },
        { regex: /র্ক্ক/g, rep: 'র্ক' },
        { regex: /র্ণ্ণ/g, rep: 'র্ণ' }
      ];
      for (let i = 0; i < refDwittoMap.length; i++) {
        if (refDwittoMap[i].regex.test(norm)) {
          const corrected = norm.replace(refDwittoMap[i].regex, refDwittoMap[i].rep);
          return {
            correct: [corrected],
            reason: "বাংলা একাডেমির প্রমিত বানানরীতি অনুযায়ী রেফ (র্)-এর পর ব্যঞ্জনবর্ণের দ্বিত্ব হবে না।"
          };
        }
      }

      // 2. শব্দান্ত বিসর্গ (ঃ) বর্জন (যেমন: মূলত: -> মূলত, ফলত: -> ফলত, ক্রমশ: -> ক্রমশ)
      if (norm.endsWith('ঃ')) {
        const corrected = norm.slice(0, -1);
        if (corrected.length >= 2) {
          return {
            correct: [corrected],
            reason: "বাংলা একাডেমি প্রমিত নিয়ম অনুযায়ী শব্দের শেষে বিসর্গ (ঃ) বর্জিত হবে।"
          };
        }
      }

      // 3. 'আলি' প্রত্যয়যুক্ত শব্দে হ্রস্ব-ইকার (ি) ও হ্রস্ব-উকার (যেমন: সোনালী -> সোনালি, রূপালী -> রুপালি, বর্ণালী -> বর্ণালি)
      if (norm.startsWith('রূপালী') || norm.startsWith('রুপালী')) {
        const corrected = norm.replace(/রূ?পালী/g, 'রুপালি');
        return {
          correct: [corrected],
          reason: "বাংলা একাডেমি প্রমিত বানান অনুযায়ী 'আলি' প্রত্যয়যুক্ত শব্দে হ্রস্ব-উকার (ু) ও হ্রস্ব-ইকার (ি) হবে ('রুপালি')।"
        };
      }
      const aliSuffixRegex = /(সোন|বর্ণ|মিত|গীত|দীপ|খেয়|খেয়|পুব|বন)ালী([া-ৌ্]*)$/;
      if (aliSuffixRegex.test(norm)) {
        const corrected = norm.replace(aliSuffixRegex, '$1ালি$2');
        return {
          correct: [corrected],
          reason: "বাংলা একাডেমি প্রমিত বানান অনুযায়ী 'আলি' প্রত্যয়যুক্ত শব্দে সর্বদা হ্রস্ব-ইকার (ি) হবে।"
        };
      }

      // 4. 'আবলি' ও 'অঞ্জলি' প্রত্যয়যুক্ত শব্দে হ্রস্ব-ইকার (যেমন: নিয়মাবলী -> নিয়মাবলি, শ্রদ্ধাঞ্জলী -> শ্রদ্ধাঞ্জলি)
      if (norm.includes('াবলী')) {
        const corrected = norm.replace(/াবলী/g, 'াবলি');
        return {
          correct: [corrected],
          reason: "বাংলা একাডেমি প্রমিত নিয়মে 'আবলি' প্রত্যয়যুক্ত শব্দে সর্বদা হ্রস্ব-ইকার (ি) হবে।"
        };
      }
      if (norm.includes('াঞ্জলী') || norm.includes('অঞ্জলী')) {
        const corrected = norm.replace(/ঞ্জলী/g, 'ঞ্জলি');
        return {
          correct: [corrected],
          reason: "বাংলা একাডেমি প্রমিত নিয়মে 'অঞ্জলি' প্রত্যয়যুক্ত শব্দে সর্বদা হ্রস্ব-ইকার (ি) হবে।"
        };
      }

      // 5. 'তা' ও 'ত্ব' প্রত্যয় যোগে পূর্ববর্তী দীর্ঘ-ঈকার হ্রস্ব-ইকারে পরিবর্তন (যেমন: প্রতিযোগীতা -> প্রতিযোগিতা, সহযোগীতা -> সহযোগিতা)
      const taSuffixRegex = /(প্রতিযোগ|সহযোগ|অধিকার|দায়ী|স্থায়ী|উপযোগ)ী(তা|ত্ব|শালা)([া-ৌ্]*)$/;
      if (taSuffixRegex.test(norm)) {
        const corrected = norm.replace(taSuffixRegex, '$1ি$2$3');
        return {
          correct: [corrected],
          reason: "শব্দে 'তা' বা 'ত্ব' প্রত্যয় যুক্ত হলে পূর্ববর্তী দীর্ঘ-ঈকার হ্রস্ব-ইকারে (ি) পরিণত হয়।"
        };
      }

      // 6. পেশা বা বৃত্তিবাচক 'জীবী' প্রত্যয় (যেমন: আইনজিবি -> আইনজীবী, চাকরিজিবি -> চাকরিজীবী)
      const jibiRegex = /(আইন|শ্রম|চাকরি|পেশা|বুদ্ধি|কৃষি|মুক্ত|কর্ম)জিবি([া-ৌ্]*)$/;
      if (jibiRegex.test(norm)) {
        const corrected = norm.replace(jibiRegex, '$1জীবী$2');
        return {
          correct: [corrected],
          reason: "পেশা বা বৃত্তি অর্থে 'জীবী' প্রত্যয়ে সর্বদা দীর্ঘ-ঈকার (ী) হবে।"
        };
      }

      // 7. বিদেশি ও ইংরেজি শব্দে /st/ ধ্বনিতে 'ষ্ট' বনাম 'স্ট' (যেমন: পোষ্ট -> পোস্ট, ষ্টেশন -> স্টেশন, মাষ্টার -> মাস্টার)
      const stForeignWords = {
        'পোষ্ট': 'পোস্ট', 'ষ্টেশন': 'স্টেশন', 'মাষ্টার': 'মাস্টার', 'আগষ্ট': 'আগস্ট',
        'ষ্টুডিও': 'স্টুডিও', 'রেজিষ্টার': 'রেজিস্টার', 'প্লাষ্টিক': 'প্লাস্টিক',
        'ষ্ট্যান্ড': 'স্ট্যান্ড', 'কাষ্টমার': 'কাস্টমার', 'সিষ্টেম': 'সিস্টেম',
        'টেষ্ট': 'টেস্ট', 'ড্রাফ্ট': 'ড্রাফট', 'লিপষ্টিক': 'লিপস্টিক', 'ফটোষ্ট্যাট': 'ফটোস্ট্যাট',
        'ষ্টাইল': 'স্টাইল', 'ষ্টেডিয়াম': 'স্টেডিয়াম', 'ইনষ্টিটিউট': 'ইনস্টিটিউট', 'ইন্সটিটিউট': 'ইনস্টিটিউট',
        'খ্রীষ্ট': 'খ্রিস্ট', 'খ্রিষ্টাব্দ': 'খ্রিস্টাব্দ'
      };
      for (const [wrong, right] of Object.entries(stForeignWords)) {
        if (norm === wrong || norm.startsWith(wrong)) {
          const corrected = norm.replace(wrong, right);
          return {
            correct: [corrected],
            reason: "ইংরেজি ও বিদেশি শব্দে /st/ ধ্বনিতে ষ-ত্ব বিধান প্রযোজ্য নয়, সর্বদা 'স্ট' (দন্ত্য স) হবে।"
          };
        }
      }

      // 8. ণ-ত্ব বিধান (তৎসম শব্দের ভুল দন্ত্য 'ন' রূপ: যেমন: প্রচারনা -> প্রচারণা, ঘোষনা -> ঘোষণা, কারন -> কারণ)
      const natwaMap = {
        'প্রচারনা': 'প্রচারণা', 'ঘোষনা': 'ঘোষণা', 'বর্ননা': 'বর্ণনা', 'আচরন': 'আচরণ',
        'ধারন': 'ধারণ', 'কারন': 'কারণ', 'গ্রহন': 'গ্রহণ', 'মরন': 'মরণ', 'চরন': 'চরণ',
        'স্মরন': 'স্মরণ', 'পরিনতি': 'পরিণতি', 'পরিনাম': 'পরিণাম', 'প্রেরনা': 'প্রেরণা',
        'উচ্চারন': 'উচ্চারণ', 'নির্ধারন': 'নির্ধারণ', 'নিরীক্ষন': 'নিরীক্ষণ', 'লক্ষন': 'লক্ষণ',
        'রক্ষনাবেক্ষন': 'রক্ষণাবেক্ষণ', 'হরন': 'হরণ', 'বন্টন': 'বণ্টন', 'ঘন্টা': 'ঘণ্টা', 'লন্ঠন': 'লণ্ঠন',
        'ভ্রুণ': 'ভ্রূণ', 'ভ্রুন': 'ভ্রূণ'
      };
      for (const [wrong, right] of Object.entries(natwaMap)) {
        if (norm === wrong || norm.startsWith(wrong)) {
          const corrected = norm.replace(wrong, right);
          return {
            correct: [corrected],
            reason: "ণ-ত্ব বিধান অনুযায়ী তৎসম শব্দে ঋ, র, ষ ও ক্ষ-এর পর মূর্ধন্য 'ণ' হবে।"
          };
        }
      }

      // 9. অতৎসম ও বিদেশি শব্দে 'ণ' বর্জন (সর্বদা দন্ত্য 'ন': যেমন: ধরণ -> ধরন, ঝরণা -> ঝরনা, কোরাণ -> কোরআন)
      const nonNatwaMap = {
        'ধরণ': 'ধরন', 'ঝরণা': 'ঝরনা', 'কোরাণ': 'কোরআন', 'কর্ণার': 'কর্নার',
        'গভর্ণর': 'গভর্নর', 'ইরানী': 'ইরানি', 'জার্মাণ': 'জার্মান', 'হর্ণ': 'হর্ন',
        'গুণ্ডা': 'গুন্ডা', 'লণ্ডভণ্ড': 'লন্ডভন্ড', 'রাণী': 'রানি', 'পরাণ': 'পরান'
      };
      for (const [wrong, right] of Object.entries(nonNatwaMap)) {
        if (norm === wrong || norm.startsWith(wrong)) {
          const corrected = norm.replace(wrong, right);
          return {
            correct: [corrected],
            reason: "বাংলা একাডেমি প্রমিত নিয়মে অতৎসম ও বিদেশি শব্দে ণ-ত্ব বিধান প্রযোজ্য নয়, সর্বদা দন্ত্য 'ন' হবে।"
          };
        }
      }

      // 10. ষ-ত্ব বিধান (যেমন: আবিস্কার -> আবিষ্কার, পরিষ্কার -> পরিষ্কার, পুরষ্কার -> পুরস্কার)
      if (norm.startsWith('আবিস্কার')) {
        return {
          correct: [norm.replace('আবিস্কার', 'আবিষ্কার')],
          reason: "ষ-ত্ব বিধান অনুযায়ী ই-কারান্ত উপসর্গের পর ক-এর সাথে যুক্তবর্ণে মূর্ধন্য 'ষ' (আবিষ্কার) হবে।"
        };
      }
      if (norm.startsWith('পরিষ্কার')) {
        return {
          correct: [norm.replace('পরিষ্কার', 'পরিষ্কার')],
          reason: "ষ-ত্ব বিধান অনুযায়ী ই-কারান্ত উপসর্গের পর মূর্ধন্য 'ষ' (পরিষ্কার) হবে।"
        };
      }
      if (norm.startsWith('পুরষ্কার')) {
        return {
          correct: [norm.replace('পুরষ্কার', 'পুরস্কার')],
          reason: "সন্ধির নিয়মে (পুরঃ + কার) দন্ত্য 'স' যুক্ত হয়ে 'পুরস্কার' হবে।"
        };
      }

      // 11. অতৎসম/বিদেশি শব্দে দীর্ঘ-ঈকার (ী) বর্জন (যেমন: জানুয়ারী -> জানুয়ারি, একাডেমী -> একাডেমি, বাড়ী -> বাড়ি)
      const eeToIForeign = {
        'জানুয়ারী': 'জানুয়ারি', 'ফেব্রুয়ারী': 'ফেব্রুয়ারি', 'ডিগ্রী': 'ডিগ্রি', 'কোম্পানী': 'কোম্পানি',
        'একাডেমী': 'একাডেমি', 'ইংরেজী': 'ইংরেজি', 'আরবী': 'আরবি', 'ফারসী': 'ফারসি', 'জার্মানী': 'জার্মানি',
        'ইতালী': 'ইতালি', 'জাপানী': 'জাপানি', 'চীনা': 'চিনা', 'কোরবানী': 'কোরবানি', 'ঈদানীং': 'ইদানীং',
        'দাদী': 'দাদি', 'নানী': 'নানি', 'মামী': 'মামি', 'মাসী': 'মাসি', 'পিসী': 'পিসি', 'দিদী': 'দিদি',
        'পাখী': 'পাখি', 'হাতী': 'হাতি', 'বাড়ী': 'বাড়ি', 'গাড়ী': 'গাড়ি', 'শাড়ী': 'শাড়ি', 'তরকারী': 'তরকারি',
        'আসামী': 'আসামি', 'বেআইনী': 'বেআইনি', 'সরকারী': 'সরকারি', 'কেরানী': 'কেরানি', 'চুরী': 'চুরি'
      };
      for (const [wrong, right] of Object.entries(eeToIForeign)) {
        if (norm === wrong || norm.startsWith(wrong)) {
          const corrected = norm.replace(wrong, right);
          return {
            correct: [corrected],
            reason: "বাংলা একাডেমির প্রমিত নিয়মে সকল অতৎসম (দেশি, বিদেশি ও মিশ্র) শব্দে সর্বদা হ্রস্ব-ইকার (ি) হবে।"
          };
        }
      }

      return null;
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

      // 2. Bangla Academy Algorithmic Rule
      const grammarRes = this.checkBanglaAcademyGrammar(word);
      if (grammarRes && grammarRes.correct) {
        this.suggestionCache.set(word, grammarRes.correct);
        return grammarRes.correct;
      }

      // 3. Orphan Kar / Broken Start
      if (ORPHAN_KAR_MAP[word]) {
        const karRes = ORPHAN_KAR_MAP[word];
        this.suggestionCache.set(word, karRes);
        return karRes;
      }

      // 4. Conjoined Word Split
      const split = this.splitConjoinedWord(word);
      if (split && split !== word) {
        const splitRes = [split];
        this.suggestionCache.set(word, splitRes);
        return splitRes;
      }

      // 5. Fast fuzzy search (only if word buckets are loaded)
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
        const fullText = this.quill.getText();
        const matches = [];
        const foundErrorsList = [];
        const banglaWordRegex = /[\u0980-\u09FF\u200B-\u200D\uFEFF]+/g;

        let match;
        banglaWordRegex.lastIndex = 0;
        while ((match = banglaWordRegex.exec(fullText)) !== null) {
          const rawWord = match[0];
          const cleanWord = normalizeBengaliUnicode(rawWord.trim());

          if (!cleanWord || cleanWord.length === 0 || this.ignoredWords.has(cleanWord)) continue;

          // 1. Direct Rule Match ($O(1)$)
          if (this.rulesDictionary[cleanWord]) {
            const data = this.rulesDictionary[cleanWord];
            if (data && data.correct && !data.correct.includes(cleanWord)) {
              const errObj = {
                index: match.index,
                length: rawWord.length,
                word: cleanWord,
                correct: Array.isArray(data.correct) ? data.correct : [data.correct],
                reason: data.reason || 'বাংলা একাডেমির প্রমিত বানান নিয়ম অনুযায়ী সংশোধন প্রয়োজন।',
                isBroken: false
              };
              matches.push(errObj);
              foundErrorsList.push(errObj);
              continue;
            }
          }

          // 2. Bangla Academy Algorithmic Grammar Rule ($O(1)$)
          const grammarCheck = this.checkBanglaAcademyGrammar(cleanWord);
          if (grammarCheck) {
            const errObj = {
              index: match.index,
              length: rawWord.length,
              word: cleanWord,
              correct: grammarCheck.correct,
              reason: grammarCheck.reason,
              isBroken: false
            };
            matches.push(errObj);
            foundErrorsList.push(errObj);
            continue;
          }

          // 3. Orphan Kar / Broken Starting Character ($O(1)$)
          if (ORPHAN_KAR_MAP[cleanWord]) {
            const errObj = {
              index: match.index,
              length: rawWord.length,
              word: cleanWord,
              correct: ORPHAN_KAR_MAP[cleanWord],
              reason: 'শব্দের শুরুর বর্ণটি অসম্পূর্ণ বা বাদ পড়েছে। সঠিক শব্দটি বেছে নিন।',
              isBroken: true
            };
            matches.push(errObj);
            foundErrorsList.push(errObj);
            continue;
          }
          // 4. Conjoined Word (Missing space) / Unknown Word
          else if (!this.isWordValidStrict(cleanWord)) {
            const splitResult = this.splitConjoinedWord(cleanWord);
            if (splitResult && splitResult !== cleanWord) {
              const errObj = {
                index: match.index,
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
                index: match.index,
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
        <div class="payasti-spell-popover-actions">
          <button type="button" class="payasti-spell-btn-add-dict" id="btnAddDictWord" title="এই শব্দটি শুদ্ধ হিসেবে ডিকশনারিতে সংরক্ষণ করুন">
            + ডিকশনারিতে যোগ করুন
          </button>
        </div>
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

      const addDictBtn = popover.querySelector('#btnAddDictWord');
      if (addDictBtn) {
        addDictBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.saveUserCustomWord(word);
          this.hidePopover();
          this.scanDocument();
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
  window.PayastiSpellChecker = PayastiSpellChecker;
  window.attachPayastiSpellChecker = function (quillInstance, options) {
    return new PayastiSpellChecker(quillInstance, options);
  };

})();
