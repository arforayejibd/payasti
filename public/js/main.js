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
});
