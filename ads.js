/**
 * ads.js — Ad Display Engine
 * Load và hiển thị quảng cáo từ Ad Marketplace API
 */
(function() {
  'use strict';

  const API = window.API_BASE || '';

  // Session ID duy nhất per tab, dùng cho impression dedup
  let sessionId = sessionStorage.getItem('ad_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('ad_session_id', sessionId);
  }

  // Intersection Observer cho impression tracking
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

  function renderTopVip(ad) {
    return `<div class="ad-card vip" data-ad-id="${ad.id}">
      <div class="ad-vip-badge">⭐ VIP</div>
      ${ad.image_url ? `<img src="${ad.image_url}" alt="${ad.product_name}" class="ad-img" onerror="this.style.display='none'">` : ''}
      <div class="ad-body">
        <div class="ad-platform">${platformBadge(ad.platform)}</div>
        <div class="ad-name">${ad.product_name}</div>
        ${ad.description ? `<div class="ad-desc">${ad.description}</div>` : ''}
        ${ad.price ? `<div class="ad-price">${Number(ad.price).toLocaleString('vi-VN')}₫</div>` : ''}
        <button class="ad-cta" onclick="window._adClick(${ad.id},'${ad.link.replace(/'/g,"\\'")}')">Xem ngay →</button>
      </div>
    </div>`;
  }

  function renderBanner(ad) {
    return `<div class="ad-banner" data-ad-id="${ad.id}">
      ${ad.image_url ? `<img src="${ad.image_url}" alt="${ad.product_name}" class="ad-banner-img" onerror="this.style.display='none'">` : ''}
      <div class="ad-banner-body">
        <div class="ad-platform">${platformBadge(ad.platform)}</div>
        <div class="ad-name">${ad.product_name}</div>
        ${ad.price ? `<div class="ad-price">${Number(ad.price).toLocaleString('vi-VN')}₫</div>` : ''}
      </div>
      <button class="ad-cta-sm" onclick="window._adClick(${ad.id},'${ad.link.replace(/'/g,"\\'")}')">Mua ngay</button>
    </div>`;
  }

  function renderCard(ad) {
    return `<div class="ad-card" data-ad-id="${ad.id}">
      ${ad.image_url ? `<img src="${ad.image_url}" alt="${ad.product_name}" class="ad-img" onerror="this.style.display='none'">` : ''}
      <div class="ad-body">
        <div class="ad-platform">${platformBadge(ad.platform)}</div>
        <div class="ad-name">${ad.product_name}</div>
        ${ad.description ? `<div class="ad-desc">${ad.description}</div>` : ''}
        ${ad.price ? `<div class="ad-price">${Number(ad.price).toLocaleString('vi-VN')}₫</div>` : ''}
        <button class="ad-cta" onclick="window._adClick(${ad.id},'${ad.link.replace(/'/g,"\\'")}')">Xem ngay →</button>
      </div>
    </div>`;
  }

  // Global click handler
  window._adClick = function(adId, link) {
    trackClick(adId, link, location.pathname);
  };

  /**
   * loadAdSlot(slot, containerId)
   * Gọi API lấy ads theo slot và render vào container
   */
  async function loadAdSlot(slot, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const r = await fetch(`${API}/api/ads/slots/${slot}`);
      if (!r.ok) return;
      const ads = await r.json();
      if (!ads || !ads.length) return;

      const obs = getObserver();
      let html = '';

      if (slot === 'top_vip') {
        html = `<div class="ad-slot-top-vip">${ads.map(renderTopVip).join('')}</div>`;
      } else if (slot === 'pinned_post') {
        html = `<div class="ad-slot-pinned">${ads.map(renderCard).join('')}</div>`;
      } else {
        // banner_header, banner_sidebar, banner_mid_article
        html = `<div class="ad-slot-banner">${ads.map(renderBanner).join('')}</div>`;
      }

      container.innerHTML = html;
      container.querySelectorAll('[data-ad-id]').forEach(el => obs.observe(el));
    } catch(e) {}
  }

  // Export
  window.loadAdSlot = loadAdSlot;
})();
