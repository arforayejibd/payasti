/**
 * Sera 10 - Modern Block Editor (Powered by Editor.js)
 * High-performance, fault-tolerant block editor for affiliate reviews and top-10 lists
 */

(function(window) {
  'use strict';

  // Custom Product Box / Affiliate CTA Block for Editor.js
  class ProductBoxBlock {
    static get toolbox() {
      return {
        title: 'প্রোডাক্ট / এফিলিয়েট বক্স',
        icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>'
      };
    }

    constructor({ data }) {
      this.data = {
        badge: (data && data.badge) || '#১ সেরা পছন্দ',
        title: (data && data.title) || '',
        price: (data && data.price) || '',
        rating: (data && data.rating) || '৪.৮/৫',
        pros: (data && data.pros) || '',
        cons: (data && data.cons) || '',
        affiliateUrl: (data && data.affiliateUrl) || '#',
        buttonText: (data && data.buttonText) || 'সেরা অফার দেখুন / Buy Now'
      };
      this.wrapper = null;
    }

    render() {
      this.wrapper = document.createElement('div');
      this.wrapper.classList.add('editorjs-product-box-wrapper');
      this.wrapper.style.cssText = 'background: #f8fafc; border: 2px dashed #059669; border-radius: 12px; padding: 16px; margin: 16px 0;';

      this.wrapper.innerHTML = `
        <div style="font-weight: bold; color: #059669; font-size: 13px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
          <span>📦 প্রোডাক্ট রিভিউ ও এফিলিয়েট বক্স</span>
          <span style="font-size: 11px; background: #e6f4ea; color: #137333; padding: 2px 8px; border-radius: 4px;">ব্লক</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
          <input type="text" class="prod-badge admin-form-input" placeholder="ব্যাজ (যেমন: #১ সেরা পছন্দ)" value="${this.escapeHtml(this.data.badge)}" style="font-size: 13px; padding: 6px 10px;">
          <input type="text" class="prod-rating admin-form-input" placeholder="রেটিং (যেমন: ৪.৮/৫)" value="${this.escapeHtml(this.data.rating)}" style="font-size: 13px; padding: 6px 10px;">
        </div>
        <input type="text" class="prod-title admin-form-input" placeholder="প্রোডাক্টের নাম / মডেল" value="${this.escapeHtml(this.data.title)}" style="font-size: 15px; font-weight: bold; padding: 8px 12px; margin-bottom: 10px; width: 100%;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
          <textarea class="prod-pros admin-form-input" placeholder="সুবিধা / Pros (কমা বা নতুন লাইনে)" style="font-size: 12px; height: 60px; resize: vertical;">${this.escapeHtml(this.data.pros)}</textarea>
          <textarea class="prod-cons admin-form-input" placeholder="অসুবিধা / Cons (কমা বা নতুন লাইনে)" style="font-size: 12px; height: 60px; resize: vertical;">${this.escapeHtml(this.data.cons)}</textarea>
        </div>
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
          <input type="text" class="prod-aff-url admin-form-input" placeholder="এফিলিয়েট লিঙ্ক (URL)" value="${this.escapeHtml(this.data.affiliateUrl)}" style="font-size: 13px; padding: 6px 10px;">
          <input type="text" class="prod-btn-text admin-form-input" placeholder="বাটন টেক্সট" value="${this.escapeHtml(this.data.buttonText)}" style="font-size: 13px; padding: 6px 10px;">
        </div>
      `;

      return this.wrapper;
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    save(blockContent) {
      return {
        badge: (blockContent.querySelector('.prod-badge') && blockContent.querySelector('.prod-badge').value) || '',
        title: (blockContent.querySelector('.prod-title') && blockContent.querySelector('.prod-title').value) || '',
        rating: (blockContent.querySelector('.prod-rating') && blockContent.querySelector('.prod-rating').value) || '',
        pros: (blockContent.querySelector('.prod-pros') && blockContent.querySelector('.prod-pros').value) || '',
        cons: (blockContent.querySelector('.prod-cons') && blockContent.querySelector('.prod-cons').value) || '',
        affiliateUrl: (blockContent.querySelector('.prod-aff-url') && blockContent.querySelector('.prod-aff-url').value) || '',
        buttonText: (blockContent.querySelector('.prod-btn-text') && blockContent.querySelector('.prod-btn-text').value) || ''
      };
    }
  }

  // HTML to Editor.js Blocks Parser
  function htmlToEditorBlocks(htmlString) {
    if (!htmlString || typeof htmlString !== 'string' || !htmlString.trim()) {
      return [];
    }

    // Clean Gutenberg / WordPress comments first
    let clean = htmlString
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .trim();

    if (!clean) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(clean, 'text/html');
    const nodes = Array.from(doc.body.childNodes);
    const blocks = [];

    nodes.forEach(node => {
      try {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (text) {
            blocks.push({ type: 'paragraph', data: { text: text } });
          }
          return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();

        // 1. Headings
        if (/^h[1-6]$/.test(tag)) {
          const level = parseInt(tag.charAt(1), 10);
          const text = node.innerHTML.trim();
          if (text) {
            blocks.push({
              type: 'header',
              data: {
                text: text,
                level: Math.min(Math.max(level, 2), 4)
              }
            });
          }
          return;
        }

        // 2. Lists
        if (tag === 'ul' || tag === 'ol') {
          const items = Array.from(node.querySelectorAll('li'))
            .map(li => li.innerHTML.trim())
            .filter(Boolean);
          if (items.length > 0) {
            blocks.push({
              type: 'list',
              data: {
                style: tag === 'ol' ? 'ordered' : 'unordered',
                items: items
              }
            });
          }
          return;
        }

        // 3. Images
        if (tag === 'img') {
          const src = node.getAttribute('src');
          if (src) {
            blocks.push({
              type: 'image',
              data: {
                url: src,
                caption: node.getAttribute('alt') || ''
              }
            });
          }
          return;
        }

        // 4. Figure with Image
        if (tag === 'figure') {
          const img = node.querySelector('img');
          const cap = node.querySelector('figcaption');
          if (img && img.getAttribute('src')) {
            blocks.push({
              type: 'image',
              data: {
                url: img.getAttribute('src'),
                caption: cap ? cap.innerHTML.trim() : (img.getAttribute('alt') || '')
              }
            });
            return;
          }
        }

        // 5. Blockquotes
        if (tag === 'blockquote') {
          const text = node.innerHTML.trim();
          if (text) {
            blocks.push({
              type: 'quote',
              data: {
                text: text,
                caption: '',
                alignment: 'left'
              }
            });
          }
          return;
        }

        // 6. Tables
        if (tag === 'table') {
          const rows = Array.from(node.querySelectorAll('tr')).map(tr => {
            return Array.from(tr.querySelectorAll('th, td')).map(cell => cell.innerHTML.trim());
          }).filter(r => r.length > 0);

          if (rows.length > 0) {
            blocks.push({
              type: 'table',
              data: {
                withHeadings: node.querySelector('th') !== null,
                content: rows
              }
            });
          }
          return;
        }

        // 7. Product Review Card
        if (node.classList && node.classList.contains('sera10-product-review-card')) {
          const badge = node.querySelector('.prod-card-badge')?.textContent?.trim() || '#১ সেরা পছন্দ';
          const title = node.querySelector('.prod-card-title')?.textContent?.trim() || '';
          const rating = node.querySelector('.prod-card-rating')?.textContent?.trim() || '৪.৮/৫';
          const pros = node.querySelector('.prod-pros-list')?.innerHTML?.replace(/<br\s*\/?>/gi, '\n')?.trim() || '';
          const cons = node.querySelector('.prod-cons-list')?.innerHTML?.replace(/<br\s*\/?>/gi, '\n')?.trim() || '';
          const btn = node.querySelector('.prod-affiliate-btn');
          const affiliateUrl = btn?.getAttribute('href') || '#';
          const buttonText = btn?.textContent?.trim() || 'সেরা অফার দেখুন / Buy Now';

          blocks.push({
            type: 'productBox',
            data: { badge, title, rating, pros, cons, affiliateUrl, buttonText }
          });
          return;
        }

        // 8. Delimiter / HR
        if (tag === 'hr') {
          blocks.push({ type: 'delimiter', data: {} });
          return;
        }

        // Default Paragraph
        const inner = node.innerHTML.trim();
        if (inner) {
          blocks.push({
            type: 'paragraph',
            data: { text: inner }
          });
        }
      } catch (err) {
        console.warn('Error parsing node to block:', err);
      }
    });

    return blocks;
  }

  // Editor.js Blocks to Clean Semantic HTML Parser
  function editorBlocksToHtml(outputData) {
    if (!outputData || !outputData.blocks || !outputData.blocks.length) {
      return '';
    }

    let html = '';

    outputData.blocks.forEach(block => {
      try {
        switch (block.type) {
          case 'header':
            const level = block.data.level || 2;
            if (block.data.text && block.data.text.trim()) {
              html += `<h${level}>${block.data.text}</h${level}>\n`;
            }
            break;

          case 'paragraph':
            if (block.data.text && block.data.text.trim()) {
              html += `<p>${block.data.text}</p>\n`;
            }
            break;

          case 'list':
            const listTag = (block.data.style === 'ordered') ? 'ol' : 'ul';
            const items = block.data.items || [];
            if (items.length) {
              const itemsHtml = items.map(item => {
                const text = typeof item === 'object' ? (item.content || '') : item;
                return `<li>${text}</li>`;
              }).join('\n');
              html += `<${listTag}>\n${itemsHtml}\n</${listTag}>\n`;
            }
            break;

          case 'image':
            const url = (block.data.file && block.data.file.url) || block.data.url || '';
            if (url) {
              const caption = block.data.caption || '';
              html += `<figure class="article-image-box my-6"><img src="${url}" alt="${caption}" class="rounded-xl shadow-sm max-w-full h-auto">${caption ? `<figcaption class="text-xs text-center text-slate-500 mt-1.5">${caption}</figcaption>` : ''}</figure>\n`;
            }
            break;

          case 'quote':
            if (block.data.text && block.data.text.trim()) {
              html += `<blockquote class="border-l-4 border-emerald-600 pl-4 my-4 italic text-slate-700"><p>${block.data.text}</p>${block.data.caption ? `<cite class="block text-xs font-bold not-italic text-slate-500 mt-1">— ${block.data.caption}</cite>` : ''}</blockquote>\n`;
            }
            break;

          case 'table':
            if (block.data.content && block.data.content.length) {
              html += `<div class="overflow-x-auto my-6"><table class="w-full border-collapse border border-slate-200">\n`;
              block.data.content.forEach((row, rIdx) => {
                html += `<tr>\n`;
                row.forEach(cell => {
                  if (rIdx === 0 && block.data.withHeadings) {
                    html += `<th class="border border-slate-200 bg-slate-100 p-2.5 text-left font-bold">${cell}</th>\n`;
                  } else {
                    html += `<td class="border border-slate-200 p-2.5">${cell}</td>\n`;
                  }
                });
                html += `</tr>\n`;
              });
              html += `</table></div>\n`;
            }
            break;

          case 'delimiter':
            html += `<hr class="my-8 border-slate-200">\n`;
            break;

          case 'warning':
            html += `<div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r-lg"><strong class="text-amber-900">${block.data.title || 'নোট:'}</strong><p class="text-amber-800 text-sm mt-1">${block.data.message || ''}</p></div>\n`;
            break;

          case 'embed':
            const embedSrc = block.data.embed || '';
            if (embedSrc) {
              html += `<div class="aspect-video my-6 rounded-xl overflow-hidden shadow-sm"><iframe src="${embedSrc}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe></div>\n`;
            }
            break;

          case 'productBox':
            const d = block.data;
            html += `
              <div class="sera10-product-review-card bg-slate-50 border border-emerald-500/80 rounded-2xl p-5 my-8 shadow-sm">
                <div class="flex items-center justify-between gap-2 mb-3">
                  <span class="prod-card-badge bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-md">${d.badge || '#১ সেরা পছন্দ'}</span>
                  <span class="prod-card-rating text-xs font-bold text-amber-500">★ ${d.rating || '৪.৮/৫'}</span>
                </div>
                <h3 class="prod-card-title text-xl font-bold text-slate-900 mb-3">${d.title || ''}</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                  ${d.pros ? `<div class="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl"><strong class="text-emerald-800 text-xs font-bold">✓ ভালো দিক (Pros):</strong><div class="prod-pros-list text-xs text-emerald-900 mt-1 leading-relaxed">${d.pros.replace(/\n/g, '<br>')}</div></div>` : ''}
                  ${d.cons ? `<div class="bg-red-50/60 border border-red-200 p-3 rounded-xl"><strong class="text-red-800 text-xs font-bold">✗ সীমাবদ্ধতা (Cons):</strong><div class="prod-cons-list text-xs text-red-900 mt-1 leading-relaxed">${d.cons.replace(/\n/g, '<br>')}</div></div>` : ''}
                </div>
                <div class="mt-4 pt-4 border-t border-slate-200 flex items-center justify-end">
                  <a href="${d.affiliateUrl || '#'}" target="_blank" rel="nofollow noopener sponsored" class="prod-affiliate-btn inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-md">
                    <span>${d.buttonText || 'সেরা অফার দেখুন / Buy Now'}</span>
                    <span>»</span>
                  </a>
                </div>
              </div>\n`;
            break;

          default:
            break;
        }
      } catch (e) {
        console.warn('Error converting block to HTML:', e);
      }
    });

    return html.trim();
  }

  // Safe Tool Builder: checks window global constructors
  function buildTools() {
    const tools = {};

    // 1. Header
    const HeaderClass = window.Header;
    if (HeaderClass) {
      tools.header = {
        class: HeaderClass,
        inlineToolbar: ['link', 'bold', 'italic'],
        config: {
          placeholder: 'হেডিং লিখুন...',
          levels: [2, 3, 4],
          defaultLevel: 2
        }
      };
    }

    // 2. Product Box Block
    tools.productBox = {
      class: ProductBoxBlock
    };

    // 3. List
    const ListClass = window.EditorjsList || window.List || window.NestedList;
    if (ListClass) {
      tools.list = {
        class: ListClass,
        inlineToolbar: true,
        config: {
          defaultStyle: 'unordered'
        }
      };
    }

    // 4. Table
    const TableClass = window.Table;
    if (TableClass) {
      tools.table = {
        class: TableClass,
        inlineToolbar: true,
        config: {
          rows: 2,
          cols: 3
        }
      };
    }

    // 5. Image (SimpleImage or ImageTool)
    const ImageClass = window.SimpleImage || window.ImageTool;
    if (ImageClass) {
      tools.image = {
        class: ImageClass,
        inlineToolbar: true
      };
    }

    // 6. Quote
    const QuoteClass = window.Quote;
    if (QuoteClass) {
      tools.quote = {
        class: QuoteClass,
        inlineToolbar: true,
        config: {
          quotePlaceholder: 'উদ্ধৃতি বা মতামত লিখুন...',
          captionPlaceholder: 'লেখকের নাম / উৎস'
        }
      };
    }

    // 7. Warning
    const WarningClass = window.Warning;
    if (WarningClass) {
      tools.warning = {
        class: WarningClass,
        inlineToolbar: true,
        config: {
          titlePlaceholder: 'সতর্কতা / বিশেষ দ্রষ্টব্য শিরোনাম...',
          messagePlaceholder: 'বিস্তারিত বার্তা লিখুন...'
        }
      };
    }

    // 8. Delimiter
    const DelimiterClass = window.Delimiter;
    if (DelimiterClass) {
      tools.delimiter = DelimiterClass;
    }

    // 9. Marker
    const MarkerClass = window.Marker;
    if (MarkerClass) {
      tools.marker = {
        class: MarkerClass,
        shortcut: 'CMD+SHIFT+M'
      };
    }

    // 10. InlineCode
    const InlineCodeClass = window.InlineCode;
    if (InlineCodeClass) {
      tools.inlineCode = {
        class: InlineCodeClass,
        shortcut: 'CMD+SHIFT+C'
      };
    }

    // 11. Embed
    const EmbedClass = window.Embed;
    if (EmbedClass) {
      tools.embed = {
        class: EmbedClass,
        config: {
          services: {
            youtube: true,
            vimeo: true
          }
        }
      };
    }

    return tools;
  }

  // Initialize Sera 10 Block Editor with robust fallback
  window.initSera10BlockEditor = function(containerId, options = {}) {
    const holder = document.getElementById(containerId);
    if (!holder) return null;

    if (typeof window.EditorJS === 'undefined') {
      console.warn('⚠️ EditorJS not loaded, enabling standard textarea editor.');
      holder.innerHTML = `<textarea id="fallbackPostEditor" class="admin-form-input" style="width: 100%; min-height: 400px; font-size: 15px; line-height: 1.6; padding: 16px;">${options.initialHtml || ''}</textarea>`;
      const fallbackArea = document.getElementById('fallbackPostEditor');
      return {
        saveAsHtml: async function() {
          return fallbackArea.value;
        }
      };
    }

    const initialHtml = options.initialHtml || '';
    let initialBlocks = [];

    if (initialHtml) {
      initialBlocks = htmlToEditorBlocks(initialHtml);
    }

    // Ensure at least one initial paragraph block if empty
    if (!initialBlocks.length) {
      initialBlocks = [{ type: 'paragraph', data: { text: '' } }];
    }

    try {
      const editor = new window.EditorJS({
        holder: containerId,
        placeholder: options.placeholder || 'কিবোর্ডে / (Slash) চাপুন অথবা লেখা শুরু করুন...',
        tools: buildTools(),
        data: {
          blocks: initialBlocks
        },
        onChange: (api, event) => {
          if (typeof options.onChange === 'function') {
            options.onChange(editor);
          }
        }
      });

      editor.saveAsHtml = async function() {
        const outputData = await editor.save();
        return editorBlocksToHtml(outputData);
      };

      return editor;
    } catch (initErr) {
      console.error('⚠️ EditorJS initialization error, falling back to textarea:', initErr);
      holder.innerHTML = `<textarea id="fallbackPostEditor" class="admin-form-input" style="width: 100%; min-height: 400px; font-size: 15px; line-height: 1.6; padding: 16px;">${initialHtml || ''}</textarea>`;
      const fallbackArea = document.getElementById('fallbackPostEditor');
      return {
        saveAsHtml: async function() {
          return fallbackArea.value;
        }
      };
    }
  };

  window.editorBlocksToHtml = editorBlocksToHtml;
  window.htmlToEditorBlocks = htmlToEditorBlocks;

})(window);
