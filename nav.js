// nav.js — Shared navbar logic: theme toggle, lang toggle, hamburger, nav-dropdown
// Load trên tất cả trang sau api.js và auth.js

(function() {
  // ===== THEME TOGGLE =====
  var htmlEl = document.documentElement;
  // Apply saved theme ngay lập tức (trước DOMContentLoaded để tránh flash)
  var savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') htmlEl.setAttribute('data-theme', 'dark');

  document.addEventListener('DOMContentLoaded', function() {
    var themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      // Sync icon với theme hiện tại
      var isDark = htmlEl.getAttribute('data-theme') === 'dark';
      themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

      themeToggle.addEventListener('click', function() {
        var dark = htmlEl.getAttribute('data-theme') === 'dark';
        htmlEl.setAttribute('data-theme', dark ? 'light' : 'dark');
        localStorage.setItem('theme', dark ? 'light' : 'dark');
        themeToggle.innerHTML = dark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        if (typeof showToast === 'function') showToast(dark ? '☀️ Chế độ sáng' : '🌙 Chế độ tối', 'info', 1500);
      });
    }

    // ===== LANG TOGGLE =====
    var langToggle = document.getElementById('langToggle');
    if (langToggle) {
      var currentLang = localStorage.getItem('lang') || 'vi';
      langToggle.textContent = currentLang === 'vi' ? '🇻🇳' : '🇺🇸';
      langToggle.addEventListener('click', function() {
        var lang = localStorage.getItem('lang') || 'vi';
        var newLang = lang === 'vi' ? 'en' : 'vi';
        localStorage.setItem('lang', newLang);
        langToggle.textContent = newLang === 'vi' ? '🇻🇳' : '🇺🇸';
        if (typeof applyI18n === 'function') applyI18n(newLang);
      });
    }

    // ===== HAMBURGER =====
    var hamburger = document.getElementById('navHamburger');
    var navUl = document.querySelector('nav ul');
    if (hamburger && navUl) {
      hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        var open = hamburger.classList.toggle('open');
        navUl.classList.toggle('open', open);
        document.body.style.overflow = open ? 'hidden' : '';
        // Ẩn/hiện floating elements khi menu mở/đóng
        var floats = ['rec-toggle', 'rec-panel', 'cw-fab', '_bugBtn', 'pn-bell', 'fabGroup'];
        floats.forEach(function(id) {
          var el = document.getElementById(id);
          if (el) el.style.visibility = open ? 'hidden' : '';
        });
      });
      document.addEventListener('click', function(e) {
        if (navUl.classList.contains('open') && !navUl.contains(e.target) && e.target !== hamburger) {
          hamburger.classList.remove('open');
          navUl.classList.remove('open');
          document.body.style.overflow = '';
          var floats = ['rec-toggle', 'rec-panel', 'cw-fab', '_bugBtn', 'pn-bell', 'fabGroup'];
          floats.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.visibility = '';
          });
        }
      });
    }

    // ===== NAV DROPDOWN (mobile) =====
    document.querySelectorAll('.nav-dropdown').forEach(function(dd) {
      var toggle = dd.querySelector('.nav-dropdown-toggle');
      if (toggle) {
        toggle.addEventListener('click', function(e) {
          if (window.innerWidth <= 768) {
            e.preventDefault();
            dd.classList.toggle('open');
          }
        });
      }
      document.addEventListener('click', function(e) {
        if (!dd.contains(e.target)) dd.classList.remove('open');
      });
    });
  });
})();
