// Weather + Time Widget
(function() {
'use strict';

const css = `
#wx-widget {
  display:inline-flex;align-items:center;gap:.75rem;
  background:rgba(255,255,255,.1);backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,.18);border-radius:50px;
  padding:.5rem 1.25rem;font-size:.82rem;color:rgba(255,255,255,.9);
  margin-bottom:1.25rem;cursor:default;transition:all .3s;
  flex-wrap:wrap;justify-content:center;
}
#wx-widget:hover{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);}
.wx-sep{color:rgba(255,255,255,.3);font-size:.7rem;}
.wx-time{font-weight:800;font-size:.9rem;letter-spacing:.03em;}
.wx-date{color:rgba(255,255,255,.7);}
.wx-temp{font-weight:800;color:#fbbf24;}
.wx-city{color:rgba(255,255,255,.65);font-size:.75rem;}
.wx-icon{font-size:1.1rem;}
@media(max-width:480px){#wx-widget{font-size:.75rem;padding:.4rem 1rem;gap:.5rem;}}
`;

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

const el = document.createElement('div');
el.id = 'wx-widget';
el.innerHTML = `
  <span class="wx-icon">🕐</span>
  <span class="wx-time" id="wx-time">--:--</span>
  <span class="wx-sep">|</span>
  <span class="wx-date" id="wx-date">--/--/----</span>
  <span class="wx-sep">|</span>
  <span class="wx-icon" id="wx-wicon">🌤️</span>
  <span class="wx-temp" id="wx-temp">--°C</span>
  <span class="wx-city" id="wx-city">TP.HCM</span>
`;

// Inject into hero
function inject() {
  // Try specific inject point first
  const injectPoint = document.getElementById('wx-inject-hero');
  if (injectPoint) { injectPoint.appendChild(el); return; }
  const hero = document.querySelector('.hero-content') || document.querySelector('.hero-buttons') || document.querySelector('.pay-hero') || document.querySelector('.ord-hero');
  if (!hero) return;
  const ref = hero.querySelector('h1') || hero.firstElementChild;
  if (ref) hero.insertBefore(el, ref);
  else hero.prepend(el);
}

// Clock
const DAYS = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
function tick() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  const d = now.getDate(), mo = now.getMonth()+1, y = now.getFullYear();
  const day = DAYS[now.getDay()];
  const timeEl = document.getElementById('wx-time');
  const dateEl = document.getElementById('wx-date');
  if (timeEl) timeEl.textContent = `${h}:${m}:${s}`;
  if (dateEl) dateEl.textContent = `${day}, ${d}/${mo}/${y}`;
}
setInterval(tick, 1000);
tick();

// Weather via Open-Meteo (free, no key)
async function fetchWeather() {
  try {
    // TP.HCM coords
    const lat = 10.8231, lon = 106.6297;
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&timezone=Asia%2FHo_Chi_Minh`);
    const d = await r.json();
    const cw = d.current_weather;
    if (!cw) return;
    const temp = Math.round(cw.temperature);
    const wcode = cw.weathercode;
    const icon = weatherIcon(wcode, cw.is_day);
    const desc = weatherDesc(wcode);
    const tempEl = document.getElementById('wx-temp');
    const wiconEl = document.getElementById('wx-wicon');
    const cityEl = document.getElementById('wx-city');
    if (tempEl) tempEl.textContent = `${temp}°C`;
    if (wiconEl) wiconEl.textContent = icon;
    if (cityEl) cityEl.textContent = `TP.HCM · ${desc}`;
  } catch(e) {}
}

function weatherIcon(code, isDay) {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 2) return isDay ? '⛅' : '🌤️';
  if (code <= 3) return '☁️';
  if (code <= 49) return '🌫️';
  if (code <= 59) return '🌦️';
  if (code <= 69) return '🌧️';
  if (code <= 79) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 84) return '🌨️';
  if (code <= 99) return '⛈️';
  return '🌤️';
}

function weatherDesc(code) {
  if (code === 0) return 'Trời quang';
  if (code <= 2) return 'Ít mây';
  if (code <= 3) return 'Nhiều mây';
  if (code <= 49) return 'Sương mù';
  if (code <= 59) return 'Mưa phùn';
  if (code <= 69) return 'Mưa';
  if (code <= 79) return 'Tuyết';
  if (code <= 82) return 'Mưa rào';
  if (code <= 99) return 'Giông bão';
  return 'Không rõ';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { inject(); fetchWeather(); });
} else {
  inject(); fetchWeather();
}
// Refresh weather every 10 min
setInterval(fetchWeather, 600000);
})();
