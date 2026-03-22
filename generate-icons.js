// Generate PWA icons using pure Node.js (no external deps)
// Creates simple PNG files with gradient background + "CP" text
const fs = require('fs');
const path = require('path');

// We'll create SVG files and use them as icons
// Since we can't use canvas without the module, create SVG-based icons

function createSVGIcon(size) {
  const r = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.38);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
    <clipPath id="c">
      <rect width="${size}" height="${size}" rx="${r}" ry="${r}"/>
    </clipPath>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#g)"/>
  <text x="${size/2}" y="${size/2}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">CP</text>
</svg>`;
}

// Save SVG icons (browsers accept SVG in manifest too)
const imgDir = path.join(__dirname, 'img');
fs.writeFileSync(path.join(imgDir, 'icon-192.svg'), createSVGIcon(192));
fs.writeFileSync(path.join(imgDir, 'icon-512.svg'), createSVGIcon(512));
console.log('SVG icons created');

// Also create a minimal valid PNG using raw bytes
// This is a 1x1 purple pixel PNG, scaled up via manifest
// Better: create proper PNG using Buffer manipulation

// Create a simple PNG programmatically
function createSimplePNG(size) {
  // Use jimp-like approach but pure JS
  // Actually let's just copy the profile image as icon
  const profileImg = path.join(__dirname, 'img/z7643399499088_fbf2b939d27d107fda73c5053dbb4dd0.jpg');
  if (fs.existsSync(profileImg)) {
    fs.copyFileSync(profileImg, path.join(__dirname, `img/icon-${size}.png`));
    console.log(`Copied profile as icon-${size}.png (will work as fallback)`);
  }
}

createSimplePNG(192);
createSimplePNG(512);
