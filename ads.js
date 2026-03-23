/**
 * ads.js — Ad Display Engine
 * Load và hiển thị quảng cáo từ Ad Marketplace API
 * Fallback: hiển thị quảng cáo mẫu khi không có ad active
 */
(function() {
  'use strict';

  const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3001' : '';

  let sessionId = sessionStorage.getItem('ad_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('ad_session_id', sessionId);
  }

  let observer = null;
  const trackedImpressions = new Set();

  function getObserver() {
    if (observer) return observer;
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const adId = entry.target.dataset.adId;
          if (adId && !trackedImpressions.has(adId)) {
            trackedImpressions.add(adId);
            trackImpression(adId);
          }
        }
      });
    }, { threshold: 0.5 });
    return observer;
  }

  async function trackImpression(adId) {
    try {
      await fetch(`${API}/api/ads/track/impression/${adId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
    } catch(e) {}
  }

  async function trackClick(adId, productLink, referrerPage) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 500);
      await fetch(`${API}/api/ads/track/click/${adId}`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referrer_page: referrerPage || location.pathname })
      });
      clearTimeout(timeout);
    } catch(e) {}
    window.open(productLink, '_blank', 'noopener,noreferrer');
  }

  function platformBadge(platform) {
    const map = { shopee: '🛒 Shopee', tiktok: '🎵 TikTok', affiliate: '🔗 Affiliate' };
    return map[platform] || platform;
  }

  // ===== FALLBACK ADS (hiển thị khi không có ad thật) =====
  const FALLBACK_ADS = [
    {
      id: 'f1', product_name: 'Áo Thun Nam Basic Unisex',
      description: 'Chất liệu cotton 100%, thoáng mát, nhiều màu sắc. Phù hợp mọi dịp.',
      price: 89000, platform: 'shopee',
      link: 'https://shopee.vn',
      image_url: 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lzl5ywxbqkxj8e'
    },
    {
      id: 'f2', product_name: 'Tai Nghe Bluetooth TWS Pro',
      description: 'Âm thanh Hi-Fi, chống ồn ANC, pin 30h, kết nối ổn định. Giá tốt nhất.',
      price: 299000, platform: 'shopee',
      link: 'https://shopee.vn',
      image_url: ''
    },
    {
      id: 'f3', product_name: 'Đèn LED Gaming RGB',
      description: 'Đèn bàn gaming 16 triệu màu, điều chỉnh độ sáng, cổng USB-C.',
      price: 199000, platform: 'tiktok',
      link: 'https://www.tiktok.com/shop',
      image_url: ''
    },
    {
      id: 'f4', product_name: 'Khóa Học Lập Trình Web',
      description: 'HTML, CSS, JavaScript, React từ cơ bản đến nâng cao. 200+ bài học.',
      price: 499000, platform: 'affiliate',
      link: 'https://ads.html',
      image_url: ''
    }
  ];

  function renderTopVip(ad, isFallback) {
    const safeLink = (ad.link || '#').replace(/'/g, "\\'");
    const clickFn = isFallback
      ? `window.open('${safeLink}','_blank','noopener,noreferrer')`
      : `window._adClick(${ad.id},'${safeLink}')`;
    return `<div class="ad-card vip" data-ad-id="${ad.id}" style="cursor:pointer" onclick="${clickFn}">
      <div class="ad-vip-badge">⭐ VIP</div>
      ${ad.image_url ? `<img src="${ad.image_url}" alt="${ad.product_name}" class="ad-img" onerror="this.style.display='none'">` : ''}
      <div class="ad-body">
        <div class="ad-platform">${platformBadge(ad.platform)}</div>
        <div class="ad-name">${ad.product_name}</div>
        ${ad.description ? `<div class="ad-desc">${ad.description}</div>` : ''}
        ${ad.price ? `<div class="ad-price">${Number(ad.price).toLocaleString('vi-VN')}₫</div>` : ''}
        <button class="ad-cta">Xem ngay →</button>
      </div>
    </div>`;
  }

  function renderBanner(ad, isFallback) {
    const safeLink = (ad.link || '#').replace(/'/g, "\\'");
    const clickFn = isFallback
      ? `window.open('${safeLink}','_blank','noopener,noreferrer')`
      : `window._adClick(${ad.id},'${safeLink}')`;
    return `<div class="ad-banner" data-ad-id="${ad.id}" style="cursor:pointer" onclick="${clickFn}">
      ${ad.image_url ? `<img src="${ad.image_url}" alt="${ad.product_name}" class="ad-banner-img" onerror="this.style.display='none'">` : `<div class="ad-banner-emoji">${ad.platform === 'shopee' ? '🛒' : ad.platform === 'tiktok' ? '🎵' : '🔗'}</div>`}
      <div class="ad-banner-body">
        <div class="ad-platform">${platformBadge(ad.platform)}</div>
        <div class="ad-name">${ad.product_name}</div>
        ${ad.price ? `<div class="ad-price">${Number(ad.price).toLocaleString('vi-VN')}₫</div>` : ''}
      </div>
      <button class="ad-cta-sm">Mua ngay</button>
    </div>`;
  }

  function renderCard(ad, isFallback) {
    const safeLink = (ad.link || '#').replace(/'/g, "\\'");
    const clickFn = isFallback
      ? `window.open('${safeLink}','_blank','noopener,noreferrer')`
      : `window._adClick(${ad.id},'${safeLink}')`;
    return `<div class="ad-card" data-ad-id="${ad.id}" style="cursor:pointer" onclick="${clickFn}">
      ${ad.image_url ? `<img src="${ad.image_url}" alt="${ad.product_name}" class="ad-img" onerror="this.style.display='none'">` : `<div class="ad-card-emoji">${ad.platform === 'shopee' ? '🛒' : ad.platform === 'tiktok' ? '🎵' : '🔗'}</div>`}
      <div class="ad-body">
        <div class="ad-platform">${platformBadge(ad.platform)}</div>
        <div class="ad-name">${ad.product_name}</div>
        ${ad.description ? `<div class="ad-desc">${ad.description}</div>` : ''}
        ${ad.price ? `<div class="ad-price">${Number(ad.price).toLocaleString('vi-VN')}₫</div>` : ''}
        <button class="ad-cta">Xem ngay →</button>
      </div>
    </div>`;
  }

  window._adClick = function(adId, link) {
    trackClick(adId, link, location.pathname);
  };

  function getFallbackForSlot(slot) {
    // Chọn fallback ad phù hợp với slot
    const idx = { top_vip: 0, pinned_post: 1, banner_header: 2, banner_sidebar: 3, banner_mid_article: 1 };
    const i = idx[slot] !== undefined ? idx[slot] : 0;
    return [FALLBACK_ADS[i % FALLBACK_ADS.length]];
  }

  async function loadAdSlot(slot, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let ads = [];
    let isFallback = false;

    try {
      const r = await fetch(`${API}/api/ads/slots/${slot}`);
      if (r.ok) {
        ads = await r.json();
      }
    } catch(e) {}

    // Nếu không có ad thật → dùng fallback
    if (!ads || !ads.length) {
      ads = getFallbackForSlot(slot);
      isFallback = true;
    }

    const obs = getObserver();
    let html = '';

    if (slot === 'top_vip') {
      html = `<div class="ad-slot-top-vip">${ads.map(a => renderTopVip(a, isFallback)).join('')}</div>`;
    } else if (slot === 'pinned_post') {
      html = `<div class="ad-slot-pinned">${ads.map(a => renderCard(a, isFallback)).join('')}</div>`;
    } else {
      html = `<div class="ad-slot-banner">${ads.map(a => renderBanner(a, isFallback)).join('')}</div>`;
    }

    container.innerHTML = html;
    if (!isFallback) {
      container.querySelectorAll('[data-ad-id]').forEach(el => obs.observe(el));
    }
  }

  window.loadAdSlot = loadAdSlot;

  // Auto-load khi DOM ready nếu có data-ad-slot attributes
  function autoLoad() {
    document.querySelectorAll('[data-ad-slot]').forEach(el => {
      const slot = el.dataset.adSlot;
      if (slot && el.id) loadAdSlot(slot, el.id);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoLoad);
  } else {
    setTimeout(autoLoad, 100);
  }
})();
