// DevTools protection - Clitus PC
(function(){
  // Disable right-click
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
  document.addEventListener('keydown', function(e){
    if(
      e.key === 'F12' ||
      e.keyCode === 123 ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && e.key === 'U') ||
      (e.ctrlKey && e.key === 'S')
    ){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true); // capture phase

  // Detect devtools open via size diff
  var threshold = 160;
  function check(){
    var w = window.outerWidth - window.innerWidth;
    var h = window.outerHeight - window.innerHeight;
    if(w > threshold || h > threshold){
      document.body.style.filter = 'blur(8px)';
      document.body.style.pointerEvents = 'none';
      if(!document.getElementById('_devwarn')){
        var d = document.createElement('div');
        d.id = '_devwarn';
        d.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);color:#fff;font-size:1.2rem;font-family:sans-serif;text-align:center;padding:2rem;';
        d.innerHTML = '<div>🔒 Vui lòng đóng DevTools để tiếp tục sử dụng trang web.</div>';
        document.body.appendChild(d);
      }
    } else {
      document.body.style.filter = '';
      document.body.style.pointerEvents = '';
      var w2 = document.getElementById('_devwarn');
      if(w2) w2.remove();
    }
  }
  setInterval(check, 1000);

  // Disable console
  try {
    var c = console;
    ['log','warn','error','info','debug','table','dir'].forEach(function(m){
      c[m] = function(){};
    });
  } catch(e){}
})();
