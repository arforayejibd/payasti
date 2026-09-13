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

/**
 * Format card excerpt preserving poetry line breaks (<br>) and removing &nbsp;/nbsp;
 * Matches live Oxygen builder PHP script:
 * $content = strip_tags($content, '<br>');
 * $content = str_replace(['<br>', '<br/>', '<br />'], "\n", $content);
 * trimmed to 18 words, output with <br>
 */
function formatCardExcerpt(rawContent, maxWords = 18) {
  if (!rawContent) return '';

  let text = String(rawContent)
    // Remove Gutenberg block comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove non-breaking spaces and entity garbage
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;nbsp;/gi, ' ')
    .replace(/\bnbsp;?/gi, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&zwnj;/g, '')
    .replace(/&zwj;/g, '');

  // Convert break and block tags to newline
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|section|article|tr)>/gi, '\n')
    .replace(/<(p|div|h[1-6]|li|blockquote|section|article|tr)[^>]*>/gi, '\n')
    // Strip all other HTML tags
    .replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'");

  const lines = text.split(/\r\n|\r|\n/);
  const trimmedLines = [];
  let totalWords = 0;

  for (let line of lines) {
    if (totalWords >= maxWords) break;

    // Clean multiple spaces within the line
    line = line.trim().replace(/[ \t]+/g, ' ');
    if (line === '') continue;

    const words = line.split(' ').filter(w => w.length > 0);
    const count = words.length;

    if (totalWords + count <= maxWords) {
      trimmedLines.push(line);
      totalWords += count;
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

  return trimmedLines.join('<br>');
}

/**
 * Format article content for single post view:
 * Cleans Gutenberg comments, escaped quotes, and &nbsp; artifacts
 */
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

  // If content has HTML tags, return it clean
  if (/<(p|br|div|blockquote|h[1-6]|ul|ol|table)\b/i.test(clean)) {
    return clean;
  }

  // Plain text fallback: convert newlines to <br>
  return clean.replace(/\r\n|\r|\n/g, '<br>');
}

/**
 * Calculate estimated reading time for article content in Bengali
 * Average reading speed for Bengali text: ~160-180 words per minute
 */
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

function generateCleanExcerpt(content, maxChars = 200) {
  if (!content) return '';
  let text = String(content)
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

  const lines = text.split(/\r\n|\r|\n/)
    .map(l => l.trim().replace(/[ \t]+/g, ' '))
    .filter(l => l.length > 0);

  const result = lines.join('\n');
  if (result.length <= maxChars) return result;
  return result.substring(0, maxChars) + '...';
}

module.exports = {
  toBengaliNumber,
  formatBengaliDate,
  formatDuration,
  formatCardExcerpt,
  generateCleanExcerpt,
  renderArticleContent,
  calculateReadingTime
};
