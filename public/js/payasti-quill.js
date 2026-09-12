/**
 * Payasti Quill Rich Text Editor Helper
 * Enables Soft Line Breaks (<br>), Paragraph spacing, Bengali typography,
 * Keyboard shortcuts (Shift+Enter for <br>, Enter for <p>),
 * and Clipboard newline preservation.
 */
(function() {
  if (typeof Quill === 'undefined') return;

  // 1. Register Soft Line Break Embed Blot (<br>)
  try {
    const Embed = Quill.import('blots/embed');
    class SoftLineBreakBlot extends Embed {
      static blotName = 'softbreak';
      static tagName = 'br';
    }
    Quill.register(SoftLineBreakBlot, true);
  } catch (e) {
    console.warn('Could not register SoftLineBreakBlot:', e);
  }

  // 2. Global Factory for Payasti Quill Instance
  window.createPayastiEditor = function(selector, options) {
    options = options || {};
    const Delta = Quill.import('delta');

    const defaultToolbar = [
      [{ 'header': [2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'clean']
    ];

    const quill = new Quill(selector, {
      theme: 'snow',
      placeholder: options.placeholder || 'এখানে আপনার মূল সাহিত্য বা লেখা লিখুন...',
      modules: {
        toolbar: options.toolbar || defaultToolbar,
        keyboard: {
          bindings: {
            shiftEnter: {
              key: 'Enter',
              shiftKey: true,
              handler: function(range) {
                this.quill.insertEmbed(range.index, 'softbreak', true, Quill.sources.USER);
                this.quill.setSelection(range.index + 1, Quill.sources.SILENT);
                return false;
              }
            }
          }
        },
        clipboard: {
          matchVisual: false,
          matchers: [
            ['BR', function(node, delta) {
              return new Delta().insert({ softbreak: true });
            }],
            [Node.TEXT_NODE, function(node, delta) {
              if (node.data && node.data.includes('\n')) {
                const lines = node.data.split('\n');
                const res = new Delta();
                lines.forEach((line, idx) => {
                  if (line) res.insert(line);
                  if (idx < lines.length - 1) {
                    res.insert({ softbreak: true });
                  }
                });
                return res;
              }
              return delta;
            }]
          ]
        }
      }
    });

    return quill;
  };

  // Helper to safely clean and prepare HTML for loading into editor
  window.cleanArticleHtmlForEditor = function(rawHtml) {
    if (!rawHtml) return '';
    let clean = String(rawHtml)
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .trim();

    // If plain text with newlines and no HTML tags, convert newlines to paragraphs & breaks
    if (!/<(p|br|div|blockquote|h[1-6]|ul|ol|table)\b/i.test(clean)) {
      clean = clean
        .split(/\r?\n\r?\n/)
        .map(para => '<p>' + para.replace(/\r?\n/g, '<br>') + '</p>')
        .join('');
    }
    return clean;
  };
})();
