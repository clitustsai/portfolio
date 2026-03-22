// interactions-vip.js — Auto-run VIP animations on all pages
// Scroll reveal, ripple, skill bars, counter, particles

(function() {
  'use strict';

  // ===== SCROLL REVEAL =====
  function initScrollReveal() {
    // Auto-add reveal class to common elements if not already set
    var selectors = [
      '.project-card', '.about-card', '.cert-card', '.skill-item',
      '.blog-card', '.pricing-card', '.tool-card', '.section-title',
      '.contact-card', '.map-section', '.feedback'
    ];
    selectors.forEach(function(sel, si) {
      document.querySelectorAll(sel).forEach(function(el, i) {
        if (!el.classList.contains('reveal') && !el.classList.contains('reveal-left') && !el.classList.contains('reveal-right')) {
          el.classList.add('reveal');
          // Stagger delay
          var delay = (i % 5) + 1;
          el.classList.add('reveal-d' + delay);
        }
      });
    });

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function(el) {
      observer.observe(el);
    });
  }

  // ===== SKILL BAR ANIMATION =====
  function initSkillBars() {
    var bars = document.querySelectorAll('.skill-progress, .skill-bar, [class*="skill-fill"]');
    if (!bars.length) return;
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var width = el.style.width || el.getAttribute('data-width') || el.getAttribute('style');
          // Extract percentage from inline style
          var match = (el.getAttribute('style') || '').match(/width\s*:\s*([\d.]+%)/);
          if (match) {
            el.style.setProperty('--target-width', match[1]);
            el.style.width = '0';
            el.classList.add('skill-progress-bar');
            setTimeout(function() { el.classList.add('animated'); el.style.width = match[1]; }, 100);
          }
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.3 });
    bars.forEach(function(b) { obs.observe(b); });
  }

  // ===== COUNTER ANIMATION =====
  function animateCounter(el, target, duration) {
    var start = 0;
    var step = target / (duration / 16);
    var timer = setInterval(function() {
      start += step;
      if (start >= target) { start = target; clearInterval(timer); }
      el.textContent = Math.floor(start).toLocaleString();
    }, 16);
  }
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-count')) || 0;
          animateCounter(el, target, 1500);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    els.forEach(function(el) { obs.observe(el); });
  }

  // ===== RIPPLE EFFECT =====
  function initRipple() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('button, .btn, .btn-submit, .btn-vip, .btn-pricing, .nav-user-btn, .nav-login-btn, .auth-submit-btn');
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 2;
      var x = e.clientX - rect.left - size / 2;
      var y = e.clientY - rect.top - size / 2;
      var ripple = document.createElement('span');
      ripple.className = 'ripple-circle';
      ripple.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px;';
      // Ensure overflow hidden
      if (getComputedStyle(btn).overflow !== 'hidden') btn.style.overflow = 'hidden';
      btn.style.position = btn.style.position || 'relative';
      btn.appendChild(ripple);
      setTimeout(function() { ripple.remove(); }, 700);
    });
  }

  // ===== NAVBAR SCROLL EFFECT =====
  function initNavScroll() {
    var header = document.querySelector('header');
    if (!header) return;
    var lastY = 0;
    window.addEventListener('scroll', function() {
      var y = window.scrollY;
      if (y > 80) {
        header.style.boxShadow = '0 4px 30px rgba(102,126,234,0.15)';
      } else {
        header.style.boxShadow = '';
      }
      // Hide on scroll down, show on scroll up (only on mobile)
      if (window.innerWidth <= 768) {
        if (y > lastY + 5 && y > 120) {
          header.style.transform = 'translateY(-100%)';
        } else if (y < lastY - 5) {
          header.style.transform = 'translateY(0)';
        }
      }
      lastY = y;
    }, { passive: true });
    header.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
  }

  // ===== SMOOTH ANCHOR SCROLL =====
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(a) {
      a.addEventListener('click', function(e) {
        var id = a.getAttribute('href').slice(1);
        if (!id) return;
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ===== PAGE TRANSITION =====
  function initPageTransition() {
    var style = document.createElement('style');
    style.textContent = 'body{animation:pageFadeIn 0.4s ease;}@keyframes pageFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(style);
  }

  // ===== CURSOR GLOW (desktop only) =====
  function initCursorGlow() {
    if (window.innerWidth < 1024 || window.matchMedia('(pointer:coarse)').matches) return;
    var cursor = document.createElement('div');
    cursor.style.cssText = 'position:fixed;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle,rgba(102,126,234,0.4),transparent);pointer-events:none;z-index:99999;transform:translate(-50%,-50%);transition:transform 0.1s ease,opacity 0.3s;mix-blend-mode:screen;';
    document.body.appendChild(cursor);
    var mx = 0, my = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', function(e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    function animCursor() {
      cx += (mx - cx) * 0.15;
      cy += (my - cy) * 0.15;
      cursor.style.left = cx + 'px';
      cursor.style.top = cy + 'px';
      requestAnimationFrame(animCursor);
    }
    animCursor();
    document.addEventListener('mousedown', function() { cursor.style.transform = 'translate(-50%,-50%) scale(1.8)'; });
    document.addEventListener('mouseup', function() { cursor.style.transform = 'translate(-50%,-50%) scale(1)'; });
  }

  // ===== INIT ALL =====
  function init() {
    initPageTransition();
    initScrollReveal();
    initSkillBars();
    initCounters();
    initRipple();
    initNavScroll();
    initSmoothScroll();
    initCursorGlow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
