// DEBUG SCRIPT FOR MOBILE NAV
(function() {
  console.log('🔍 DEBUG: Mobile Nav Debugging Started');
  console.log('📱 Window Width:', window.innerWidth);
  console.log('📱 Window Height:', window.innerHeight);
  console.log('📱 Touch Support:', 'ontouchstart' in window);
  console.log('📱 Is Mobile (<= 768px):', window.innerWidth <= 768);
  
  // Check if CSS is loaded
  const stylesheets = Array.from(document.styleSheets).map(s => {
    try {
      return s.href || s.ownerNode.getAttribute('href') || 'inline';
    } catch {
      return 'restricted';
    }
  });
  console.log('📄 Stylesheets loaded:', stylesheets);
  console.log('📄 mobile-ux.css loaded:', stylesheets.some(s => s.includes('mobile-ux')));
  
  // Check if nav exists
  setTimeout(() => {
    const nav = document.getElementById('mobile-bottom-nav');
    console.log('📍 Nav element exists:', !!nav);
    if (nav) {
      const computed = window.getComputedStyle(nav);
      console.log('📍 Nav display:', computed.display);
      console.log('📍 Nav z-index:', computed.zIndex);
      console.log('📍 Nav overflow:', computed.overflow);
      console.log('📍 Nav visibility:', computed.visibility);
      console.log('📍 Full nav styles:', computed);
    }
    
    // Check media query
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    console.log('📊 Media query (max-width: 768px):', mediaQuery.matches);
    
    // Check for CSS overrides
    const allNavs = document.querySelectorAll('[id*="nav"]');
    console.log('🔎 All elements with "nav" in id:', allNavs.length);
    allNavs.forEach((el, i) => {
      const display = window.getComputedStyle(el).display;
      console.log(`  [${i}] id="${el.id}" display="${display}"`);
    });
  }, 1000);
  
  // Check if script is loaded
  const scripts = Array.from(document.scripts).map(s => s.src);
  console.log('📜 Scripts loaded:', scripts);
  console.log('📜 mobile-nav.js loaded:', scripts.some(s => s.includes('mobile-nav')));
})();
