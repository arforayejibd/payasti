const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const bengaliMonths = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর'
];

function toBengaliNumber(num) {
  if (num === null || num === undefined) return '';
  return num
    .toString()
    .split('')
    .map(ch => {
      const parsed = parseInt(ch);
      return !isNaN(parsed) ? bengaliDigits[parsed] : ch;
    })
    .join('');
}

function formatBengaliDate(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;

  const monthName = bengaliMonths[d.getMonth()];
  const day = toBengaliNumber(d.getDate());
  const year = toBengaliNumber(d.getFullYear());

  return `${monthName} ${day}, ${year}`;
}

function formatDuration(startDateInput) {
  if (!startDateInput) return '১ বছর';
  const start = new Date(startDateInput);
  const now = new Date();
  
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    days += 30;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const bnYears = toBengaliNumber(Math.max(0, years));
  const bnMonths = toBengaliNumber(Math.max(0, months));
  const bnDays = toBengaliNumber(Math.max(0, days));

  return `${bnYears} বছর ${bnMonths} মাস ${bnDays} দিন`;
}

function formatCardExcerpt(rawContent, maxWords = 24, maxLines = 3) {
  if (!rawContent) return '';

  let text = String(rawContent)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;nbsp;/gi, ' ')
    .replace(/\bnbsp;?/gi, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&zwnj;/g, '')
    .replace(/&zwj;/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|section|article|tr)>/gi, '\n')
    .replace(/<(p|div|h[1-6]|li|blockquote|section|article|tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'");

  const rawLines = text.split(/\r\n|\r|\n/);
  const trimmedLines = [];
  let totalWords = 0;

  for (let line of rawLines) {
    if (trimmedLines.length >= maxLines || totalWords >= maxWords) break;

    line = line.trim().replace(/[ \t]+/g, ' ');
    if (line === '') continue;

    const words = line.split(' ').filter(w => w.length > 0);
    const count = words.length;

    if (totalWords + count <= maxWords) {
      trimmedLines.push(line);
      totalWords += count;
      if (trimmedLines.length === maxLines && !trimmedLines[trimmedLines.length - 1].endsWith('...')) {
        trimmedLines[trimmedLines.length - 1] += '...';
        break;
      }
    } else {
      const remaining = maxWords - totalWords;
      if (remaining > 0) {
        trimmedLines.push(words.slice(0, remaining).join(' ') + '...');
      } else if (trimmedLines.length > 0 && !trimmedLines[trimmedLines.length - 1].endsWith('...')) {
        trimmedLines[trimmedLines.length - 1] += '...';
      }
      break;
    }
  }

  const allWords = text.trim().split(/\s+/).filter(Boolean);
  if (trimmedLines.length > 0 && !trimmedLines[trimmedLines.length - 1].endsWith('...') && allWords.length > totalWords) {
    trimmedLines[trimmedLines.length - 1] += '...';
  }

  return trimmedLines.join('<br>');
}

/**
 * Automatically extracts Table of Contents (TOC) from H2 & H3 tags and injects IDs
 */
function generateTableOfContents(htmlContent) {
  if (!htmlContent) return { toc: [], content: '' };

  const toc = [];
  let headingIndex = 0;

  let clean = String(htmlContent)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;nbsp;/gi, ' ')
    .replace(/\bnbsp;?/gi, ' ')
    .trim();

  // Replace H2 and H3 tags with IDs
  const contentWithIds = clean.replace(/<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, text) => {
    headingIndex++;
    const plainText = text.replace(/<[^>]+>/g, '').trim();
    if (!plainText) return match;

    const slugId = `section-${headingIndex}-${plainText
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || headingIndex}`;

    toc.push({
      id: slugId,
      text: plainText,
      level: tag.toLowerCase() === 'h2' ? 2 : 3
    });

    // Check if ID already exists
    if (/id=["'][^"']*["']/i.test(attrs)) {
      return match;
    }

    return `<${tag}${attrs} id="${slugId}">${text}</${tag}>`;
  });

  return { toc, content: contentWithIds };
}

function renderArticleContent(content) {
  if (!content) return '';

  let clean = String(content)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;nbsp;/gi, ' ')
    .replace(/\bnbsp;?/gi, ' ')
    .trim();

  return clean;
}

function calculateReadingTime(content) {
  if (!content) return '১ মিনিটের পাঠ';
  const plainText = String(content)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = plainText ? plainText.split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 160));
  return `${toBengaliNumber(minutes)} মিনিটের পাঠ`;
}

module.exports = {
  toBengaliNumber,
  formatBengaliDate,
  formatDuration,
  formatCardExcerpt,
  renderArticleContent,
  generateTableOfContents,
  calculateReadingTime
};
