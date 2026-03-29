/**
 * Hand Gesture Controller - Clitus PC
 * Dùng MediaPipe Hands để điều khiển web bằng cử chỉ tay
 * Tự động inject vào mọi trang qua nav.js
 */
(function() {
'use strict';

// ===== CONFIG =====
const CFG = {
  enabled: false,
  showCamera: true,
  sensitivity: 1.2,
  scrollSpeed: 18,
  clickCooldown: 800,
  pinchThreshold: 0.07,
  gestureHoldMs: 400,
};

let hands = null, camera = null;
let videoEl = null, canvasEl = null, ctx = null;
let cursorEl = null, panelEl = null, btnEl = null;
let lastClick = 0, lastGesture = '', gestureStart = 0;
let prevIndexY = null, smoothX = 0, smoothY = 0;
let isInit = false;

// ===== UI INJECT =====
function injectUI() {
  if (document.getElementById('hg-btn')) return;

  // Toggle button
  btnEl = document.createElement('button');
  btnEl.id = 'hg-btn';
  btnEl.title = 'Điều khiển bằng tay';
  btnEl.innerHTML = '🖐';
  btnEl.style.cssText = `
    position:fixed;bottom:160px;left:20px;z-index:99998;
    width:48px;height:48px;border-radius:50%;border:none;
    background:linear-gradient(135deg,#667eea,#764ba2);
    color:#fff;font-size:1.3rem;cursor:pointer;
    box-shadow:0 4px 16px rgba(102,126,234,.4);
    transition:transform .2s,box-shadow .2s;
    display:flex;align-items:center;justify-content:center;
  `;
  btnEl.onclick = toggleGesture;
  document.body.appendChild(btnEl);

  // Virtual cursor
  cursorEl = document.createElement('div');
  cursorEl.id = 'hg-cursor';
  cursorEl.style.cssText = `
    position:fixed;z-index:99999;pointer-events:none;
    width:24px;height:24px;border-radius:50%;
    background:rgba(102,126,234,.7);border:2px solid #fff;
    transform:translate(-50%,-50%);
    transition:width .1s,height .1s,background .1s;
    display:none;box-shadow:0 0 12px rgba(102,126,234,.6);
  `;
  document.body.appendChild(cursorEl);

  // Info panel
  panelEl = document.createElement('div');
  panelEl.id = 'hg-panel';
  panelEl.style.cssText = `
    position:fixed;bottom:220px;left:12px;z-index:99998;
    background:rgba(10,10,26,.92);border:1px solid rgba(102,126,234,.3);
    border-radius:14px;padding:.75rem 1rem;color:#e0e0ff;
    font-size:.78rem;font-family:'Segoe UI',sans-serif;
    min-width:180px;display:none;backdrop-filter:blur(8px);
    box-shadow:0 8px 32px rgba(0,0,0,.4);
  `;
  panelEl.innerHTML = `
    <div style="font-weight:800;margin-bottom:.5rem;color:#a78bfa;">🖐 Hand Gesture</div>
    <div id="hg-status" style="color:#4ade80;margin-bottom:.5rem;">● Đang khởi động...</div>
    <div id="hg-gesture" style="font-size:1.1rem;margin-bottom:.5rem;">—</div>
    <div style="color:rgba(255,255,255,.4);font-size:.7rem;line-height:1.6;">
      ✊ Nắm → Scroll xuống<br>
      🖐 Mở → Scroll lên<br>
      ☝️ 1 ngón → Click<br>
      ✌️ 2 ngón → Quay lại<br>
      🤏 Pinch → Zoom<br>
      🤙 5 ngón → Tắt
    </div>
  `;
  document.body.appendChild(panelEl);

  // Camera preview
  videoEl = document.createElement('video');
  videoEl.id = 'hg-video';
  videoEl.style.cssText = 'position:fixed;bottom:12px;left:12px;width:160px;height:120px;border-radius:12px;z-index:99997;object-fit:cover;display:none;border:2px solid rgba(102,126,234,.4);opacity:.85;';
  videoEl.autoplay = true;
  videoEl.muted = true;
  videoEl.playsInline = true;
  document.body.appendChild(videoEl);

  canvasEl = document.createElement('canvas');
  canvasEl.id = 'hg-canvas';
  canvasEl.style.cssText = 'position:fixed;bottom:12px;left:12px;width:160px;height:120px;border-radius:12px;z-index:99997;display:none;pointer-events:none;';
  document.body.appendChild(canvasEl);

  // CSS animation
  const style = document.createElement('style');
  style.textContent = `
    #hg-btn:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(102,126,234,.6)!important;}
    #hg-btn.active{animation:hgPulse 2s ease-in-out infinite;background:linear-gradient(135deg,#22c55e,#16a34a)!important;}
    @keyframes hgPulse{0%,100%{box-shadow:0 4px 16px rgba(34,197,94,.4)}50%{box-shadow:0 4px 28px rgba(34,197,94,.7)}}
    #hg-cursor.clicking{width:36px!important;height:36px!important;background:rgba(240,147,251,.8)!important;}
    #hg-cursor.scrolling{background:rgba(34,197,94,.7)!important;}
  `;
  document.head.appendChild(style);
}

// ===== LOAD MEDIAPIPE =====
async function loadMediaPipe() {
  if (window.Hands) return;
  await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
  await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
  await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.crossOrigin = 'anonymous';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ===== INIT =====
async function initGesture() {
  if (isInit) return;
  setStatus('Đang tải MediaPipe...', '#f59e0b');

  try {
    await loadMediaPipe();
    setStatus('Đang mở camera...', '#f59e0b');

    hands = new window.Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.6
    });
    hands.onResults(onResults);

    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } });
    videoEl.srcObject = stream;
    await videoEl.play();

    canvasEl.width = 320; canvasEl.height = 240;
    ctx = canvasEl.getContext('2d');

    camera = new window.Camera(videoEl, {
      onFrame: async () => { await hands.send({ image: videoEl }); },
      width: 320, height: 240
    });
    camera.start();

    videoEl.style.display = 'block';
    canvasEl.style.display = 'block';
    cursorEl.style.display = 'block';
    isInit = true;
    setStatus('● Đang hoạt động', '#4ade80');
  } catch (e) {
    setStatus('❌ ' + (e.message || 'Lỗi camera'), '#ef4444');
    console.error('[HandGesture]', e);
  }
}

function stopGesture() {
  if (camera) { try { camera.stop(); } catch(e){} camera = null; }
  if (videoEl?.srcObject) {
    videoEl.srcObject.getTracks().forEach(t => t.stop());
    videoEl.srcObject = null;
  }
  videoEl.style.display = 'none';
  canvasEl.style.display = 'none';
  cursorEl.style.display = 'none';
  isInit = false;
  setStatus('● Đã tắt', '#ef4444');
}

// ===== TOGGLE =====
async function toggleGesture() {
  CFG.enabled = !CFG.enabled;
  panelEl.style.display = CFG.enabled ? 'block' : 'none';
  btnEl.classList.toggle('active', CFG.enabled);

  if (CFG.enabled) {
    await initGesture();
  } else {
    stopGesture();
  }
}

// ===== GESTURE DETECTION =====
function onResults(results) {
  if (!CFG.enabled) return;

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.save();
  ctx.scale(-1, 1);
  ctx.translate(-canvasEl.width, 0);
  ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

  if (!results.multiHandLandmarks?.length) {
    prevIndexY = null;
    updateGestureDisplay('—');
    return;
  }

  const lm = results.multiHandLandmarks[0];

  // Draw hand skeleton
  if (window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
    window.drawConnectors(ctx, lm, window.HAND_CONNECTIONS, { color: 'rgba(102,126,234,.6)', lineWidth: 2 });
    window.drawLandmarks(ctx, lm, { color: '#f093fb', lineWidth: 1, radius: 3 });
  }
  ctx.restore();

  // Index fingertip position (landmark 8) — mirrored
  const ix = (1 - lm[8].x) * window.innerWidth;
  const iy = lm[8].y * window.innerHeight;

  // Smooth cursor
  smoothX = smoothX * 0.6 + ix * 0.4;
  smoothY = smoothY * 0.6 + iy * 0.4;
  cursorEl.style.left = smoothX + 'px';
  cursorEl.style.top = smoothY + 'px';

  const gesture = detectGesture(lm);
  handleGesture(gesture, lm, smoothX, smoothY);
}

function detectGesture(lm) {
  const fingers = getFingerStates(lm);
  const extended = fingers.filter(Boolean).length;

  // Pinch: thumb + index close
  const thumbTip = lm[4], indexTip = lm[8];
  const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
  if (pinchDist < CFG.pinchThreshold) return 'pinch';

  if (extended === 0) return 'fist';
  if (extended === 5) return 'open';
  if (extended === 1 && fingers[1]) return 'point';
  if (extended === 2 && fingers[1] && fingers[2]) return 'peace';
  if (extended === 3 && fingers[1] && fingers[2] && fingers[3]) return 'three';
  return 'other';
}

function getFingerStates(lm) {
  // Returns [thumb, index, middle, ring, pinky] extended
  return [
    lm[4].x < lm[3].x, // thumb (left hand heuristic)
    lm[8].y < lm[6].y,
    lm[12].y < lm[10].y,
    lm[16].y < lm[14].y,
    lm[20].y < lm[18].y,
  ];
}

function handleGesture(gesture, lm, cx, cy) {
  const now = Date.now();

  // Track gesture hold time
  if (gesture !== lastGesture) {
    lastGesture = gesture;
    gestureStart = now;
  }
  const held = now - gestureStart;

  updateGestureDisplay(gestureEmoji(gesture));

  switch (gesture) {
    case 'fist':
      // Scroll down
      cursorEl.classList.add('scrolling');
      cursorEl.classList.remove('clicking');
      window.scrollBy({ top: CFG.scrollSpeed * CFG.sensitivity, behavior: 'auto' });
      break;

    case 'open':
      // Scroll up
      cursorEl.classList.add('scrolling');
      cursorEl.classList.remove('clicking');
      window.scrollBy({ top: -CFG.scrollSpeed * CFG.sensitivity, behavior: 'auto' });
      break;

    case 'point':
      // Move cursor + click on hold
      cursorEl.classList.remove('scrolling', 'clicking');
      if (held > CFG.gestureHoldMs && now - lastClick > CFG.clickCooldown) {
        doClick(cx, cy);
        lastClick = now;
      }
      break;

    case 'peace':
      // Go back
      cursorEl.classList.remove('scrolling', 'clicking');
      if (held > 800 && now - lastClick > 1500) {
        history.back();
        lastClick = now;
        showToastGesture('◀ Quay lại');
      }
      break;

    case 'pinch':
      // Zoom
      cursorEl.classList.add('clicking');
      if (held > 300 && now - lastClick > 1000) {
        const currentZoom = parseFloat(document.body.style.zoom || 1);
        const indexY = lm[8].y, thumbY = lm[4].y;
        const delta = prevIndexY !== null ? (prevIndexY - indexY) * 2 : 0;
        prevIndexY = indexY;
        const newZoom = Math.min(2, Math.max(0.5, currentZoom + delta * 0.3));
        document.body.style.zoom = newZoom;
      }
      break;

    case 'open':
      if (held > 1500) {
        // 5 fingers held = toggle off
        toggleGesture();
      }
      break;

    default:
      cursorEl.classList.remove('scrolling', 'clicking');
      prevIndexY = null;
  }
}

function doClick(x, y) {
  cursorEl.classList.add('clicking');
  setTimeout(() => cursorEl.classList.remove('clicking'), 300);

  const el = document.elementFromPoint(x, y);
  if (el && el !== cursorEl && el !== canvasEl) {
    el.click();
    showToastGesture('👆 Click: ' + (el.tagName.toLowerCase()));
  }
}

function gestureEmoji(g) {
  const map = { fist:'✊ Scroll ↓', open:'🖐 Scroll ↑', point:'☝️ Click', peace:'✌️ Back', pinch:'🤏 Zoom', three:'🤟', other:'—' };
  return map[g] || '—';
}

function updateGestureDisplay(text) {
  const el = document.getElementById('hg-gesture');
  if (el) el.textContent = text;
}

function setStatus(text, color) {
  const el = document.getElementById('hg-status');
  if (el) { el.textContent = text; el.style.color = color; }
}

function showToastGesture(msg) {
  if (typeof showToast === 'function') { showToast(msg, 'info', 1500); return; }
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(102,126,234,.9);color:#fff;padding:.5rem 1.25rem;border-radius:50px;font-size:.85rem;z-index:999999;pointer-events:none;animation:fadeIn .3s ease;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1500);
}

// ===== INIT ON DOM READY =====
function init() {
  injectUI();
  // Keyboard shortcut: Alt+H
  document.addEventListener('keydown', e => {
    if (e.altKey && e.key === 'h') toggleGesture();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
