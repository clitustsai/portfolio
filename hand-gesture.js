/**
 * Hand Gesture Controller v2 - Clitus PC
 * Dùng MediaPipe Tasks Vision (API mới, ổn định)
 */
(function () {
'use strict';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const TASKS_VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.js';

let detector = null, videoEl = null, canvasEl = null, ctx2d = null;
let cursorEl = null, panelEl = null, btnEl = null;
let rafId = null, running = false;
let lastClick = 0, lastGesture = '', gestureStart = 0;
let smoothX = 0, smoothY = 0;

// ===== INJECT UI =====
function injectUI() {
  if (document.getElementById('hg-btn')) return;

  const style = document.createElement('style');
  style.textContent = `
    #hg-btn{position:fixed;bottom:160px;left:20px;z-index:99998;width:48px;height:48px;border-radius:50%;border:none;
      background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:1.3rem;cursor:pointer;
      box-shadow:0 4px 16px rgba(102,126,234,.5);transition:transform .2s;display:flex;align-items:center;justify-content:center;}
    #hg-btn:hover{transform:scale(1.1);}
    #hg-btn.hg-on{background:linear-gradient(135deg,#22c55e,#16a34a)!important;animation:hgPulse 2s infinite;}
    @keyframes hgPulse{0%,100%{box-shadow:0 4px 16px rgba(34,197,94,.4)}50%{box-shadow:0 4px 28px rgba(34,197,94,.8)}}
    #hg-cursor{position:fixed;z-index:99999;pointer-events:none;width:22px;height:22px;border-radius:50%;
      background:rgba(102,126,234,.75);border:2px solid #fff;transform:translate(-50%,-50%);
      box-shadow:0 0 12px rgba(102,126,234,.6);display:none;transition:background .15s,width .1s,height .1s;}
    #hg-cursor.hg-click{width:34px!important;height:34px!important;background:rgba(240,147,251,.85)!important;}
    #hg-cursor.hg-scroll{background:rgba(34,197,94,.75)!important;}
    #hg-panel{position:fixed;bottom:220px;left:12px;z-index:99998;background:rgba(10,10,26,.93);
      border:1px solid rgba(102,126,234,.3);border-radius:14px;padding:.8rem 1rem;color:#e0e0ff;
      font-size:.78rem;font-family:'Segoe UI',sans-serif;min-width:185px;display:none;
      backdrop-filter:blur(10px);box-shadow:0 8px 32px rgba(0,0,0,.5);}
    #hg-video{position:fixed;bottom:12px;left:12px;width:160px;height:120px;border-radius:12px;
      z-index:99996;object-fit:cover;display:none;border:2px solid rgba(102,126,234,.4);
      transform:scaleX(-1);opacity:.85;}
    #hg-canvas{position:fixed;bottom:12px;left:12px;width:160px;height:120px;border-radius:12px;
      z-index:99997;display:none;pointer-events:none;}
  `;
  document.head.appendChild(style);

  btnEl = document.createElement('button');
  btnEl.id = 'hg-btn';
  btnEl.title = 'Hand Gesture (Alt+H)';
  btnEl.innerHTML = '🖐';
  btnEl.onclick = toggle;
  document.body.appendChild(btnEl);

  cursorEl = document.createElement('div');
  cursorEl.id = 'hg-cursor';
  document.body.appendChild(cursorEl);

  panelEl = document.createElement('div');
  panelEl.id = 'hg-panel';
  panelEl.innerHTML = `
    <div style="font-weight:800;margin-bottom:.5rem;color:#a78bfa;">🖐 Hand Gesture</div>
    <div id="hg-status" style="color:#f59e0b;margin-bottom:.4rem;">Đang tải...</div>
    <div id="hg-gest" style="font-size:1rem;margin-bottom:.5rem;min-height:1.2em;">—</div>
    <div style="color:rgba(255,255,255,.4);font-size:.7rem;line-height:1.7;">
      ✊ Nắm → Scroll ↓<br>🖐 Mở → Scroll ↑<br>☝️ 1 ngón (giữ) → Click<br>✌️ 2 ngón (giữ) → Back<br>🤏 Pinch → Zoom<br><br>
      <span style="color:rgba(255,255,255,.25);">Alt+H để bật/tắt</span>
    </div>`;
  document.body.appendChild(panelEl);

  videoEl = document.createElement('video');
  videoEl.id = 'hg-video';
  videoEl.autoplay = true; videoEl.muted = true; videoEl.playsInline = true;
  document.body.appendChild(videoEl);

  canvasEl = document.createElement('canvas');
  canvasEl.id = 'hg-canvas';
  canvasEl.width = 320; canvasEl.height = 240;
  ctx2d = canvasEl.getContext('2d');
  document.body.appendChild(canvasEl);

  document.addEventListener('keydown', e => { if (e.altKey && e.key === 'h') toggle(); });
}

// ===== LOAD SCRIPT =====
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

// ===== INIT =====
async function init() {
  setStatus('Đang tải MediaPipe...', '#f59e0b');
  try {
    await loadScript(TASKS_VISION_URL);

    const { HandLandmarker, FilesetResolver } = window.mpTasksVision || window;
    if (!HandLandmarker) throw new Error('MediaPipe Tasks Vision không load được');

    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_CDN);
    detector = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    setStatus('Đang mở camera...', '#f59e0b');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: 'user' }
    });
    videoEl.srcObject = stream;
    await new Promise(r => { videoEl.onloadeddata = r; });
    await videoEl.play();

    videoEl.style.display = 'block';
    canvasEl.style.display = 'block';
    cursorEl.style.display = 'block';
    setStatus('● Đang hoạt động', '#4ade80');
    running = true;
    detectLoop();
  } catch (e) {
    setStatus('❌ ' + e.message, '#ef4444');
    console.error('[HandGesture]', e);
  }
}

// ===== DETECT LOOP =====
function detectLoop() {
  if (!running || !detector) return;
  const now = performance.now();
  try {
    const results = detector.detectForVideo(videoEl, now);
    processResults(results);
  } catch (e) { /* skip frame */ }
  rafId = requestAnimationFrame(detectLoop);
}

// ===== PROCESS RESULTS =====
function processResults(results) {
  ctx2d.clearRect(0, 0, 320, 240);
  ctx2d.save();
  ctx2d.scale(-1, 1);
  ctx2d.translate(-320, 0);
  ctx2d.drawImage(videoEl, 0, 0, 320, 240);
  ctx2d.restore();

  if (!results.landmarks?.length) {
    setGest('—');
    cursorEl.classList.remove('hg-click', 'hg-scroll');
    return;
  }

  const lm = results.landmarks[0];
  drawSkeleton(lm);

  // Index fingertip (8) — mirrored X
  const tx = (1 - lm[8].x) * window.innerWidth;
  const ty = lm[8].y * window.innerHeight;
  smoothX = smoothX * 0.55 + tx * 0.45;
  smoothY = smoothY * 0.55 + ty * 0.45;
  cursorEl.style.left = smoothX + 'px';
  cursorEl.style.top = smoothY + 'px';

  const g = classify(lm);
  const now = Date.now();
  if (g !== lastGesture) { lastGesture = g; gestureStart = now; }
  const held = now - gestureStart;

  setGest(gestLabel(g));
  applyGesture(g, held, now, lm);
}

// ===== CLASSIFY GESTURE =====
function classify(lm) {
  // Finger extended: tip.y < pip.y (except thumb)
  const ext = [
    lm[4].x < lm[3].x,   // thumb
    lm[8].y < lm[6].y,   // index
    lm[12].y < lm[10].y, // middle
    lm[16].y < lm[14].y, // ring
    lm[20].y < lm[18].y, // pinky
  ];
  const count = ext.filter(Boolean).length;

  // Pinch: thumb tip & index tip distance
  const pd = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
  if (pd < 0.07) return 'pinch';

  if (count === 0) return 'fist';
  if (count === 5) return 'open';
  if (count === 1 && ext[1]) return 'point';
  if (count === 2 && ext[1] && ext[2]) return 'peace';
  return 'other';
}

// ===== APPLY GESTURE =====
function applyGesture(g, held, now, lm) {
  cursorEl.classList.remove('hg-click', 'hg-scroll');

  switch (g) {
    case 'fist':
      cursorEl.classList.add('hg-scroll');
      window.scrollBy({ top: 20, behavior: 'auto' });
      break;

    case 'open':
      cursorEl.classList.add('hg-scroll');
      window.scrollBy({ top: -20, behavior: 'auto' });
      if (held > 2000 && now - lastClick > 2500) {
        toggle(); lastClick = now; // 5 fingers 2s = toggle off
      }
      break;

    case 'point':
      if (held > 500 && now - lastClick > 900) {
        doClick(smoothX, smoothY);
        lastClick = now;
      }
      break;

    case 'peace':
      if (held > 900 && now - lastClick > 1500) {
        history.back();
        lastClick = now;
        toast('◀ Quay lại');
      }
      break;

    case 'pinch': {
      cursorEl.classList.add('hg-click');
      // Pinch distance controls zoom
      const pd = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
      const zoom = Math.min(2, Math.max(0.6, pd * 8));
      if (held > 200) document.body.style.zoom = zoom.toFixed(2);
      break;
    }
  }
}

function doClick(x, y) {
  cursorEl.classList.add('hg-click');
  setTimeout(() => cursorEl.classList.remove('hg-click'), 350);
  const el = document.elementFromPoint(x, y);
  if (el && el.id !== 'hg-cursor' && el.id !== 'hg-canvas') {
    el.click();
    toast('👆 ' + (el.tagName + (el.id ? '#' + el.id : '')).toLowerCase());
  }
}

// ===== DRAW SKELETON =====
function drawSkeleton(lm) {
  const W = 320, H = 240;
  const CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];
  ctx2d.save();
  ctx2d.scale(-1, 1); ctx2d.translate(-W, 0);
  ctx2d.strokeStyle = 'rgba(102,126,234,.7)';
  ctx2d.lineWidth = 2;
  CONNECTIONS.forEach(([a, b]) => {
    ctx2d.beginPath();
    ctx2d.moveTo(lm[a].x * W, lm[a].y * H);
    ctx2d.lineTo(lm[b].x * W, lm[b].y * H);
    ctx2d.stroke();
  });
  lm.forEach(p => {
    ctx2d.beginPath();
    ctx2d.arc(p.x * W, p.y * H, 3, 0, Math.PI * 2);
    ctx2d.fillStyle = '#f093fb';
    ctx2d.fill();
  });
  ctx2d.restore();
}

// ===== STOP =====
function stop() {
  running = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (videoEl?.srcObject) {
    videoEl.srcObject.getTracks().forEach(t => t.stop());
    videoEl.srcObject = null;
  }
  videoEl.style.display = 'none';
  canvasEl.style.display = 'none';
  cursorEl.style.display = 'none';
  setStatus('● Đã tắt', '#ef4444');
}

// ===== TOGGLE =====
async function toggle() {
  const on = btnEl.classList.toggle('hg-on');
  panelEl.style.display = on ? 'block' : 'none';
  if (on) { await init(); }
  else { stop(); }
}

// ===== HELPERS =====
function setStatus(t, c) {
  const el = document.getElementById('hg-status');
  if (el) { el.textContent = t; el.style.color = c; }
}
function setGest(t) {
  const el = document.getElementById('hg-gest');
  if (el) el.textContent = t;
}
function gestLabel(g) {
  return { fist:'✊ Scroll ↓', open:'🖐 Scroll ↑', point:'☝️ Click', peace:'✌️ Back', pinch:'🤏 Zoom', other:'—' }[g] || '—';
}
function toast(msg) {
  if (typeof showToast === 'function') { showToast(msg, 'info', 1500); return; }
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(102,126,234,.9);color:#fff;padding:.45rem 1.2rem;border-radius:50px;font-size:.85rem;z-index:999999;pointer-events:none;';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1500);
}

// ===== BOOT =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectUI);
} else {
  injectUI();
}

})();
