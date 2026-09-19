/**
 * WordPress-Style Smart Title, Content Clipboard, Multi-Select, Media Library & Review Inserters
 */

(function(window) {
  'use strict';

  // Toast Notification System
  function showToast(message, type = 'info') {
    let container = document.getElementById('wpToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'wpToastContainer';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `wp-toast ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }

  // Generate Bangla/English Slug
  function generateSlug(text) {
    return text
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^\u0980-\u09FFa-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80);
  }

  // Word Counter & Reading Time
  function updateStats() {
    const titleInput = document.getElementById('postTitleInput');
    const textarea = document.getElementById('postContentInput');
    const wordCountEl = document.getElementById('wpWordCount');
    const readTimeEl = document.getElementById('wpReadingTime');
    if (!wordCountEl || !readTimeEl) return;

    let text = (titleInput ? titleInput.value : '') + ' ';

    if (window.wp && window.wp.data) {
      try {
        const select = window.wp.data.select('core/block-editor');
        if (select && select.getBlocks) {
          const blocks = select.getBlocks();
          blocks.forEach(b => {
            if (b.attributes && b.attributes.content) {
              text += b.attributes.content + ' ';
            }
          });
        }
      } catch (e) {}
    }

    if (textarea && textarea.value) {
      text += ' ' + textarea.value.replace(/<[^>]+>/g, ' ');
    }

    const words = text.trim().split(/\s+/).filter(Boolean);
    const count = words.length;
    const readingTime = Math.max(1, Math.ceil(count / 180));

    // Convert to Bengali Digits
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const bnCount = count.toString().replace(/\d/g, d => bnDigits[d]);
    const bnTime = readingTime.toString().replace(/\d/g, d => bnDigits[d]);

    wordCountEl.textContent = bnCount;
    readTimeEl.textContent = bnTime;
  }

  // =========================================================================
  // Full Document Multi-Select (Ctrl+A / Cmd+A) & Copy Support
  // =========================================================================
  function setupGutenbergSelectAll() {
    let lastCtrlATime = 0;

    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        const activeEl = document.activeElement;
        
        // Skip if user is inside Title, Input, Select, or Textarea outside editor
        if (activeEl && (activeEl.id === 'postTitleInput' || activeEl.tagName === 'SELECT' || (activeEl.tagName === 'INPUT' && activeEl.type === 'text'))) {
          return;
        }

        const writingFlow = document.querySelector('.block-editor-writing-flow') || document.querySelector('.iso-editor');
        if (!writingFlow) return;

        // If focus is inside Gutenberg or canvas
        if (writingFlow.contains(activeEl) || activeEl.closest('.wp-canvas-card') || activeEl.closest('.iso-editor')) {
          const now = Date.now();
          const isDoublePress = (now - lastCtrlATime) < 600;
          lastCtrlATime = now;

          const selection = window.getSelection();
          let shouldSelectAll = isDoublePress;

          if (!shouldSelectAll && activeEl && activeEl.isContentEditable && selection.rangeCount > 0) {
            const selectedText = selection.toString().trim();
            const fullText = activeEl.textContent.trim();
            if (selectedText.length > 0 && selectedText.length >= fullText.length) {
              shouldSelectAll = true;
            }
          }

          if (shouldSelectAll || !activeEl.isContentEditable) {
            e.preventDefault();

            // 1. Select all in Gutenberg Store
            if (window.wp && window.wp.data) {
              try {
                const select = window.wp.data.select('core/block-editor');
                const dispatch = window.wp.data.dispatch('core/block-editor') || window.wp.data.dispatch('isolated/editor');
                if (select && dispatch && select.getBlocks) {
                  const blocks = select.getBlocks();
                  if (blocks && blocks.length > 0 && dispatch.multiSelect) {
                    dispatch.multiSelect(blocks[0].clientId, blocks[blocks.length - 1].clientId);
                  }
                }
              } catch (err) {
                console.warn('Gutenberg block multiSelect error:', err);
              }
            }

            // 2. Select entire DOM content across all blocks
            const rootContainer = document.querySelector('.block-editor-block-list__layout') ||
                                  document.querySelector('.block-editor-writing-flow') ||
                                  document.querySelector('.iso-editor');
            if (rootContainer) {
              const range = document.createRange();
              range.selectNodeContents(rootContainer);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }
    });

    // Copy Handler for full editor selection
    document.addEventListener('copy', function(e) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const writingFlow = document.querySelector('.block-editor-block-list__layout') || document.querySelector('.block-editor-writing-flow');
      if (!writingFlow) return;

      const anchorNode = selection.anchorNode;
      if (anchorNode && (writingFlow.contains(anchorNode) || anchorNode === writingFlow)) {
        const selectedHtml = getSelectionHtml(selection);
        if (selectedHtml && selectedHtml.length > 0) {
          const clipboardData = e.clipboardData || window.clipboardData;
          if (clipboardData) {
            clipboardData.setData('text/html', selectedHtml);
            clipboardData.setData('text/plain', selection.toString());
          }
        }
      }
    });
  }

  function getSelectionHtml(selection) {
    let html = '';
    if (selection.rangeCount > 0) {
      const container = document.createElement('div');
      for (let i = 0; i < selection.rangeCount; ++i) {
        container.appendChild(selection.getRangeAt(i).cloneContents());
      }
      html = container.innerHTML;
    }
    return html;
  }

  // =========================================================================
  // WordPress Gutenberg Media Upload & Media Library Integration
  // =========================================================================

  function initGutenbergMediaLibrary() {
    if (window.wp && window.wp.hooks && window.wp.hooks.addFilter) {
      const CustomMediaUpload = function(props) {
        const { onSelect, allowedTypes, render, value, multiple } = props;

        const openModal = function() {
          if (window.PayastiMediaModal) {
            window.PayastiMediaModal.open({
              currentUrl: typeof value === 'string' ? value : (value && value.url ? value.url : ''),
              onSelect: function(file) {
                if (typeof onSelect === 'function') {
                  const mediaObj = {
                    id: file.id || Date.now(),
                    url: file.url,
                    alt: file.filename || '',
                    caption: '',
                    title: file.filename || '',
                    sizes: {
                      full: { url: file.url }
                    }
                  };
                  if (multiple) {
                    onSelect([mediaObj]);
                  } else {
                    onSelect(mediaObj);
                  }
                }
              }
            });
          }
        };

        if (typeof render === 'function') {
          return render({ open: openModal });
        }
        return null;
      };

      try {
        window.wp.hooks.addFilter(
          'editor.MediaUpload',
          'sera10/media-upload',
          function() { return CustomMediaUpload; }
        );
        console.log('✅ WordPress Gutenberg Media Library Filter Hooked Successfully');
      } catch (err) {
        console.warn('Media upload filter hook warning:', err);
      }
    }
  }

  function handleGutenbergMediaUpload(options) {
    const { filesList, onFileChange, onError } = options || {};
    if (!filesList || !filesList.length) return;

    const file = filesList[0];
    const formData = new FormData();
    formData.append('file', file);

    if (window.showToast) {
      window.showToast('ছবি আপলোড হচ্ছে... ⏳', 'info');
    }

    fetch('/api/media/upload', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.file) {
          if (typeof onFileChange === 'function') {
            onFileChange([{
              id: data.file.id || Date.now(),
              url: data.file.url,
              alt: data.file.filename || '',
              caption: '',
              title: data.file.filename || '',
              sizes: {
                full: { url: data.file.url }
              }
            }]);
          }
          if (window.showToast) {
            window.showToast('✅ ছবি সফলভাবে আপলোড হয়েছে!', 'success');
          }
        } else {
          if (onError) onError(data.error || 'ছবি আপলোড করতে ব্যর্থ হয়েছে');
          if (window.showToast) window.showToast('❌ ছবি আপলোড ব্যর্থ হয়েছে!', 'error');
        }
      })
      .catch(err => {
        if (onError) onError(err.message);
        if (window.showToast) window.showToast('❌ ছবি আপলোড করতে সমস্যা হয়েছে!', 'error');
      });
  }

  function setupWordPressSmartPaste(titleInputId, contentTextareaId) {
    const titleInput = document.getElementById(titleInputId);
    const textarea = document.getElementById(contentTextareaId);
    if (!titleInput || !textarea) return;

    setupGutenbergSelectAll();
    initGutenbergMediaLibrary();

    // 1. Live Permalink Preview on Title typing
    const slugPreview = document.getElementById('wpPermalinkUrl');
    titleInput.addEventListener('input', function() {
      if (slugPreview) {
        const slug = generateSlug(this.value) || 'post-title';
        slugPreview.textContent = `/post/${slug}`;
      }
      updateStats();
    });

    // 2. Keyboard Navigation: Enter in Title moves focus into first block
    titleInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        focusFirstGutenbergBlock();
      }
    });

    // 3. Smart Paste handler
    titleInput.addEventListener('paste', function(e) {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const pastedText = clipboardData.getData('text/plain') || '';
      const pastedHtml = clipboardData.getData('text/html') || '';

      const lines = pastedText.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);
      const isMultiLine = lines.length > 1;
      const isRichHtml = pastedHtml && /<(p|h[1-6]|div|ul|ol|table|br|blockquote|figure|article|section)\b/i.test(pastedHtml);

      if (isMultiLine || isRichHtml) {
        e.preventDefault();

        let extractedTitle = '';
        let bodyHtml = '';

        if (pastedHtml) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(pastedHtml, 'text/html');
            const body = doc.body;
            body.querySelectorAll('meta, style, script, link, noscript').forEach(el => el.remove());

            const firstChild = body.firstElementChild;
            if (firstChild) {
              extractedTitle = firstChild.textContent.trim();
              firstChild.remove();
              bodyHtml = body.innerHTML.trim();
            }
          } catch (err) {
            console.warn('HTML parse error:', err);
          }
        }

        if (!extractedTitle && lines.length > 0) {
          extractedTitle = lines[0].replace(/^#+\s*/, '').replace(/<[^>]+>/g, '').trim();
        }

        if (!bodyHtml || bodyHtml.length === 0) {
          const remainingLines = lines.slice(1);
          if (remainingLines.length > 0) {
            bodyHtml = remainingLines.map(line => {
              if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
              if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
              if (line.startsWith('# ')) return `<h2>${line.substring(2)}</h2>`;
              if (line.startsWith('- ') || line.startsWith('* ')) return `<ul><li>${line.substring(2)}</li></ul>`;
              if (/^\d+\.\s/.test(line)) return `<ol><li>${line.replace(/^\d+\.\s/, '')}</li></ol>`;
              return `<p>${line}</p>`;
            }).join('\n');
          }
        }

        // Set Title Input
        if (extractedTitle) {
          this.value = extractedTitle;
          this.dispatchEvent(new Event('input', { bubbles: true }));
          this.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Insert body into Gutenberg
        if (bodyHtml) {
          insertContentIntoGutenberg(bodyHtml, textarea);
          showToast('✅ টাইটেল এবং কন্টেন্ট সফলভাবে সাজানো হয়েছে!', 'success');
        }
      }
    });

    // Update stats initially & periodically
    setTimeout(updateStats, 1000);
    setInterval(updateStats, 3000);
  }

  function focusFirstGutenbergBlock() {
    const firstBlock = document.querySelector('.block-editor-writing-flow [contenteditable="true"]') ||
                       document.querySelector('.iso-editor [contenteditable="true"]') ||
                       document.querySelector('.block-editor-default-block-appender__content');
    if (firstBlock) {
      firstBlock.focus();
    }
  }

  function insertContentIntoGutenberg(htmlContent, textarea) {
    if (!htmlContent || !textarea) return;

    let dispatched = false;

    if (window.wp && window.wp.blocks && window.wp.data) {
      try {
        const { rawHandler, parse } = window.wp.blocks;
        const { dispatch } = window.wp.data;

        let blocks = [];
        if (typeof rawHandler === 'function') {
          blocks = rawHandler({ HTML: htmlContent });
        } else if (typeof parse === 'function') {
          blocks = parse(htmlContent);
        }

        if (blocks && blocks.length > 0) {
          const blockEditor = dispatch('isolated/editor') || dispatch('core/block-editor');
          if (blockEditor && typeof blockEditor.resetBlocks === 'function') {
            blockEditor.resetBlocks(blocks);
            dispatched = true;
          }
        }
      } catch (err) {
        console.warn('Gutenberg block dispatch warning:', err);
      }
    }

    if (!dispatched) {
      textarea.value = htmlContent;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));

      if (window.wp && window.wp.detachEditor && window.wp.attachEditor) {
        try {
          window.wp.detachEditor(textarea);
          window.wp.attachEditor(textarea, {
            iso: { moreMenu: false },
            editor: { hasFixedToolbar: false, hasInlineToolbar: true, mediaUpload: handleGutenbergMediaUpload }
          });
        } catch (err) {
          console.warn('IsolatedBlockEditor re-attach error:', err);
        }
      }
    } else {
      textarea.value = htmlContent;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    setTimeout(updateStats, 200);
  }

  // =========================================================================
  // Quick Review Component Inserters
  // =========================================================================

  function appendBlockToGutenberg(htmlSnippet, label) {
    const textarea = document.getElementById('postContentInput');
    if (!textarea) return;

    if (window.wp && window.wp.blocks && window.wp.data) {
      try {
        const { rawHandler, createBlock } = window.wp.blocks;
        const { dispatch, select } = window.wp.data;

        const blockEditor = dispatch('isolated/editor') || dispatch('core/block-editor');
        const isoSelect = select('isolated/editor');
        const coreSelect = select('core/block-editor');
        const currentBlocks = (isoSelect && typeof isoSelect.getBlocks === 'function' ? isoSelect.getBlocks() : (coreSelect && typeof coreSelect.getBlocks === 'function' ? coreSelect.getBlocks() : [])) || [];

        let newBlocks = [];
        if (typeof rawHandler === 'function') {
          newBlocks = rawHandler({ HTML: htmlSnippet });
        } else if (typeof createBlock === 'function') {
          newBlocks = [createBlock('core/html', { content: htmlSnippet })];
        }

        if (newBlocks && newBlocks.length > 0 && blockEditor && typeof blockEditor.resetBlocks === 'function') {
          blockEditor.resetBlocks([...currentBlocks, ...newBlocks]);
          showToast(`✅ ${label} যুক্ত করা হয়েছে!`, 'success');
          return;
        }
      } catch (e) {
        console.warn('Append block error:', e);
      }
    }

    // Fallback append
    textarea.value = (textarea.value ? textarea.value + '\n\n' : '') + htmlSnippet;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    showToast(`✅ ${label} যুক্ত করা হয়েছে!`, 'success');
  }

  // 1. Pros & Cons (সুবিধা ও অসুবিধা) Block
  function insertProsConsBlock() {
    const html = `
<div class="review-pros-cons-grid">
  <div class="review-pros-box">
    <div class="review-box-title">✅ প্রধান সুবিধা (Pros)</div>
    <ul class="review-list">
      <li>✓ উন্নত মানের বিল্ড কোয়ালিটি ও দীর্ঘস্থায়িত্ব</li>
      <li>✓ সাশ্রয়ী মূল্যে দারুণ পারফরম্যান্স</li>
      <li>✓ সহজে ব্যবহারযোগ্য ও বিদ্যুৎ সাশ্রয়ী</li>
    </ul>
  </div>
  <div class="review-cons-box">
    <div class="review-box-title">❌ সীমাবদ্ধতা (Cons)</div>
    <ul class="review-list">
      <li>✗ কালার ভ্যারিয়েন্ট সীমিত</li>
      <li>✗ ওয়ারেন্টি পলিসি কিছুটা কঠোর</li>
    </ul>
  </div>
</div>`;
    appendBlockToGutenberg(html, 'সুবিধা ও অসুবিধা বক্স');
  }

  // 2. Product Review Card with Buy Button
  function insertProductCardBlock() {
    const html = `
<div class="review-product-card">
  <img src="/images/placeholder-product.svg" alt="Product Image" class="review-product-img">
  <div>
    <h3 class="review-product-title">১. প্রোডাক্টের নাম ও মডেল</h3>
    <div class="review-product-rating">⭐⭐⭐⭐⭐ (৪.৮ / ৫) • সেরা চয়েস</div>
    <p>এই প্রোডাক্টটি দৈনন্দিন ব্যবহারের জন্য সবচেয়ে সেরা। এর আকর্ষণীয় ডিজাইন ও টেকসই কার্যক্ষমতা ব্যবহারকারীদের সবচেয়ে প্রিয়।</p>
    <a href="#" target="_blank" rel="nofollow sponsored" class="review-product-cta">
      🛒 সেরা মূল্যে কিনুন &raquo;
    </a>
  </div>
</div>`;
    appendBlockToGutenberg(html, 'প্রোডাক্ট রিভিউ কার্ড');
  }

  // 3. Star Rating Breakdown
  function insertRatingBlock() {
    const html = `
<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
  <h4 style="margin: 0 0 10px 0; color: #0f172a; font-weight: 700;">⭐ সামগ্রিক রেটিং স্কোর: ৪.৮ / ৫</h4>
  <div style="font-size: 14px; color: #475569; display: grid; gap: 6px;">
    <div><strong>কোয়ালিটি ও ডিজাইন:</strong> 4.9/5</div>
    <div><strong>পারফরম্যান্স:</strong> 4.8/5</div>
    <div><strong>মূল্য ও ভ্যালু:</strong> 4.7/5</div>
    <div><strong>সার্ভিস ও ওয়ারেন্টি:</strong> 4.6/5</div>
  </div>
</div>`;
    appendBlockToGutenberg(html, 'রেটিং স্কোর বক্স');
  }

  // 4. Comparison Table
  function insertComparisonTableBlock() {
    const html = `
<table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
  <thead>
    <tr style="background: #f1f5f9; text-align: left;">
      <th style="padding: 12px; border: 1px solid #cbd5e1;">মডেল</th>
      <th style="padding: 12px; border: 1px solid #cbd5e1;">প্রধান ফিচার</th>
      <th style="padding: 12px; border: 1px solid #cbd5e1;">রেটিং</th>
      <th style="padding: 12px; border: 1px solid #cbd5e1;">মূল্য যাচাই</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>মডেল ১</strong></td>
      <td style="padding: 10px; border: 1px solid #e2e8f0;">হাই-পারফরম্যান্স ব্যাটারি</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0;">⭐⭐⭐⭐⭐ 4.9</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="#" style="color: #ea580c; font-weight: 700;">দাম দেখুন &raquo;</a></td>
    </tr>
    <tr>
      <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>মডেল ২</strong></td>
      <td style="padding: 10px; border: 1px solid #e2e8f0;">বাজেট ফ্রেন্ডলি ও হালকা</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0;">⭐⭐⭐⭐ 4.7</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="#" style="color: #ea580c; font-weight: 700;">দাম দেখুন &raquo;</a></td>
    </tr>
  </tbody>
</table>`;
    appendBlockToGutenberg(html, 'তুলনামূলক টেবিল');
  }

  window.setupWordPressSmartPaste = setupWordPressSmartPaste;
  window.insertContentIntoGutenberg = insertContentIntoGutenberg;
  window.insertProsConsBlock = insertProsConsBlock;
  window.insertProductCardBlock = insertProductCardBlock;
  window.insertRatingBlock = insertRatingBlock;
  window.insertComparisonTableBlock = insertComparisonTableBlock;
  window.handleGutenbergMediaUpload = handleGutenbergMediaUpload;
  window.initGutenbergMediaLibrary = initGutenbergMediaLibrary;
  window.showToast = showToast;
  window.updateStats = updateStats;

  // Auto-init media filter on load
  if (window.wp && window.wp.hooks) {
    initGutenbergMediaLibrary();
  } else {
    document.addEventListener('DOMContentLoaded', initGutenbergMediaLibrary);
  }

})(window);
