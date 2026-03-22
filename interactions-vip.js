// interactions-vip.js — VIP Auto Animations v2
// Typewriter, shimmer text, scroll reveal, 3D tilt, magnetic hover, ripple, counters

(function () {
  'use strict';

  // ===== TYPEWRITER =====
  function initTypewriter() {
    document.querySelectorAll('[data-typewriter]').forEach(function (el) {
      var texts = el.getAttribute('data-typewriter').split('|');
      var speed = parseInt(el.getAttribute('data-tw-speed') || '60');
      var pause = parseInt(el.getAttribute('data-tw-pause') || '1800');
      var idx = 0, charIdx = 0, deleting = false;
      el.classList.add('typewriter-cursor');
      function tick() {
        var current = texts[idx];
        if (!deleting) {
          el.textContent = current.slice(0, ++charIdx);
          if (charIdx === current.length) {
            deleting = true;
            setTimeout(tick, pause);
            return;
          }
        } else {
          el.textContent = current.slice(0, --charIdx);
          if (charIdx === 0) {
            deleting = false;
            idx = (idx + 1) % texts.length;
          }
        }
        setTimeout(tick, deleting ? speed / 2 : speed);
      }
      tick();
    });
  }

  // ===== AUTO SHIMMER TEXT — headings, .shimmer-auto =====
  function initShimmerText() {
    // Tự động thêm shimmer cho các heading quan trọng nếu chưa có
    document.querySelectorAll('.shimmer-auto, .hero-name-gradient').forEach(function (el) {
      el.classList.add('shimmer-text');
    });
  }

  // ===== SCROLL REVEAL =====
  function initScrollReveal() {
    var selectors = [
      '.project-card', '.about-card', '.cert-card', '.skill-item',
      '.blog-card', '.pricing-card', '.tool-card', '.section-title',
      '.contact-card', '.feedback', '.phase-card', '.doc-section',
      '.stat-item', '.timeline-row', '.vip-banner', '.tool-header'
    ];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el, i) {
        if (!el.classList.contains('reveal') && !el.classList.contains('reveal-left') && !el.classList.contains('reveal-right') && !el.classList.contains('reveal-scale')) {
          el.classList.add('reveal');
          el.classList.add('reveal-d' + ((i % 5) + 1));
        }
      });
    });

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function (el) {
      obs.observe(el);
    });
  }

  // ===== COUNTER ANIMATION =====
  function animateCounter(el, target, duration) {
    var start = 0, step = target / (duration / 16);
    var suffix = el.getAttribute('data-suffix') || '';
    var timer = setInterval(function () {
      start = Math.min(start + step, target);
      el.textContent = Math.floor(start).toLocaleString() + suffix;
      if (start >= target) clearInterval(timer);
    }, 16);
  }
  function initCounters() {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          animateCounter(el, parseInt(el.getAttribute('data-count')) || 0, 1500);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-count]').forEach(function (el) { obs.observe(el); });
  }

  // ===== SKILL BAR ANIMATION =====
  function initSkillBars() {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var match = (el.getAttribute('style') || '').match(/width\s*:\s*([\d.]+%)/);
          if (match) {
            el.style.setProperty('--target-width', match[1]);
            el.style.width = '0';
            el.classList.add('skill-progress-bar');
            setTimeout(function () { el.classList.add('animated'); el.style.width = match[1]; }, 80);
          }
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('.skill-progress, .skill-bar, [class*="skill-fill"]').forEach(function (b) { obs.observe(b); });
  }

  // ===== 3D TILT HOVER =====
  function initTilt() {
    if (window.matchMedia('(pointer:coarse)').matches) return; // skip touch
    var cards = document.querySelectorAll('.project-card, .about-card, .cert-card, .blog-card, .tool-card, .pricing-card');
    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = 'perspective(800px) rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 8) + 'deg) translateY(-8px) scale(1.02)';
        card.style.transition = 'transform 0.1s ease';
        // Spotlight
        var spotlight = card.querySelector('.card-spotlight');
        if (spotlight) {
          spotlight.style.background = 'radial-gradient(circle at ' + ((x + 0.5) * 100) + '% ' + ((y + 0.5) * 100) + '%, rgba(255,255,255,0.12) 0%, transparent 60%)';
        }
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s cubic-bezier(0.4,0,0.2,1)';
      });
      // Add spotlight layer
      if (!card.querySelector('.card-spotlight')) {
        var sp = document.createElement('div');
        sp.className = 'card-spotlight';
        sp.style.cssText = 'position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:1;transition:background 0.1s;';
        card.style.position = card.style.position || 'relative';
        card.appendChild(sp);
      }
    });
  }

  // ===== MAGNETIC BUTTONS =====
  function initMagnetic() {
    if (window.matchMedia('(pointer:coarse)').matches) return;
    document.querySelectorAll('.btn-submit, .btn-vip, .btn-pricing-vip, .nav-user-btn, .nav-login-btn, .auth-submit-btn').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = (e.clientX - rect.left - rect.width / 2) * 0.25;
        var y = (e.clientY - rect.top - rect.height / 2) * 0.25;
        btn.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(1.04)';
        btn.style.transition = 'transform 0.15s ease';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
        btn.style.transition = 'transform 0.4s cubic-bezier(0.4,0,0.2,1)';
      });
    });
  }

  // ===== RIPPLE EFFECT =====
  function initRipple() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('button, .btn, .btn-submit, .btn-vip, .btn-pricing, .nav-user-btn, .nav-login-btn, .auth-submit-btn, .tab-btn, .filter-btn');
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 2.2;
      var ripple = document.createElement('span');
      ripple.className = 'ripple-circle';
      ripple.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - rect.left - size / 2) + 'px;top:' + (e.clientY - rect.top - size / 2) + 'px;';
      if (getComputedStyle(btn).overflow !== 'hidden') btn.style.overflow = 'hidden';
      btn.style.position = btn.style.position || 'relative';
      btn.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 700);
    });
  }

  // ===== NAVBAR SCROLL =====
  function initNavScroll() {
    var header = document.querySelector('header');
    if (!header) return;
    var lastY = 0;
    header.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease';
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      header.style.boxShadow = y > 60 ? '0 4px 30px rgba(102,126,234,0.18)' : '';
      if (window.innerWidth <= 768) {
        if (y > lastY + 8 && y > 120) header.style.transform = 'translateY(-100%)';
        else if (y < lastY - 8) header.style.transform = 'translateY(0)';
      }
      lastY = y;
    }, { passive: true });
  }

  // ===== SMOOTH ANCHOR SCROLL =====
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        if (!id) return;
        var target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ===== PAGE FADE IN — chỉ chạy 1 lần per session =====
  function initPageTransition() {
    var key = 'vip_loaded_' + location.pathname;
    if (sessionStorage.getItem(key)) return; // đã load rồi, bỏ qua
    sessionStorage.setItem(key, '1');
    var s = document.createElement('style');
    s.textContent = 'body{animation:vipPageIn 0.45s cubic-bezier(0.4,0,0.2,1);}@keyframes vipPageIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(s);
  }

  // ===== CURSOR GLOW (desktop) =====
  function initCursorGlow() {
    if (window.innerWidth < 1024 || window.matchMedia('(pointer:coarse)').matches) return;
    var dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;width:10px;height:10px;border-radius:50%;background:var(--g1,#667eea);pointer-events:none;z-index:99999;transform:translate(-50%,-50%);mix-blend-mode:screen;transition:transform 0.08s ease;';
    var ring = document.createElement('div');
    ring.style.cssText = 'position:fixed;width:36px;height:36px;border:2px solid rgba(102,126,234,0.45);border-radius:50%;pointer-events:none;z-index:99998;transform:translate(-50%,-50%);mix-blend-mode:screen;transition:all 0.18s ease;';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    var mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; }, { passive: true });
    function animRing() {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(animRing);
    }
    animRing();
    document.addEventListener('mousedown', function () { dot.style.transform = 'translate(-50%,-50%) scale(2)'; ring.style.transform = 'translate(-50%,-50%) scale(0.6)'; ring.style.borderColor = 'rgba(102,126,234,0.8)'; });
    document.addEventListener('mouseup', function () { dot.style.transform = 'translate(-50%,-50%) scale(1)'; ring.style.transform = 'translate(-50%,-50%) scale(1)'; ring.style.borderColor = 'rgba(102,126,234,0.45)'; });
    // Hide on interactive elements
    document.querySelectorAll('a,button,input,textarea,select').forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.style.transform = 'translate(-50%,-50%) scale(1.6)'; ring.style.borderColor = 'rgba(102,126,234,0.7)'; });
      el.addEventListener('mouseleave', function () { ring.style.transform = 'translate(-50%,-50%) scale(1)'; ring.style.borderColor = 'rgba(102,126,234,0.45)'; });
    });
  }

  // ===== AUTO TEXT HIGHLIGHT — headings get gradient on scroll =====
  function initHeadingGlow() {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('heading-glow-active');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('h1,h2,h3').forEach(function (h) {
      if (!h.closest('nav') && !h.closest('footer')) obs.observe(h);
    });
  }

  // ===== STAGGER CHILDREN — auto stagger list items =====
  function initStaggerChildren() {
    document.querySelectorAll('.pricing-features, .terms-list, .strengths-list, .suggestions-list, .issues-list').forEach(function (list) {
      Array.from(list.children).forEach(function (child, i) {
        child.style.opacity = '0';
        child.style.transform = 'translateX(-16px)';
        child.style.transition = 'opacity 0.4s ease ' + (i * 0.07) + 's, transform 0.4s ease ' + (i * 0.07) + 's';
      });
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            Array.from(entry.target.children).forEach(function (child) {
              child.style.opacity = '1';
              child.style.transform = 'translateX(0)';
            });
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2 });
      obs.observe(list);
    });
  }

  // ===== SCROLL PROGRESS BAR =====
  function initScrollProgress() {
    var bar = document.createElement('div');
    bar.id = 'scrollProgressBar';
    document.body.appendChild(bar);
    window.addEventListener('scroll', function () {
      var pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      bar.style.width = Math.min(pct, 100) + '%';
    }, { passive: true });
  }

  // ===== INIT ALL =====
  function init() {
    initPageTransition();
    initScrollProgress();
    initTypewriter();
    initShimmerText();
    initScrollReveal();
    initSkillBars();
    initCounters();
    initTilt();
    initMagnetic();
    initRipple();
    initNavScroll();
    initSmoothScroll();
    initCursorGlow();
    initHeadingGlow();
    initStaggerChildren();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
