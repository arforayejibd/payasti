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

  // Clean English Slug Generator with Bengali Transliteration
  const commonKeywords = [
    { regex: /রিভিউ/gi, rep: 'review' },
    { regex: /প্রাইস/gi, rep: 'price' },
    { regex: /সেরা/gi, rep: 'sera' },
    { regex: /তালিকা/gi, rep: 'talika' },
    { regex: /বাংলাদেশ/gi, rep: 'bangladesh' },
    { regex: /মোবাইল/gi, rep: 'mobile' },
    { regex: /ফোন/gi, rep: 'phone' },
    { regex: /ফিচার/gi, rep: 'feature' },
    { regex: /ক্যামেরা/gi, rep: 'camera' },
    { regex: /ব্যাটারি/gi, rep: 'battery' },
    { regex: /ল্যাপটপ/gi, rep: 'laptop' },
    { regex: /কম্পিউটার/gi, rep: 'computer' },
    { regex: /স্মার্টফোন/gi, rep: 'smartphone' },
    { regex: /স্মার্টওয়াচ|স্মার্টওয়াচ/gi, rep: 'smartwatch' },
    { regex: /ঘড়ি|ঘড়ি/gi, rep: 'ghori' },
    { regex: /টিভি/gi, rep: 'tv' },
    { regex: /দাম/gi, rep: 'dam' },
    { regex: /নতুন/gi, rep: 'notun' },
    { regex: /কেন/gi, rep: 'keno' },
    { regex: /কেমন/gi, rep: 'kemon' },
    { regex: /ভালো/gi, rep: 'bhalo' },
    { regex: /জন্য/gi, rep: 'jonno' },
    { regex: /সম্পর্কে/gi, rep: 'somporke' },
    { regex: /উপন্যাস/gi, rep: 'uponnash' },
    { regex: /গল্প/gi, rep: 'golpo' },
    { regex: /বই/gi, rep: 'boi' },
    { regex: /লেখক/gi, rep: 'lekhok' },
    { regex: /অনলাইন/gi, rep: 'online' },
    { regex: /অফার/gi, rep: 'offer' },
    { regex: /ডিসকাউন্ট/gi, rep: 'discount' },
    { regex: /ওয়ালটন|ওয়ালটন/gi, rep: 'walton' },
    { regex: /স্যামসাং/gi, rep: 'samsung' },
    { regex: /শাওমি/gi, rep: 'xiaomi' },
    { regex: /রিয়েলমি|রিয়েলমি/gi, rep: 'realme' },
    { regex: /অ্যাপল/gi, rep: 'apple' },
    { regex: /আইফোন/gi, rep: 'iphone' },
    { regex: /টি/g, rep: 'ti' },
    { regex: /গুলো/g, rep: 'gulo' },
    { regex: /এবং/g, rep: 'ebong' }
  ];

  const conjuncts = [
    [/ক্ষ্ম/g, 'kkhm'],
    [/ক্ষ/g, 'kkh'],
    [/জ্ঞ/g, 'gg'],
    [/ষ্ণ/g, 'shn'],
    [/ষ্ঠ/g, 'shth'],
    [/ষ্ট/g, 'st'],
    [/স্ফ/g, 'sph'],
    [/স্থ/g, 'sth'],
    [/স্ত/g, 'st'],
    [/স্প/g, 'sp'],
    [/স্ক্র/g, 'skr'],
    [/স্ক/g, 'sk'],
    [/স্খ/g, 'skh'],
    [/স্ব/g, 'sw'],
    [/স্ম/g, 'sm'],
    [/শ্র/g, 'shr'],
    [/শ্ল/g, 'shl'],
    [/শ্ব/g, 'shw'],
    [/শ্ম/g, 'shm'],
    [/ষ্প/g, 'shp'],
    [/ষ্ফ/g, 'shph'],
    [/ষ্ক/g, 'shk'],
    [/প্ত/g, 'pt'],
    [/প্ট/g, 'pt'],
    [/প্স/g, 'ps'],
    [/প্ল/g, 'pl'],
    [/প্র/g, 'pr'],
    [/ব্দ/g, 'bd'],
    [/ব্ধ/g, 'bdh'],
    [/ব্ব/g, 'bb'],
    [/ব্ল/g, 'bl'],
    [/ব্র/g, 'br'],
    [/ভ্র/g, 'bhr'],
    [/ম্ন/g, 'mn'],
    [/ম্প/g, 'mp'],
    [/ম্ফ/g, 'mph'],
    [/ম্ব/g, 'mb'],
    [/ম্ভ/g, 'mbh'],
    [/ম্ম/g, 'mm'],
    [/ম্ল/g, 'ml'],
    [/ম্র/g, 'mr'],
    [/ল্ক/g, 'lk'],
    [/ল্গ/g, 'lg'],
    [/ল্ট/g, 'lt'],
    [/ল্ড/g, 'ld'],
    [/ল্প/g, 'lp'],
    [/ল্ফ/g, 'lph'],
    [/ল্ব/g, 'lb'],
    [/ল্ম/g, 'lm'],
    [/ল্ল/g, 'll'],
    [/ন্ত/g, 'nt'],
    [/ন্থ/g, 'nth'],
    [/ন্দ/g, 'nd'],
    [/ন্ধ/g, 'ndh'],
    [/ন্ন/g, 'nn'],
    [/ন্ম/g, 'nm'],
    [/ক্ট/g, 'kt'],
    [/ক্ত/g, 'kt'],
    [/ক্ব/g, 'kw'],
    [/ক্ক/g, 'kk'],
    [/ক্র/g, 'kr'],
    [/ক্ল/g, 'kl'],
    [/গ্ধ/g, 'gdh'],
    [/গ্ন/g, 'gn'],
    [/গ্ব/g, 'gw'],
    [/গ্র/g, 'gr'],
    [/গ্ল/g, 'gl'],
    [/ঙ্ক/g, 'nk'],
    [/ঙ্ক্ষ/g, 'nkkh'],
    [/ঙ্খ/g, 'nkh'],
    [/ঙ্গ/g, 'ng'],
    [/ঙ্ঘ/g, 'ngh'],
    [/চ্চ/g, 'cch'],
    [/চ্ছ/g, 'cchh'],
    [/চ্ছ্ব/g, 'cchw'],
    [/জ্জ/g, 'jj'],
    [/জ্জ্ব/g, 'jjw'],
    [/ঝ্ঝ/g, 'jhjh'],
    [/ঞ্চ/g, 'nch'],
    [/ঞ্ছ/g, 'nchh'],
    [/ঞ্জ/g, 'nj'],
    [/ট্ট/g, 'tt'],
    [/ট্ব/g, 'tw'],
    [/ট্র/g, 'tr'],
    [/ড্ড/g, 'dd'],
    [/ড্র/g, 'dr'],
    [/ণ্ট/g, 'nt'],
    [/ণ্ঠ/g, 'nth'],
    [/ণ্ড/g, 'nd'],
    [/ণ্ণ/g, 'nn'],
    [/ত্ন/g, 'tn'],
    [/ত্ব/g, 'tw'],
    [/ত্ম/g, 'tm'],
    [/ত্য/g, 'ty'],
    [/ত্র/g, 'tr'],
    [/থ্ব/g, 'thw'],
    [/থ্র/g, 'thr'],
    [/দ্গ/g, 'dg'],
    [/দ্ঘ/g, 'dgh'],
    [/দ্দ/g, 'dd'],
    [/দ্ধ/g, 'ddh'],
    [/দ্ব/g, 'dw'],
    [/দ্ভ/g, 'dbh'],
    [/দ্ম/g, 'dm'],
    [/দ্র/g, 'dr'],
    [/ধ্ব/g, 'dhw'],
    [/ধ্র/g, 'dhr'],
    [/হ্ণ/g, 'hn'],
    [/হ্ন/g, 'hn'],
    [/হ্ম/g, 'hm'],
    [/হ্য/g, 'hy'],
    [/হ্র/g, 'hr'],
    [/হ্ল/g, 'hl'],
    [/হ্ব/g, 'hw']
  ];

  const charMap = {
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
    'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't', 'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n',
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };

  function generateSlug(input) {
    if (!input) return '';
    let str = input.toString().normalize('NFC').trim();

    if (!/[\u0980-\u09FF]/.test(str)) {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);
    }

    str = str.replace(/\u09AF\u09BC/g, 'য়');
    str = str.replace(/\u09A1\u09BC/g, 'ড়');
    str = str.replace(/\u09A2\u09BC/g, 'ঢ়');

    for (let i = 0; i < commonKeywords.length; i++) {
      str = str.replace(commonKeywords[i].regex, ' ' + commonKeywords[i].rep + ' ');
    }

    str = str
      .replace(/ওয়া|ওয়া/g, 'wa')
      .replace(/ওয়ে|ওয়ে/g, 'we')
      .replace(/ওয়াই|ওয়াই/g, 'wai')
      .replace(/ওয়|ওয়/g, 'w')
      .replace(/য়া|য়া/g, 'ya')
      .replace(/য়ে|য়ে/g, 'ye')
      .replace(/য়|য়/g, 'y');

    for (let i = 0; i < conjuncts.length; i++) {
      str = str.replace(conjuncts[i][0], conjuncts[i][1]);
    }

    let out = '';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (charMap[ch] !== undefined) {
        out += charMap[ch];
      } else if (ch === '্') {
        continue;
      } else {
        out += ch;
      }
    }

    return out
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  // Expose global slug generator
  window.generateEnglishSlug = generateSlug;

  // Global Permalink Controls
  window.togglePermalinkEdit = function(show) {
    const editWrap = document.getElementById('permalinkEditWrap');
    const editBtn = document.getElementById('btnEditPermalink');
    const slugPreview = document.getElementById('wpPermalinkUrl');
    const input = document.getElementById('customSlugField');
    const hiddenSlug = document.getElementById('postSlugInput');

    if (show) {
      if (editWrap) editWrap.style.display = 'inline-flex';
      if (editBtn) editBtn.style.display = 'none';
      if (slugPreview) slugPreview.style.display = 'none';
      if (input) {
        input.value = (hiddenSlug && hiddenSlug.value) ? hiddenSlug.value : (slugPreview ? slugPreview.textContent.trim() : '');
        input.focus();
      }
    } else {
      if (editWrap) editWrap.style.display = 'none';
      if (editBtn) editBtn.style.display = 'inline-block';
      if (slugPreview) slugPreview.style.display = 'inline-block';
    }
  };

  window.saveCustomPermalink = function() {
    const input = document.getElementById('customSlugField');
    const hiddenSlug = document.getElementById('postSlugInput');
    const slugPreview = document.getElementById('wpPermalinkUrl');

    if (input) {
      const customVal = generateSlug(input.value) || 'post-title';
      if (hiddenSlug) {
        hiddenSlug.value = customVal;
        hiddenSlug.setAttribute('data-custom', 'true');
      }
      if (slugPreview) {
        slugPreview.textContent = customVal;
      }
      if (window.showToast) {
        window.showToast('✅ পারমালিংক আপডেট করা হয়েছে!', 'success');
      }
    }
    window.togglePermalinkEdit(false);
  };

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
    const hiddenSlug = document.getElementById('postSlugInput');
    titleInput.addEventListener('input', function() {
      if (!hiddenSlug || !hiddenSlug.getAttribute('data-custom')) {
        const slug = generateSlug(this.value) || 'post-title';
        if (slugPreview) {
          slugPreview.textContent = slug;
        }
        if (hiddenSlug) {
          hiddenSlug.value = slug;
        }
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

  // ==========================================
  // Category Multi-Select & Search Filter Helpers
  // ==========================================
  function toBnDigits(num) {
    const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map(d => digits[parseInt(d, 10)] || d).join('');
  }

  function updateCategorySelectionStats() {
    const checked = document.querySelectorAll('input[name="category_ids[]"]:checked');
    const badge = document.getElementById('selectedCatCount');
    if (badge) {
      badge.textContent = `${toBnDigits(checked.length)}টি নির্বাচিত`;
      badge.style.background = checked.length > 0 ? '#e0f2fe' : '#f1f5f9';
      badge.style.color = checked.length > 0 ? '#0284c7' : '#94a3b8';
    }
  }

  function filterCategories(searchTerm) {
    const term = (searchTerm || '').trim().toLowerCase();
    const clearBtn = document.getElementById('clearCatSearch');
    const noMsg = document.getElementById('noCatFoundMsg');
    const groups = document.querySelectorAll('.wp-cat-item-group');

    if (clearBtn) {
      clearBtn.style.display = term ? 'inline-block' : 'none';
    }

    let matchCount = 0;
    groups.forEach(group => {
      const groupName = group.getAttribute('data-cat-name') || '';
      const children = group.querySelectorAll('.wp-cat-item-child');
      let groupMatch = groupName.includes(term);
      let childMatchCount = 0;

      children.forEach(child => {
        const childName = child.getAttribute('data-cat-name') || '';
        if (childName.includes(term)) {
          child.style.display = 'block';
          childMatchCount++;
        } else {
          child.style.display = groupMatch ? 'block' : 'none';
        }
      });

      if (groupMatch || childMatchCount > 0) {
        group.style.display = 'block';
        matchCount++;
      } else {
        group.style.display = 'none';
      }
    });

    if (noMsg) {
      noMsg.style.display = matchCount === 0 ? 'block' : 'none';
      noMsg.textContent = 'কোনো ক্যাটাগরি খুঁজে পাওয়া যায়নি।';
    }
  }

  function clearCategorySearch() {
    const searchInput = document.getElementById('categorySearchInput');
    if (searchInput) {
      searchInput.value = '';
      filterCategories('');
      searchInput.focus();
    }
  }

  function switchCatTab(tabName) {
    const tabAll = document.getElementById('tabAllCats');
    const tabSelected = document.getElementById('tabSelectedCats');
    const groups = document.querySelectorAll('.wp-cat-item-group');
    const noMsg = document.getElementById('noCatFoundMsg');

    if (tabName === 'all') {
      if (tabAll) tabAll.classList.add('active');
      if (tabSelected) tabSelected.classList.remove('active');
      clearCategorySearch();
    } else {
      if (tabSelected) tabSelected.classList.add('active');
      if (tabAll) tabAll.classList.remove('active');

      let visibleCount = 0;
      groups.forEach(group => {
        const rootCheckbox = group.querySelector('.root-cat input[type="checkbox"]');
        const childCheckboxes = group.querySelectorAll('.child-cat input[type="checkbox"]:checked');
        const isRootChecked = rootCheckbox && rootCheckbox.checked;
        const hasCheckedChild = childCheckboxes.length > 0;

        if (isRootChecked || hasCheckedChild) {
          group.style.display = 'block';
          group.querySelectorAll('.wp-cat-item-child').forEach(child => {
            const cb = child.querySelector('input[type="checkbox"]');
            child.style.display = (cb && cb.checked) ? 'block' : 'none';
          });
          visibleCount++;
        } else {
          group.style.display = 'none';
        }
      });

      if (noMsg) {
        noMsg.style.display = visibleCount === 0 ? 'block' : 'none';
        if (visibleCount === 0) noMsg.textContent = 'কোনো ক্যাটাগরি নির্বাচিত নেই।';
      }
    }
  }

  function toggleQuickAddCat(force) {
    const form = document.getElementById('quickAddCatForm');
    const icon = document.getElementById('quickAddCatIcon');
    if (!form) return;

    const isVisible = force !== undefined ? !force : form.style.display !== 'none';
    form.style.display = isVisible ? 'none' : 'block';
    if (icon) icon.textContent = isVisible ? '➕' : '➖';
    if (!isVisible) {
      const input = document.getElementById('newCatNameInput');
      if (input) input.focus();
    }
  }

  async function submitQuickAddCategory() {
    const nameInput = document.getElementById('newCatNameInput');
    const parentSelect = document.getElementById('newCatParentSelect');
    const name = nameInput ? nameInput.value.trim() : '';
    const parentId = parentSelect ? parentSelect.value : 0;

    if (!name) {
      if (window.showToast) window.showToast('⚠️ ক্যাটাগরির নাম লিখুন', 'error');
      else alert('ক্যাটাগরির নাম লিখুন');
      return;
    }

    try {
      const response = await fetch('/admin/categories/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ name, parent_id: parentId, is_ajax: true })
      });

      const data = await response.json();
      if (data.success && data.category) {
        const cat = data.category;
        const checklist = document.getElementById('categoryChecklistWrap');
        
        if (checklist) {
          if (cat.parent_id && cat.parent_id !== '0' && cat.parent_id !== 0) {
            const parentGroup = checklist.querySelector(`.wp-cat-item-group[data-cat-id="${cat.parent_id}"]`);
            if (parentGroup) {
              let childrenContainer = parentGroup.querySelector('.wp-cat-children');
              if (!childrenContainer) {
                childrenContainer = document.createElement('div');
                childrenContainer.className = 'wp-cat-children';
                parentGroup.appendChild(childrenContainer);
              }
              const childDiv = document.createElement('div');
              childDiv.className = 'wp-cat-item-child';
              childDiv.setAttribute('data-cat-id', cat.id);
              childDiv.setAttribute('data-cat-name', cat.name.toLowerCase());
              childDiv.innerHTML = `
                <label class="wp-cat-checkbox-label child-cat">
                  <input type="checkbox" name="category_ids[]" value="${cat.id}" checked onchange="window.updateCategorySelectionStats()">
                  <span class="wp-cat-name">— ${cat.name}</span>
                </label>
              `;
              childrenContainer.appendChild(childDiv);
            }
          } else {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'wp-cat-item-group';
            groupDiv.setAttribute('data-cat-id', cat.id);
            groupDiv.setAttribute('data-cat-name', cat.name.toLowerCase());
            groupDiv.innerHTML = `
              <label class="wp-cat-checkbox-label root-cat">
                <input type="checkbox" name="category_ids[]" value="${cat.id}" checked onchange="window.updateCategorySelectionStats()">
                <span class="wp-cat-name">${cat.name}</span>
              </label>
            `;
            checklist.insertBefore(groupDiv, checklist.firstChild);

            if (parentSelect) {
              const opt = document.createElement('option');
              opt.value = cat.id;
              opt.textContent = cat.name;
              parentSelect.appendChild(opt);
            }
          }

          updateCategorySelectionStats();
        }

        nameInput.value = '';
        toggleQuickAddCat(false);
        if (window.showToast) window.showToast(`✅ "${cat.name}" ক্যাটাগরি তৈরি ও সিলেক্ট করা হয়েছে!`, 'success');
      } else {
        if (window.showToast) window.showToast('❌ ' + (data.error || 'ব্যর্থ হয়েছে'), 'error');
      }
    } catch (err) {
      console.error('Add category error:', err);
      if (window.showToast) window.showToast('❌ ক্যাটাগরি তৈরিতে সমস্যা হয়েছে', 'error');
    }
  }

  // Initialize Category Stats on Page Load
  document.addEventListener('DOMContentLoaded', function() {
    updateCategorySelectionStats();
  });

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
  window.updateCategorySelectionStats = updateCategorySelectionStats;
  window.filterCategories = filterCategories;
  window.clearCategorySearch = clearCategorySearch;
  window.switchCatTab = switchCatTab;
  window.toggleQuickAddCat = toggleQuickAddCat;
  window.submitQuickAddCategory = submitQuickAddCategory;

  // Auto-init media filter on load
  if (window.wp && window.wp.hooks) {
    initGutenbergMediaLibrary();
  } else {
    document.addEventListener('DOMContentLoaded', initGutenbergMediaLibrary);
  }

})(window);
