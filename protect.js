// ========== PROTECTION: F12, DevTools, Right-click ==========
(function(){
'use strict';

// 1. Chặn chuột phải
document.addEventListener('contextmenu', function(e){
  e.preventDefault();
  return false;
}, true);

// 2. Chặn phím tắt DevTools
document.addEventListener('keydown', function(e){
  // F12
  if(e.key === 'F12' || e.keyCode === 123) { e.preventDefault(); return false; }
  // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
  if(e.ctrlKey && e.shiftKey && (e.key==='I'||e.key==='i'||e.key==='J'||e.key==='j'||e.key==='C'||e.key==='c')) { e.preventDefault(); return false; }
  // Ctrl+U (view source)
  if(e.ctrlKey && (e.key==='U'||e.key==='u')) { e.preventDefault(); return false; }
  // Ctrl+S (save page)
  if(e.ctrlKey && (e.key==='S'||e.key==='s')) { e.preventDefault(); return false; }
}, true);

// 3. Detect DevTools open (size trick)
var _dt = false;
var _threshold = 160;
function _checkDT(){
  var w = window.outerWidth - window.innerWidth;
  var h = window.outerHeight - window.innerHeight;
  if(w > _threshold || h > _threshold){
    if(!_dt){
      _dt = true;
      // Xóa nội dung nhạy cảm khi DevTools mở
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a1e;color:#667eea;font-family:sans-serif;font-size:1.2rem;flex-direction:column;gap:1rem"><div style="font-size:3rem">🔒</div><div>Trang này được bảo vệ</div><button onclick="location.reload()" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;padding:.75rem 2rem;border-radius:50px;cursor:pointer;font-size:1rem;margin-top:1rem">Tải lại trang</button></div>';
    }
  } else {
    _dt = false;
  }
}
setInterval(_checkDT, 1000);

// 4. Disable text selection trên các phần tử nhạy cảm
var _noSelect = document.createElement('style');
_noSelect.textContent = 'body{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}input,textarea{-webkit-user-select:text!important;-moz-user-select:text!important;user-select:text!important}';
document.head.appendChild(_noSelect);

// 5. Chặn drag & drop ảnh
document.addEventListener('dragstart', function(e){ e.preventDefault(); }, true);

// 6. Console warning
var _w = '%c⚠️ CẢNH BÁO!';
var _m = 'color:#f5576c;font-size:2rem;font-weight:900;';
var _w2 = '%cNếu ai đó bảo bạn paste code vào đây, đó là lừa đảo!';
var _m2 = 'color:#667eea;font-size:1rem;';
setTimeout(function(){
  console.log(_w, _m);
  console.log(_w2, _m2);
}, 500);

})();
