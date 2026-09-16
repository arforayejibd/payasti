const fs = require('fs');
const path = require('path');

const validWordsPath = path.join(__dirname, '../public/data/bangla_wordlist_80k.json');
const dictionaryPath = path.join(__dirname, '../public/data/bangla_spelling_dictionary.json');

const validWords = JSON.parse(fs.readFileSync(validWordsPath, 'utf8'));
const currentDict = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));

const wordsMap = Object.assign({}, currentDict.words);

// Generate rule-based misspellings from the 100k words list based on Bangla Academy standards:
validWords.forEach(word => {
  // 1. -আবলি / -অঞ্জলি প্রত্যয়
  if (word.endsWith('াবলি') && word.length > 4) {
    const wrong = word.slice(0, -1) + 'ী';
    if (!wordsMap[wrong]) {
      wordsMap[wrong] = {
        correct: [word],
        category: 'anjali_abali',
        reason: "'আবলি' প্রত্যয়যুক্ত শব্দে বাংলা একাডেমির নিয়মে সর্বদা হ্রস্ব-ইকার (ি) হবে।"
      };
    }
  }

  if (word.endsWith('অঞ্জলি') || word.endsWith('াঞ্জলি')) {
    const wrong = word.slice(0, -1) + 'ী';
    if (!wordsMap[wrong]) {
      wordsMap[wrong] = {
        correct: [word],
        category: 'anjali_abali',
        reason: "'অঞ্জলি' যুক্ত শব্দে প্রমিত বানানে সর্বদা হ্রস্ব-ইকার (ি) হবে।"
      };
    }
  }

  // 2. -আলি প্রত্যয় (রুপালি, সোনালি, বর্ণালি, ইত্যাদি)
  if (word.endsWith('ালি') && word.length >= 4) {
    const wrong = word.slice(0, -1) + 'ী';
    if (!wordsMap[wrong]) {
      wordsMap[wrong] = {
        correct: [word],
        category: 'ee_to_i',
        reason: "'আলি' প্রত্যয়যুক্ত শব্দে সর্বদা হ্রস্ব-ইকার (ি) হবে।"
      };
    }
  }

  // 3. -জীবী প্রত্যয় (আইনজীবী, চাকরিজীবী, ইত্যাদি)
  if (word.endsWith('জীবী') && word.length > 4) {
    const wrong = word.slice(0, -1) + 'ি';
    if (!wordsMap[wrong]) {
      wordsMap[wrong] = {
        correct: [word],
        category: 'jibi_suffix',
        reason: "পেশা বা বৃত্তি অর্থে 'জীবী' প্রত্যয়ে সর্বদা দীর্ঘ-ঈকার (ী) হবে।"
      };
    }
    const wrong2 = word.slice(0, -4) + 'জিবি';
    if (!wordsMap[wrong2]) {
      wordsMap[wrong2] = {
        correct: [word],
        category: 'jibi_suffix',
        reason: "পেশা বা বৃত্তি অর্থে 'জীবী' প্রত্যয়ে সর্বদা দীর্ঘ-ঈকার (ী) হবে।"
      };
    }
  }

  // 4. রেফের পর ব্যঞ্জন দ্বিত্ব বর্জন:
  const refReplacements = [
    { target: 'র্ম', wrong: 'র্ম্ম', reason: "রেফের পর 'ম' দ্বিত্ব হবে না: '" + word + "' শুদ্ধ।" },
    { target: 'র্জ', wrong: 'র্জ্জ', reason: "রেফের পর 'জ' দ্বিত্ব হবে না: '" + word + "' শুদ্ধ।" },
    { target: 'র্ত', wrong: 'র্ত্ত', reason: "রেফের পর 'ত' দ্বিত্ব হবে না: '" + word + "' শুদ্ধ।" },
    { target: 'র্য', wrong: 'র্য্য', reason: "রেফের পর 'য' দ্বিত্ব হবে না: '" + word + "' শুদ্ধ।" },
    { target: 'র্দ', wrong: 'র্দ্দ', reason: "রেফের পর 'দ' দ্বিত্ব হবে না: '" + word + "' শুদ্ধ।" },
    { target: 'র্ব', wrong: 'র্ব্ব', reason: "রেফের পর 'ব' দ্বিত্ব হবে না: '" + word + "' শুদ্ধ।" },
    { target: 'র্শ', wrong: 'র্শ্শ', reason: "রেফের পর 'শ' দ্বিত্ব হবে না: '" + word + "' শুদ্ধ।" },
    { target: 'র্চ', wrong: 'র্চ্চ', reason: "রেফের পর 'চ' দ্বিত্ব হবে না: '" + word + "' শুদ্ধ।" }
  ];

  refReplacements.forEach(r => {
    if (word.includes(r.target)) {
      const wrong = word.replace(r.target, r.wrong);
      if (!wordsMap[wrong]) {
        wordsMap[wrong] = {
          correct: [word],
          category: 'ref_dwitto',
          reason: r.reason
        };
      }
    }
  });

  // 5. বিদেশী শব্দে স্ট vs ষ্ট
  if (word.includes('স্ট')) {
    const wrong = word.replace(/স্ট/g, 'ষ্ট');
    if (!wordsMap[wrong]) {
      wordsMap[wrong] = {
        correct: [word],
        category: 'sh_to_s',
        reason: "বিদেশি শব্দে মূর্ধন্য 'ষ' বা 'ষ্ট' হবে না, দন্ত্য 'স্ট' হবে।"
      };
    }
  }

  // 6. বিদেশী শব্দে র্ণ vs র্ন
  if (word.includes('র্ন') && (word.includes('কর্') || word.includes('গভ') || word.includes('হর্') || word.includes('টা'))) {
    const wrong = word.replace(/র্ন/g, 'র্ণ');
    if (!wordsMap[wrong]) {
      wordsMap[wrong] = {
        correct: [word],
        category: 'n_rules',
        reason: "বিদেশি শব্দে মূর্ধন্য 'ণ' হবে না, দন্ত্য 'ন' হবে।"
      };
    }
  }
});

currentDict.totalRules = Object.keys(wordsMap).length;
currentDict.validWordCount = validWords.length;
currentDict.words = wordsMap;

fs.writeFileSync(dictionaryPath, JSON.stringify(currentDict, null, 2), 'utf8');
console.log('Successfully enriched bangla_spelling_dictionary.json!');
console.log('Total spelling correction rules in dictionary:', Object.keys(wordsMap).length);
console.log('Total valid words vocabulary in wordlist:', validWords.length);
