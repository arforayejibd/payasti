document.addEventListener('DOMContentLoaded', () => {
  // Mobile Hamburger Menu Toggle
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mainNav = document.getElementById('mainNav');

  if (mobileMenuToggle && mainNav) {
    mobileMenuToggle.addEventListener('click', () => {
      mainNav.classList.toggle('mobile-open');
      mainNav.classList.toggle('active');
    });

    // Close mobile menu when clicking a nav link
    mainNav.querySelectorAll('.nav-menu-item, .nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('mobile-open');
        mainNav.classList.remove('active');
      });
    });
  }

  // Live Search Modal
  const searchModal = document.getElementById('searchModal');
  const searchToggleBtn = document.getElementById('searchToggleBtn');
  const searchCloseBtn = document.getElementById('closeSearchBtn') || document.getElementById('searchCloseBtn');
  const searchModalInput = document.getElementById('liveSearchInput') || document.getElementById('searchModalInput');
  const searchResultsContainer = document.getElementById('searchResultsContainer');

  if (searchToggleBtn && searchModal) {
    searchToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      searchModal.classList.add('active');
      if (searchModalInput) {
        setTimeout(() => searchModalInput.focus(), 100);
      }
    });

    if (searchCloseBtn) {
      searchCloseBtn.addEventListener('click', () => {
        searchModal.classList.remove('active');
      });
    }

    searchModal.addEventListener('click', (e) => {
      if (e.target === searchModal) {
        searchModal.classList.remove('active');
      }
    });

    // Keyboard shortcut: Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchModal.classList.contains('active')) {
        searchModal.classList.remove('active');
      }
    });

    // Live search AJAX with debounce
    let debounceTimer;
    if (searchModalInput && searchResultsContainer) {
      searchModalInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(debounceTimer);

        if (query.length < 2) {
          searchResultsContainer.innerHTML = '';
          searchResultsContainer.style.display = 'none';
          return;
        }

        debounceTimer = setTimeout(() => {
          fetch(`/api/search?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
              let html = '';
              if (data.posts && data.posts.length > 0) {
                html += '<div style="font-weight:700;margin:8px 0 4px;font-size:18px;color:#068200;">সাহিত্য ও প্রবন্ধ</div>';
                data.posts.forEach(p => {
                  html += `
                    <a href="/post/${encodeURIComponent(p.slug)}" class="search-result-item">
                      <div class="search-res-title">${p.title}</div>
                      <div class="search-res-author">লেখক: ${p.author_name || 'পয়স্তি'} | বিভাগ: ${p.category_name || ''}</div>
                    </a>
                  `;
                });
              }

              if (data.books && data.books.length > 0) {
                html += '<div style="font-weight:700;margin:16px 0 4px;font-size:18px;color:#068200;">বই সম্ভার</div>';
                data.books.forEach(b => {
                  html += `
                    <a href="${b.order_url || '/book/' + encodeURIComponent(b.slug)}" target="_blank" class="search-result-item">
                      <div class="search-res-title">${b.title} - ${b.author_name}</div>
                      <div style="font-size:18px;color:#ff0000;font-weight:700;">${b.discounted_price || b.regular_price}</div>
                    </a>
                  `;
                });
              }

              if (!html) {
                html = '<div style="padding:16px;text-align:center;color:#888;font-size:18px;">কোনো ফলাফল পাওয়া যায়নি</div>';
              }

              searchResultsContainer.innerHTML = html;
              searchResultsContainer.style.display = 'block';
            })
            .catch(err => console.error(err));
        }, 200);
      });
    }
  }

  // ==========================================
  // Global Site Theme Switcher (Navbar Icon)
  // Cycles: Default ☀️ -> Sepia 📜 -> Dark 🌙 -> Default ☀️
  // ==========================================
  const globalThemeToggleBtn = document.getElementById('globalThemeToggleBtn');
  const themeIconDefault = globalThemeToggleBtn ? globalThemeToggleBtn.querySelector('.theme-icon-default') : null;
  const themeIconSepia = globalThemeToggleBtn ? globalThemeToggleBtn.querySelector('.theme-icon-sepia') : null;
  const themeIconDark = globalThemeToggleBtn ? globalThemeToggleBtn.querySelector('.theme-icon-dark') : null;

  const THEME_CYCLE = ['default', 'sepia', 'dark'];
  let currentTheme = localStorage.getItem('payasti_site_theme') || 'default';

  function applyGlobalTheme(theme) {
    document.documentElement.classList.remove('theme-sepia', 'theme-dark');
    document.body.classList.remove('reading-theme-sepia', 'reading-theme-dark');

    if (theme === 'sepia') {
      document.documentElement.classList.add('theme-sepia');
      document.body.classList.add('reading-theme-sepia');
    } else if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
      document.body.classList.add('reading-theme-dark');
    }

    // Sync button icons
    if (themeIconDefault) themeIconDefault.style.display = (theme === 'default') ? 'inline-flex' : 'none';
    if (themeIconSepia) themeIconSepia.style.display = (theme === 'sepia') ? 'inline-flex' : 'none';
    if (themeIconDark) themeIconDark.style.display = (theme === 'dark') ? 'inline-flex' : 'none';

    localStorage.setItem('payasti_site_theme', theme);
  }

  // Initialize on load
  applyGlobalTheme(currentTheme);

  if (globalThemeToggleBtn) {
    globalThemeToggleBtn.addEventListener('click', () => {
      const nextIndex = (THEME_CYCLE.indexOf(currentTheme) + 1) % THEME_CYCLE.length;
      currentTheme = THEME_CYCLE[nextIndex];
      applyGlobalTheme(currentTheme);
    });
  }

  // ==========================================
  // Single Post: Font Size Controls
  // ==========================================
  const articleBody = document.querySelector('.single-article-content-body');
  const defaultFontSize = 26; // default base size (upgraded)
  let currentFontSize = parseInt(localStorage.getItem('payasti_reader_fontsize')) || defaultFontSize;

  function applyFontSize(size) {
    if (!articleBody) return;
    currentFontSize = Math.min(40, Math.max(20, size));
    articleBody.style.fontSize = `${currentFontSize}px`;
    localStorage.setItem('payasti_reader_fontsize', currentFontSize);
  }

  if (articleBody) {
    applyFontSize(currentFontSize);
    const btnFontInc = document.getElementById('btnFontInc');
    const btnFontDec = document.getElementById('btnFontDec');
    const btnFontReset = document.getElementById('btnFontReset');

    if (btnFontInc) {
      btnFontInc.addEventListener('click', () => applyFontSize(currentFontSize + 2));
    }
    if (btnFontDec) {
      btnFontDec.addEventListener('click', () => applyFontSize(currentFontSize - 2));
    }
    if (btnFontReset) {
      btnFontReset.addEventListener('click', () => applyFontSize(defaultFontSize));
    }
  }

  // ==========================================
  // Quote Selection & Quote Card System
  // ==========================================
  const quoteToolbar = document.getElementById('quoteSelectionToolbar');
  const quoteModal = document.getElementById('quoteCardModal');
  const btnCopyQuote = document.getElementById('btnCopyQuote');
  const btnMakeQuoteCard = document.getElementById('btnMakeQuoteCard');
  const btnCloseQuoteCard = document.getElementById('btnCloseQuoteCard');
  const quoteCardText = document.getElementById('quoteCardText');
  const btnDownloadQuoteCard = document.getElementById('btnDownloadQuoteCard');
  const btnCopyQuoteTextModal = document.getElementById('btnCopyQuoteTextModal');

  let activeSelectedText = '';

  if (articleBody && quoteToolbar) {
    function handleSelection() {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text.length >= 6 && articleBody.contains(selection.anchorNode)) {
        activeSelectedText = text;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Position floating toolbar right above selection
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        quoteToolbar.style.left = `${rect.left + scrollX + (rect.width / 2)}px`;
        quoteToolbar.style.top = `${rect.top + scrollY - 6}px`;
        quoteToolbar.style.display = 'flex';
      } else {
        quoteToolbar.style.display = 'none';
      }
    }

    document.addEventListener('mouseup', () => {
      setTimeout(handleSelection, 10);
    });

    document.addEventListener('keyup', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift'].includes(e.key)) {
        setTimeout(handleSelection, 10);
      }
    });

    // Hide toolbar when clicking outside
    document.addEventListener('mousedown', (e) => {
      if (quoteToolbar.style.display !== 'none' && !quoteToolbar.contains(e.target)) {
        quoteToolbar.style.display = 'none';
      }
    });

    // Copy Quote with Author and Source
    function copyFormattedQuote() {
      const authorEl = document.querySelector('.single-article-author-name') || document.querySelector('#text_block-417-36');
      const titleEl = document.querySelector('.single-article-title') || document.querySelector('#headline-5-36');
      const authorName = authorEl ? authorEl.textContent.trim() : 'পয়স্তি লেখক';
      const postTitle = titleEl ? titleEl.textContent.trim() : '';

      const formatted = `“${activeSelectedText}”\n— ${authorName} (${postTitle})\nউৎস: পয়েন্টস্তি (payasti.com)`;

      navigator.clipboard.writeText(formatted).then(() => {
        if (btnCopyQuote) {
          const originalHtml = btnCopyQuote.innerHTML;
          btnCopyQuote.innerHTML = '✓ কপি হয়েছে!';
          setTimeout(() => {
            btnCopyQuote.innerHTML = originalHtml;
            quoteToolbar.style.display = 'none';
          }, 1500);
        }
      }).catch(err => {
        console.error('Clipboard copy error:', err);
      });
    }

    if (btnCopyQuote) {
      btnCopyQuote.addEventListener('click', (e) => {
        e.stopPropagation();
        copyFormattedQuote();
      });
    }

    // Open Quote Card Modal
    if (btnMakeQuoteCard && quoteModal && quoteCardText) {
      btnMakeQuoteCard.addEventListener('click', (e) => {
        e.stopPropagation();
        quoteCardText.textContent = activeSelectedText;
        quoteToolbar.style.display = 'none';
        quoteModal.style.display = 'flex';
      });
    }

    if (btnCloseQuoteCard && quoteModal) {
      btnCloseQuoteCard.addEventListener('click', () => {
        quoteModal.style.display = 'none';
      });

      quoteModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('quote-modal-overlay') || e.target === quoteModal) {
          quoteModal.style.display = 'none';
        }
      });
    }

    if (btnCopyQuoteTextModal) {
      btnCopyQuoteTextModal.addEventListener('click', () => {
        copyFormattedQuote();
        const orig = btnCopyQuoteTextModal.textContent;
        btnCopyQuoteTextModal.textContent = '✓ কপি হয়েছে!';
        setTimeout(() => { btnCopyQuoteTextModal.textContent = orig; }, 1500);
      });
    }

    // Download Quote as PNG Image using Canvas
    if (btnDownloadQuoteCard) {
      btnDownloadQuoteCard.addEventListener('click', () => {
        const authorEl = document.querySelector('.single-article-author-name');
        const titleEl = document.querySelector('.single-article-title');
        const authorName = authorEl ? authorEl.textContent.trim() : 'পয়স্তি লেখক';
        const postTitle = titleEl ? titleEl.textContent.trim() : '';

        const canvas = document.createElement('canvas');
        const width = 1080;
        const height = 1080;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 1. Background Gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#064e1d');
        gradient.addColorStop(1, '#087f23');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 2. Subtle decorative border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 4;
        ctx.strokeRect(40, 40, width - 80, height - 80);

        // 3. Watermark
        ctx.font = '900 180px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.textAlign = 'right';
        ctx.fillText('পয়স্তি', width - 80, height - 120);

        // 4. Quote Mark
        ctx.font = 'bold 160px serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.textAlign = 'left';
        ctx.fillText('“', 90, 200);

        // 5. Quote Text Wrapping
        ctx.font = '500 42px "Hind Siliguri", "Noto Serif Bengali", sans-serif';
        ctx.fillStyle = '#ffffff';
        const maxTextWidth = width - 200;
        const lineHeight = 70;
        const words = activeSelectedText.split(' ');
        let line = '';
        let y = 280;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxTextWidth && n > 0) {
            ctx.fillText(line, 100, y);
            line = words[n] + ' ';
            y += lineHeight;
            if (y > 800) {
              line += '...';
              break;
            }
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 100, y);

        // 6. Separator line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(100, 880);
        ctx.lineTo(width - 100, 880);
        ctx.stroke();

        // 7. Author & Source Info
        ctx.font = 'bold 36px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
        ctx.fillStyle = '#fffae6';
        ctx.fillText(`— ${authorName}`, 100, 935);

        ctx.font = '400 26px "Hind Siliguri", "Noto Sans Bengali", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`লেখা: ${postTitle}  |  payasti.com`, 100, 980);

        // 8. Trigger Download
        const link = document.createElement('a');
        link.download = `payasti-quote-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }
  }
});

