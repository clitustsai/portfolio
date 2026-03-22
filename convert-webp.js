// convert-webp.js — chạy 1 lần để convert ảnh sang WebP
const sharp = require('./server/node_modules/sharp');
const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'img');
const files = fs.readdirSync(imgDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));

(async () => {
  for (const file of files) {
    const input = path.join(imgDir, file);
    const output = path.join(imgDir, file.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
    if (fs.existsSync(output)) { console.log('skip:', file); continue; }
    await sharp(input).webp({ quality: 82 }).toFile(output);
    const before = fs.statSync(input).size;
    const after = fs.statSync(output).size;
    console.log(`✓ ${file} → ${path.basename(output)} (${(before/1024).toFixed(0)}KB → ${(after/1024).toFixed(0)}KB, -${Math.round((1-after/before)*100)}%)`);
  }
  console.log('Done!');
})();
