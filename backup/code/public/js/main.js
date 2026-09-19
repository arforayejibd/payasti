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

    // Helper to get accurate Article Author and Title
    function getArticleAuthorAndTitle() {
      const visualEl = document.getElementById('quoteCardVisual');
      let authorName = visualEl ? visualEl.getAttribute('data-author') : '';
      let postTitle = visualEl ? visualEl.getAttribute('data-title') : '';

      if (!authorName) {
        const authorModalEl = document.getElementById('quoteCardAuthor');
        const authorLinkEl = document.querySelector('.article-author-name') || document.querySelector('.single-article-author-name');
        if (authorModalEl && authorModalEl.textContent.trim()) {
          authorName = authorModalEl.textContent.trim().replace(/^—\s*/, '');
        } else if (authorLinkEl && authorLinkEl.textContent.trim()) {
          authorName = authorLinkEl.textContent.trim();
        } else {
          authorName = 'পয়স্তি লেখক';
        }
      }

      if (!postTitle) {
        const titleEl = document.querySelector('.article-title') || document.querySelector('.single-article-title');
        if (titleEl && titleEl.textContent.trim()) {
          postTitle = titleEl.textContent.trim();
        } else {
          const sourceEl = document.querySelector('.quote-card-source');
          if (sourceEl) {
            const match = sourceEl.textContent.match(/লেখা:\s*(.*?)\s*\|/);
            if (match && match[1]) postTitle = match[1].trim();
          }
        }
      }

      return { authorName, postTitle };
    }

    // Copy Quote with Author and Source
    function copyFormattedQuote() {
      const { authorName, postTitle } = getArticleAuthorAndTitle();
      const quoteText = activeSelectedText || (quoteCardText ? quoteCardText.textContent.trim() : '');
      const titlePart = postTitle ? ` (${postTitle})` : '';
      const formatted = `“${quoteText}”\n— ${authorName}${titlePart}\nউৎস: পয়েন্টস্তি (payasti.com)`;

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

    // Helper to calculate dynamic font-size and weight based on quote text length
    function getDynamicQuoteTypography(textLength) {
      if (textLength <= 60) {
        // Very short powerful quote (1 short line)
        return {
          previewFontSize: '32px',
          previewLineHeight: '1.58',
          fontWeight: '700',
          downloadFontSize: 72,
          downloadLineHeight: 115,
          downloadFontWeight: '700'
        };
      } else if (textLength <= 120) {
        // Short quote (1-2 sentences)
        return {
          previewFontSize: '27px',
          previewLineHeight: '1.62',
          fontWeight: '700',
          downloadFontSize: 60,
          downloadLineHeight: 98,
          downloadFontWeight: '700'
        };
      } else if (textLength <= 210) {
        // Medium quote (2-4 sentences)
        return {
          previewFontSize: '23px',
          previewLineHeight: '1.68',
          fontWeight: '600',
          downloadFontSize: 50,
          downloadLineHeight: 84,
          downloadFontWeight: '600'
        };
      } else if (textLength <= 360) {
        // Standard passage (4-6 sentences)
        return {
          previewFontSize: '19.5px',
          previewLineHeight: '1.72',
          fontWeight: '600',
          downloadFontSize: 40,
          downloadLineHeight: 70,
          downloadFontWeight: '600'
        };
      } else if (textLength <= 550) {
        // Long passage
        return {
          previewFontSize: '17px',
          previewLineHeight: '1.75',
          fontWeight: '500',
          downloadFontSize: 34,
          downloadLineHeight: 58,
          downloadFontWeight: '500'
        };
      } else {
        // Extra long passage (550+ characters)
        return {
          previewFontSize: '15px',
          previewLineHeight: '1.75',
          fontWeight: '500',
          downloadFontSize: 28,
          downloadLineHeight: 48,
          downloadFontWeight: '500'
        };
      }
    }

    // Open Quote Card Modal
    if (btnMakeQuoteCard && quoteModal && quoteCardText) {
      btnMakeQuoteCard.addEventListener('click', (e) => {
        e.stopPropagation();
        quoteCardText.textContent = activeSelectedText;

        // Auto-scale font size & weight dynamically based on selected quote length
        const typo = getDynamicQuoteTypography(activeSelectedText.length);
        quoteCardText.style.fontSize = typo.previewFontSize;
        quoteCardText.style.lineHeight = typo.previewLineHeight;
        quoteCardText.style.fontWeight = typo.fontWeight;

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

    // Download Quote as PNG Image matching the exact card layout, font and proportions
    if (btnDownloadQuoteCard) {
      btnDownloadQuoteCard.addEventListener('click', async () => {
        const origBtnHtml = btnDownloadQuoteCard.innerHTML;
        btnDownloadQuoteCard.innerHTML = '⌛ প্রস্তুত হচ্ছে...';
        btnDownloadQuoteCard.disabled = true;

        try {
          // Preload and ensure payasti_uni web font is active in document
          if (document.fonts) {
            try {
              await Promise.all([
                document.fonts.load('700 72px payasti_uni'),
                document.fonts.load('700 60px payasti_uni'),
                document.fonts.load('600 50px payasti_uni'),
                document.fonts.load('600 40px payasti_uni'),
                document.fonts.load('500 34px payasti_uni'),
                document.fonts.load('bold 38px payasti_uni'),
                document.fonts.load('900 280px payasti_uni'),
                document.fonts.load('400 26px payasti_uni')
              ]);
              await document.fonts.ready;
            } catch (fe) {
              console.warn('Font loading check:', fe);
            }
          }

          const { authorName, postTitle } = getArticleAuthorAndTitle();
          const quoteText = activeSelectedText || (quoteCardText ? quoteCardText.textContent.trim() : '');

          const canvas = document.createElement('canvas');
          const size = 1200;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          // 1. Background Gradient with Rounded Corners
          const gradient = ctx.createLinearGradient(0, 0, size, size);
          gradient.addColorStop(0, '#074718');
          gradient.addColorStop(1, '#068200');
          ctx.fillStyle = gradient;

          if (typeof ctx.roundRect === 'function') {
            ctx.beginPath();
            ctx.roundRect(0, 0, size, size, 40);
            ctx.fill();
          } else {
            ctx.fillRect(0, 0, size, size);
          }

          // 2. Watermark at bottom right
          ctx.font = '900 280px payasti_uni, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText('পয়স্তি', size - 20, size - 30);
          ctx.textAlign = 'left';

          // 3. Quotation Mark at top left
          ctx.font = 'bold 160px Georgia, serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillText('“', 85, 185);

          // 4. Dynamic Typography Scaling
          const textLen = quoteText.length;
          const typo = getDynamicQuoteTypography(textLen);
          const fontSize = typo.downloadFontSize;
          const lineHeight = typo.downloadLineHeight;
          const fontWeight = typo.downloadFontWeight;

          ctx.font = `${fontWeight} ${fontSize}px payasti_uni, sans-serif`;
          ctx.fillStyle = '#ffffff';

          const maxTextWidth = size - 170; // 1030px printable width
          const rawParagraphs = quoteText.split(/\r?\n/);
          const lines = [];

          rawParagraphs.forEach((para, pIdx) => {
            const words = para.trim().split(/\s+/).filter(Boolean);
            let currentLine = '';

            words.forEach(word => {
              const testLine = currentLine ? currentLine + ' ' + word : word;
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxTextWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            });
            if (currentLine) lines.push(currentLine);
            if (pIdx < rawParagraphs.length - 1) lines.push(''); // blank line between paragraphs
          });

          // Calculate vertical center positioning between quote mark (y=230) and footer separator (y=1030)
          const availableHeight = 800; // between 230 and 1030
          const totalTextHeight = (lines.length - 1) * lineHeight + fontSize;
          const startY = 230 + Math.max(0, (availableHeight - totalTextHeight) / 2) + (fontSize * 0.85);

          let currentY = startY;
          for (let i = 0; i < lines.length; i++) {
            if (currentY > 1010) break;
            if (lines[i]) {
              ctx.fillText(lines[i], 85, currentY);
            }
            currentY += lineHeight;
          }

          // 5. Footer (Divider, Author, Source)
          const sepY = 1040;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(85, sepY);
          ctx.lineTo(size - 85, sepY);
          ctx.stroke();

          // Author
          ctx.font = 'bold 38px payasti_uni, sans-serif';
          ctx.fillStyle = '#fffae6';
          ctx.fillText(`— ${authorName}`, 85, sepY + 54);

          // Source
          ctx.font = '400 26px payasti_uni, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillText(`লেখা: ${postTitle} | payasti.com`, 85, sepY + 102);

          // 6. Download Trigger
          const link = document.createElement('a');
          link.download = `payasti-quote-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          console.error('Quote download error:', err);
        } finally {
          btnDownloadQuoteCard.innerHTML = origBtnHtml;
          btnDownloadQuoteCard.disabled = false;
        }
      });
    }
  }

  // -------------------------------------------------------------
  // Post Rating Handler (5-Star Interactive Rating)
  // -------------------------------------------------------------
  const ratingCard = document.getElementById('articleRatingCard');
  if (ratingCard) {
    const slug = ratingCard.getAttribute('data-post-slug');
    let currentUserRating = parseInt(ratingCard.getAttribute('data-user-rating') || '0', 10);
    const starBtns = ratingCard.querySelectorAll('.rating-star-btn');
    const feedbackMsg = document.getElementById('ratingFeedbackMsg');
    const avgDisplay = document.getElementById('ratingAvgDisplay');
    const countDisplay = document.getElementById('ratingCountDisplay');
    const topScore = document.getElementById('topRatingScore');
    const topCount = document.getElementById('topRatingCount');

    // Bengali numbers helper
    const toBengaliNumber = (num) => {
      const bnDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
      return String(num).replace(/[0-9]/g, (w) => bnDigits[+w]);
    };

    const updateStarVisuals = (ratingValue) => {
      starBtns.forEach((btn) => {
        const val = parseInt(btn.getAttribute('data-value'), 10);
        if (val <= ratingValue) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
        btn.classList.remove('hovered');
      });
    };

    const previewStars = (hoverValue) => {
      starBtns.forEach((btn) => {
        const val = parseInt(btn.getAttribute('data-value'), 10);
        if (val <= hoverValue) {
          btn.classList.add('hovered');
        } else {
          btn.classList.remove('hovered');
        }
      });
    };

    // Initialize with current rating if already rated
    if (currentUserRating > 0) {
      updateStarVisuals(currentUserRating);
    }

    starBtns.forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        const val = parseInt(btn.getAttribute('data-value'), 10);
        previewStars(val);
      });

      btn.addEventListener('click', async () => {
        const rating = parseInt(btn.getAttribute('data-value'), 10);
        try {
          btn.disabled = true;
          const res = await fetch(`/post/${encodeURIComponent(slug)}/rate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ rating })
          });

          const data = await res.json();
          btn.disabled = false;

          if (data.success) {
            currentUserRating = rating;
            ratingCard.setAttribute('data-user-rating', rating);
            updateStarVisuals(rating);

            if (avgDisplay) {
              avgDisplay.textContent = toBengaliNumber(parseFloat(data.rating_score || 0).toFixed(1));
            }
            if (countDisplay) {
              countDisplay.textContent = `(${toBengaliNumber(data.rating_count || 0)}টি রেটিং)`;
            }
            if (topScore) {
              topScore.textContent = toBengaliNumber(parseFloat(data.rating_score || 0).toFixed(1));
            }
            if (topCount) {
              topCount.textContent = `(${toBengaliNumber(data.rating_count || 0)})`;
            }

            if (feedbackMsg) {
              feedbackMsg.className = 'rating-feedback-msg success';
              feedbackMsg.textContent = data.message || 'আপনার রেটিং সফলভাবে গ্রহণ করা হয়েছে। ধন্যবাদ!';
              feedbackMsg.style.display = 'block';
            }
          } else {
            if (feedbackMsg) {
              feedbackMsg.className = 'rating-feedback-msg error';
              feedbackMsg.textContent = data.error || 'রেটিং সংরক্ষণ করতে সমস্যা হয়েছে।';
              feedbackMsg.style.display = 'block';
            }
          }
        } catch (err) {
          btn.disabled = false;
          console.error('Rating submission error:', err);
          if (feedbackMsg) {
            feedbackMsg.className = 'rating-feedback-msg error';
            feedbackMsg.textContent = 'নেটওয়ার্ক সমস্যার কারণে রেটিং দেওয়া যায়নি। আবার চেষ্টা করুন।';
            feedbackMsg.style.display = 'block';
          }
        }
      });
    });

    const starsContainer = document.getElementById('ratingStarsContainer');
    if (starsContainer) {
      starsContainer.addEventListener('mouseleave', () => {
        starBtns.forEach(b => b.classList.remove('hovered'));
        updateStarVisuals(currentUserRating);
      });
    }
  }
});


