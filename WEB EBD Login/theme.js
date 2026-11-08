/**
 * OUTFIT REQ — Global Theme Controller (Light & Dark Mode)
 * Sinkronisasi tema terpusat antar halaman & tab dengan zero-FOUC.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'outfit_req_theme';
  const FALLBACK_KEY = 'theme';

  const SUN_SVG = `<svg class="theme-icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
  const MOON_SVG = `<svg class="theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;

  function getSystemPreference() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {}
    return 'light';
  }

  function getStoredTheme() {
    try {
      const v = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(FALLBACK_KEY);
      if (v === 'dark' || v === 'light') return v;
    } catch (e) {}
    return null;
  }

  function resolveTheme() {
    const stored = getStoredTheme();
    if (stored) return stored;
    return getSystemPreference();
  }

  function applyTheme(theme, save = false) {
    const isDark = theme === 'dark';
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      if (document.body) document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      if (document.body) document.body.classList.remove('dark');
    }

    if (save) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
        localStorage.setItem(FALLBACK_KEY, theme);
      } catch (e) {}
    }

    updateUIElements(theme);

    try {
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme, isDark } }));
    } catch (e) {}
  }

  function updateUIElements(theme) {
    const isDark = theme === 'dark';
    const tooltipText = isDark ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap';
    const labelText = isDark ? 'Mode Terang' : 'Mode Gelap';

    // 1. Tombol toggle umum
    const buttons = document.querySelectorAll('.theme-toggle-btn, [data-theme-toggle], #themeToggleBtn, #themeToggleBtnMobile');
    buttons.forEach((btn) => {
      btn.setAttribute('title', tooltipText);
      btn.setAttribute('aria-label', tooltipText);
      btn.setAttribute('data-current-theme', theme);

      // Cari atau buat wadah icon
      let iconSlot = btn.querySelector('.theme-toggle-icon-slot');
      if (!iconSlot) {
        btn.innerHTML = `<span class="theme-toggle-icon-slot" style="display:inline-flex;align-items:center;justify-content:center;transition:transform 0.3s ease;">${isDark ? SUN_SVG : MOON_SVG}</span>`;
      } else {
        iconSlot.innerHTML = isDark ? SUN_SVG : MOON_SVG;
      }
    });

    // 2. Elemen teks status mode tampilan (jika ada)
    const textEls = document.querySelectorAll('.theme-status-text, #mobileThemeStatus, #dropdownThemeText');
    textEls.forEach((el) => {
      el.textContent = isDark ? 'Mode Gelap Aktif' : 'Mode Terang Aktif';
    });

    // 3. Radio / segment kontrol (pada pengaturan akun jika ada)
    const radioDark = document.getElementById('themeRadioDark');
    const radioLight = document.getElementById('themeRadioLight');
    if (radioDark && radioLight) {
      radioDark.checked = isDark;
      radioLight.checked = !isDark;
    }
  }

  function toggleTheme() {
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
    return next;
  }

  // Terapkan tema secepat mungkin sebelum render pertama
  const initialTheme = resolveTheme();
  applyTheme(initialTheme, false);

  // Expose API ke global window
  window.OutfitReqTheme = {
    get: () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    set: (t) => applyTheme(t, true),
    toggle: toggleTheme,
    refreshUI: () => updateUIElements(window.OutfitReqTheme.get()),
  };
  window.toggleTheme = toggleTheme;
  window.getCurrentTheme = window.OutfitReqTheme.get;

  // Dengarkan perubahan antar-tab via localStorage
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === FALLBACK_KEY) {
      if (e.newValue === 'dark' || e.newValue === 'light') {
        applyTheme(e.newValue, false);
      }
    }
  });

  // Dengarkan perubahan skema warna bawaan OS jika pengguna belum set preferensi eksplisit
  try {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!getStoredTheme()) {
          applyTheme(e.matches ? 'dark' : 'light', false);
        }
      });
    }
  } catch (e) {}

  // Update UI saat DOM selesai dimuat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateUIElements(window.OutfitReqTheme.get());
    });
  } else {
    updateUIElements(window.OutfitReqTheme.get());
  }
})();
