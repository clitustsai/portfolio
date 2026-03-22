// ========== PROTECTION: F12, DevTools, Right-click ==========
(function(){
'use strict';

// 1. Chặn chuột phải
document.addEventListener('contextmenu', function(e){
  e.preventDefault();
  return false;
}, true);

// 2. Chặn Ctrl+U (view source) và Ctrl+S (save page)
document.addEventListener('keydown', function(e){
  // Ctrl+U (view source)
  if(e.ctrlKey && (e.key==='U'||e.key==='u')) { e.preventDefault(); return false; }
  // Ctrl+S (save page)
  if(e.ctrlKey && (e.key==='S'||e.key==='s')) { e.preventDefault(); return false; }
}, true);

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
