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

    const defaultToolbarOptions = [
      [{ 'header': [2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'clean']
    ];

    const quill = new Quill(selector, {
      theme: 'snow',
      placeholder: options.placeholder || 'এখানে আপনার মূল সাহিত্য বা লেখা লিখুন...',
      modules: {
        toolbar: {
          container: options.toolbar || defaultToolbarOptions,
          handlers: {
            image: function() {
              if (window.PayastiMediaModal && typeof window.PayastiMediaModal.open === 'function') {
                const range = quill.getSelection(true) || { index: 0, length: 0 };
                window.PayastiMediaModal.open({
                  onSelect: function(file) {
                    quill.insertEmbed(range.index, 'image', file.url, Quill.sources.USER);
                    quill.setSelection(range.index + 1, Quill.sources.SILENT);
                  }
                });
              } else {
                const url = prompt('ছবির সরাসরি ওয়েব লিংক (URL) দিন:');
                if (url) {
                  const range = quill.getSelection(true) || { index: 0, length: 0 };
                  quill.insertEmbed(range.index, 'image', url.trim(), Quill.sources.USER);
                  quill.setSelection(range.index + 1, Quill.sources.SILENT);
                }
              }
            },
            // Custom link handler that preserves scroll position and doesn't jump to top
            link: function(value) {
              const currentRange = quill.getSelection();
              if (!currentRange || currentRange.length === 0) {
                alert('অনুগ্রহ করে যে শব্দ বা লেখায় লিংক যুক্ত করতে চান, সেটি আগে মাউস দিয়ে সিলেক্ট (Select) করুন।');
                return;
              }
              const scrollY = window.scrollY;
              const format = quill.getFormat(currentRange);
              const existingUrl = format.link || '';
              
              const inputUrl = prompt('ওয়েব লিংক (URL) লিখুন বা পেস্ট করুন:', existingUrl || 'https://');
              window.scrollTo(0, scrollY);
              
              if (inputUrl !== null) {
                const trimmed = inputUrl.trim();
                if (trimmed && trimmed !== 'https://' && trimmed !== 'http://') {
                  let finalUrl = trimmed;
                  if (!/^https?:\/\//i.test(finalUrl) && !/^mailto:/i.test(finalUrl)) {
                    finalUrl = 'https://' + finalUrl;
                  }
                  quill.format('link', finalUrl, Quill.sources.USER);
                } else {
                  quill.format('link', false, Quill.sources.USER);
                }
              }
              quill.setSelection(currentRange.index, currentRange.length, Quill.sources.SILENT);
              window.scrollTo(0, scrollY);
            }
          }
        },
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
            },
            linkShortcut: {
              key: 'k',
              shortKey: true,
              handler: function(range) {
                const toolbar = quill.getModule('toolbar');
                if (toolbar && toolbar.handlers && toolbar.handlers.link) {
                  toolbar.handlers.link.call(toolbar, true);
                }
                return false;
              }
            }
          }
        },
        clipboard: options.clipboard || {
          matchVisual: false
        }
      }
    });

    // Paste handler that preserves stanza breaks (double enters) for poems
    quill.root.addEventListener('paste', function(e) {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      const text = clipboardData.getData('text/plain');
      const html = clipboardData.getData('text/html');

      if (text && (!html || !/<(table|h[1-6]|img|svg|iframe)\b/i.test(html))) {
        e.preventDefault();
        // Clean line breaks while keeping poem stanzas & multiple poem separation
        const cleanText = text
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        const selection = quill.getSelection(true) || { index: 0, length: 0 };
        quill.deleteText(selection.index, selection.length, Quill.sources.USER);
        quill.insertText(selection.index, cleanText, Quill.sources.USER);
        quill.setSelection(selection.index + cleanText.length, Quill.sources.SILENT);
      }
    });

    return quill;
  };

  // Helper to remove consecutive empty paragraphs / extra enters from editor
  window.removeExtraEntersFromQuill = function(quill) {
    if (!quill) return;
    try {
      const lines = quill.getLines(0, quill.getLength());
      let lastWasEmpty = false;
      const toDelete = [];

      lines.forEach(line => {
        const text = (line.domNode && line.domNode.innerText) ? line.domNode.innerText.replace(/\uFEFF/g, '').trim() : '';
        const isEmpty = line.length() <= 1 && text === '';
        if (isEmpty) {
          if (lastWasEmpty) {
            toDelete.push({
              index: quill.getIndex(line),
              length: line.length()
            });
          }
          lastWasEmpty = true;
        } else {
          lastWasEmpty = false;
        }
      });

      toDelete.reverse().forEach(item => {
        quill.deleteText(item.index, item.length, Quill.sources.USER);
      });
    } catch (e) {
      console.warn('Error removing extra enters:', e);
    }
  };

  // Helper to safely clean and prepare HTML for loading into editor
  window.cleanArticleHtmlForEditor = function(rawHtml) {
    if (!rawHtml) return '';
    let clean = String(rawHtml)
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/(<p>\s*(<br\s*\/?>|&nbsp;|\s)*<\/p>\s*){2,}/gi, '<p><br></p>')
      .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
      .trim();

    // If plain text with newlines and no HTML block tags, convert newlines to paragraphs & breaks
    if (!/<(p|br|div|blockquote|h[1-6]|ul|ol|table)\b/i.test(clean)) {
      clean = clean
        .split(/\r?\n\s*\r?\n+/)
        .map(para => {
          const lines = para.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
          return lines.length ? '<p>' + lines.join('<br>') + '</p>' : '';
        })
        .filter(Boolean)
        .join('');
    }
    return clean;
  };
})();
