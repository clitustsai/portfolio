// ========== BUILD SCRIPT: Minify + Obfuscate JS ==========
// Chạy: node build.js
// Output: dist/ folder với tất cả JS đã minify

const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

const JS_FILES = [
  'protect.js',
  'api.js',
  'auth.js',
  'nav.js',
  'chat.js',
  'recommend.js',
  'live-activity.js',
  'push-notify.js',
  'mobile-nav.js',
  'interactions-vip.js',
  'tools.js',
  'admin.js',
  'i18n.js',
  'sw.js',
  'bug-report.js',
];

const TERSER_OPTIONS = {
  compress: {
    drop_console: true,      // Xóa console.log
    drop_debugger: true,     // Xóa debugger
    dead_code: true,
    passes: 2,
    pure_funcs: ['console.log', 'console.warn', 'console.info'],
  },
  mangle: {
    toplevel: false,         // Đổi tên biến local
    eval: false,
  },
  format: {
    comments: false,         // Xóa tất cả comment
    beautify: false,
    semicolons: true,
  },
  sourceMap: false,
};

const DIST = path.join(__dirname, 'dist');
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST);

async function buildAll() {
  let ok = 0, fail = 0;
  for (const file of JS_FILES) {
    const src = path.join(__dirname, file);
    if (!fs.existsSync(src)) { console.log(`⚠️  Skip (not found): ${file}`); continue; }
    try {
      const code = fs.readFileSync(src, 'utf8');
      const result = await minify(code, TERSER_OPTIONS);
      const outPath = path.join(DIST, file);
      fs.writeFileSync(outPath, result.code, 'utf8');
      const orig = code.length;
      const mini = result.code.length;
      const pct = Math.round((1 - mini/orig)*100);
      console.log(`✅ ${file}: ${orig} → ${mini} bytes (-${pct}%)`);
      ok++;
    } catch(err) {
      console.error(`❌ ${file}: ${err.message}`);
      fail++;
    }
  }
  console.log(`\n📦 Done: ${ok} minified, ${fail} failed`);
  console.log(`📁 Output: ./dist/`);
  console.log(`\n💡 Để dùng: thay <script src="xxx.js"> bằng <script src="dist/xxx.js">`);
}

buildAll();
