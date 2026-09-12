/**
 * Payasti Universal Media Modal & Drag-and-Drop Image Picker Controller
 */
(function () {
  'use strict';

  let mediaFiles = [];
  let selectedFile = null;
  let currentCallback = null;
  let isFetching = false;

  // DOM Elements for Modal
  const modalEl = document.getElementById('payastiMediaModal');
  if (!modalEl) return;

  const closeBtn = document.getElementById('closeMediaModalBtn');
  const cancelBtn = document.getElementById('btnMediaCancel');
  const confirmBtn = document.getElementById('btnMediaConfirmSelect');
  const tabBtns = modalEl.querySelectorAll('.media-tab-btn');
  const libraryPane = document.getElementById('mediaLibraryPane');
  const uploadPane = document.getElementById('mediaUploadPane');
  const searchInput = document.getElementById('mediaSearchInput');
  const countBadge = document.getElementById('mediaCountBadge');
  const itemsGrid = document.getElementById('mediaItemsGrid');
  const detailsSidebar = document.getElementById('mediaDetailsSidebar');
  const detailsPreview = document.getElementById('mediaDetailsPreview');
  const detailsFilename = document.getElementById('mediaDetailsFilename');
  const detailsSize = document.getElementById('mediaDetailsSize');
  const detailsDate = document.getElementById('mediaDetailsDate');
  const footerStatus = document.getElementById('mediaFooterStatus');
  const modalDropzone = document.getElementById('modalDropzoneBox');
  const modalFileInput = document.getElementById('modalFileInput');
  const modalBrowseBtn = document.getElementById('btnModalBrowse');
  const modalProgress = document.getElementById('modalUploadProgress');
  const modalProgressBar = document.getElementById('modalUploadProgressBar');

  // Convert English digits to Bengali digits
  function toBn(num) {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, d => bnDigits[d]);
  }

  // --------------------------------------------------------------------------
  // 1. MODAL CORE METHODS
  // --------------------------------------------------------------------------
  const PayastiMediaModal = {
    open: function (options) {
      options = options || {};
      currentCallback = options.onSelect || null;
      selectedFile = null;
      updateConfirmButton();

      modalEl.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Switch to library tab by default
      switchTab('library');

      // Fetch or refresh media list
      fetchMediaFiles(options.currentUrl);
    },

    close: function () {
      modalEl.classList.remove('active');
      document.body.style.overflow = '';
      currentCallback = null;
      selectedFile = null;
    }
  };

  // Expose globally
  window.PayastiMediaModal = PayastiMediaModal;

  // Close handlers
  if (closeBtn) closeBtn.addEventListener('click', PayastiMediaModal.close);
  if (cancelBtn) cancelBtn.addEventListener('click', PayastiMediaModal.close);
  modalEl.addEventListener('click', function (e) {
    if (e.target === modalEl) {
      PayastiMediaModal.close();
    }
  });

  // Esc key closes modal
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalEl.classList.contains('active')) {
      PayastiMediaModal.close();
    }
  });

  // --------------------------------------------------------------------------
  // 2. TAB SWITCHING
  // --------------------------------------------------------------------------
  function switchTab(tabName) {
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    if (tabName === 'library') {
      libraryPane.classList.add('active');
      uploadPane.classList.remove('active');
    } else {
      libraryPane.classList.remove('active');
      uploadPane.classList.add('active');
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      switchTab(this.getAttribute('data-tab'));
    });
  });

  // --------------------------------------------------------------------------
  // 3. FETCH & RENDER MEDIA LIBRARY
  // --------------------------------------------------------------------------
  function fetchMediaFiles(preselectUrl) {
    if (isFetching) return;
    isFetching = true;
    if (countBadge) countBadge.textContent = 'লোড হচ্ছে...';

    fetch('/api/media')
      .then(res => res.json())
      .then(data => {
        isFetching = false;
        if (data.success && Array.isArray(data.files)) {
          mediaFiles = data.files;
          renderGrid(mediaFiles, preselectUrl);
        } else {
          if (itemsGrid) itemsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">কোনো ছবি পাওয়া যায়নি।</div>';
          if (countBadge) countBadge.textContent = '০ টি ফাইল';
        }
      })
      .catch(err => {
        isFetching = false;
        console.error('Failed to load media files:', err);
        if (itemsGrid) itemsGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#dc2626;">ছবি লোড করতে সমস্যা হয়েছে!</div>';
        if (countBadge) countBadge.textContent = 'ত্রুটি';
      });
  }

  function renderGrid(files, preselectUrl) {
    if (!itemsGrid) return;
    itemsGrid.innerHTML = '';

    if (countBadge) {
      countBadge.textContent = `মোট ${toBn(files.length)} টি ছবি`;
    }

    if (!files.length) {
      itemsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: #64748b;">
          <div style="font-size: 40px; margin-bottom: 10px;">🖼️</div>
          <div style="font-size: 16px; font-weight: 600;">কোনো ছবি নেই</div>
          <div style="font-size: 14px; margin-top: 4px;">"নতুন আপলোড" ট্যাব থেকে সরাসরি ছবি যোগ করুন।</div>
        </div>
      `;
      hideDetails();
      return;
    }

    files.forEach(file => {
      const itemEl = document.createElement('div');
      itemEl.className = 'media-grid-item';
      itemEl.setAttribute('data-url', file.url);
      itemEl.setAttribute('data-filename', file.filename);

      const isMatching = preselectUrl && (preselectUrl === file.url || preselectUrl.endsWith(file.filename));
      if (isMatching) {
        itemEl.classList.add('selected');
        selectedFile = file;
        showDetails(file);
      }

      itemEl.innerHTML = `
        <img src="${file.url}" alt="${file.filename}" loading="lazy">
        <div class="media-item-check">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      `;

      itemEl.addEventListener('click', function () {
        itemsGrid.querySelectorAll('.media-grid-item').forEach(i => i.classList.remove('selected'));
        itemEl.classList.add('selected');
        selectedFile = file;
        showDetails(file);
        updateConfirmButton();
      });

      // Double-click to instantly confirm selection
      itemEl.addEventListener('dblclick', function () {
        selectedFile = file;
        confirmSelection();
      });

      itemsGrid.appendChild(itemEl);
    });

    updateConfirmButton();
  }

  // Filter grid by search keyword
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const q = this.value.trim().toLowerCase();
      if (!q) {
        renderGrid(mediaFiles);
        return;
      }
      const filtered = mediaFiles.filter(f => f.filename.toLowerCase().includes(q));
      renderGrid(filtered);
    });
  }

  function showDetails(file) {
    if (!detailsSidebar) return;
    detailsSidebar.style.display = 'flex';
    if (detailsPreview) detailsPreview.src = file.url;
    if (detailsFilename) detailsFilename.textContent = file.filename;
    if (detailsSize) detailsSize.textContent = `সাইজ: ${file.size}`;
    if (detailsDate && file.mtime) {
      try {
        const d = new Date(file.mtime);
        detailsDate.textContent = `তারিখ: ${d.toLocaleDateString()}`;
      } catch (e) {
        detailsDate.textContent = '';
      }
    }
  }

  function hideDetails() {
    if (detailsSidebar) detailsSidebar.style.display = 'none';
  }

  function updateConfirmButton() {
    if (!confirmBtn) return;
    if (selectedFile) {
      confirmBtn.disabled = false;
      if (footerStatus) footerStatus.textContent = `নির্বাচিত ছবি: ${selectedFile.filename}`;
    } else {
      confirmBtn.disabled = true;
      if (footerStatus) footerStatus.textContent = 'কোনো ছবি নির্বাচিত হয়নি';
      hideDetails();
    }
  }

  // Confirm selection action
  function confirmSelection() {
    if (!selectedFile) return;
    if (typeof currentCallback === 'function') {
      currentCallback(selectedFile);
    }
    PayastiMediaModal.close();
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmSelection);
  }

  // --------------------------------------------------------------------------
  // 4. AJAX UPLOAD INSIDE MODAL (Tab 2)
  // --------------------------------------------------------------------------
  if (modalBrowseBtn && modalFileInput) {
    modalBrowseBtn.addEventListener('click', () => modalFileInput.click());
  }

  if (modalDropzone && modalFileInput) {
    modalDropzone.addEventListener('click', (e) => {
      if (e.target !== modalBrowseBtn) {
        modalFileInput.click();
      }
    });

    modalFileInput.addEventListener('change', function () {
      if (this.files && this.files.length) {
        uploadFileFromModal(this.files[0]);
      }
    });

    // Drag events for modal dropzone
    ['dragenter', 'dragover'].forEach(eventName => {
      modalDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        modalDropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      modalDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        modalDropzone.classList.remove('drag-over');
      });
    });

    modalDropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        uploadFileFromModal(e.dataTransfer.files[0]);
      }
    });
  }

  function uploadFileFromModal(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে একটি সঠিক ইমেজ ফাইল (JPG, PNG, WebP) নির্বাচন করুন।');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    if (modalProgress) modalProgress.style.display = 'block';
    if (modalProgressBar) modalProgressBar.style.width = '30%';

    fetch('/api/media/upload', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (modalProgressBar) modalProgressBar.style.width = '100%';
        setTimeout(() => {
          if (modalProgress) modalProgress.style.display = 'none';
          if (modalProgressBar) modalProgressBar.style.width = '0%';
        }, 500);

        if (data.success && data.file) {
          // Prepend to files list
          mediaFiles.unshift(data.file);
          selectedFile = data.file;

          // Switch to library tab and select this file
          switchTab('library');
          renderGrid(mediaFiles, data.file.url);
        } else {
          alert(data.error || 'ছবি আপলোড করতে ব্যর্থ হয়েছে!');
        }
      })
      .catch(err => {
        if (modalProgress) modalProgress.style.display = 'none';
        console.error('Modal upload error:', err);
        alert('ছবি আপলোড করতে ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করুন।');
      });
  }

  // --------------------------------------------------------------------------
  // 5. DRAG-AND-DROP IMAGE PICKER WIDGETS (Form Fields)
  // --------------------------------------------------------------------------
  function initImageDropzones() {
    const dropzones = document.querySelectorAll('.payasti-image-dropzone');

    dropzones.forEach(dz => {
      if (dz.dataset.initialized) return;
      dz.dataset.initialized = 'true';

      const inputName = dz.dataset.name || 'featured_image';
      const hiddenInput = dz.querySelector('input[type="hidden"]') || createHiddenInput(dz, inputName);
      const initialUrl = dz.dataset.initialUrl || hiddenInput.value || '';

      // Render initial state
      if (initialUrl && initialUrl.trim() !== '') {
        renderPopulatedState(dz, initialUrl);
      } else {
        renderEmptyState(dz);
      }

      // Drag & Drop handlers
      ['dragenter', 'dragover'].forEach(eventName => {
        dz.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dz.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dz.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dz.classList.remove('drag-over');
        });
      });

      dz.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          const file = e.dataTransfer.files[0];
          uploadFileDirectly(dz, file, hiddenInput);
        }
      });

      // Click on dropzone opens Media Library
      dz.addEventListener('click', (e) => {
        // If clicking on the remove button, do not open modal
        if (e.target.closest('.btn-dropzone-remove')) {
          e.stopPropagation();
          clearDropzone(dz, hiddenInput);
          return;
        }

        PayastiMediaModal.open({
          currentUrl: hiddenInput.value,
          onSelect: function (file) {
            hiddenInput.value = file.url;
            renderPopulatedState(dz, file.url);
          }
        });
      });
    });
  }

  function createHiddenInput(dz, name) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    dz.appendChild(input);
    return input;
  }

  function renderEmptyState(dz) {
    const promptText = dz.dataset.prompt || 'ছবি ড্র্যাগ করে ছাড়ুন অথবা ক্লিক করুন';
    const hintText = dz.dataset.hint || 'মিডিয়া লাইব্রেরি থেকে ছবি বাছুন বা নতুন আপলোড করুন';

    dz.innerHTML = `
      <input type="hidden" name="${dz.dataset.name || 'featured_image'}" value="">
      <div class="dropzone-empty-state">
        <div class="dropzone-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <div class="dropzone-title">${promptText}</div>
        <div class="dropzone-hint">${hintText}</div>
      </div>
    `;
  }

  function renderPopulatedState(dz, imageUrl) {
    const inputName = dz.dataset.name || 'featured_image';
    dz.innerHTML = `
      <input type="hidden" name="${inputName}" value="${imageUrl}">
      <div class="dropzone-preview-wrap">
        <img src="${imageUrl}" alt="Selected Image" class="dropzone-preview-img">
        <div class="dropzone-overlay-actions">
          <button type="button" class="btn-dropzone-action btn-dropzone-change">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            পরিবর্তন
          </button>
          <button type="button" class="btn-dropzone-action btn-dropzone-remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            মুছুন
          </button>
        </div>
      </div>
    `;
  }

  function clearDropzone(dz, hiddenInput) {
    if (hiddenInput) hiddenInput.value = '';
    renderEmptyState(dz);
  }

  function uploadFileDirectly(dz, file, hiddenInput) {
    if (!file || !file.type.startsWith('image/')) {
      alert('শুধুমাত্র ইমেজ ফাইল (JPG, PNG, WebP) ড্রপ করুন!');
      return;
    }

    const inputName = dz.dataset.name || 'featured_image';
    dz.innerHTML = `
      <input type="hidden" name="${inputName}" value="">
      <div class="dropzone-uploading">
        <div class="dropzone-spinner"></div>
        <div>ছবি আপলোড হচ্ছে...</div>
      </div>
    `;

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/media/upload', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.file) {
          // Prepend to global cache
          mediaFiles.unshift(data.file);
          renderPopulatedState(dz, data.file.url);
        } else {
          alert(data.error || 'ছবি আপলোড ব্যর্থ হয়েছে!');
          renderEmptyState(dz);
        }
      })
      .catch(err => {
        console.error('Direct drop upload error:', err);
        alert('ছবি আপলোড করতে সমস্যা হয়েছে!');
        renderEmptyState(dz);
      });
  }

  // Expose init helper globally
  window.initImageDropzones = initImageDropzones;

  // Auto initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageDropzones);
  } else {
    initImageDropzones();
  }

})();
