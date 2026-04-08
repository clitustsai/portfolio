/**
 * IndexNow auto-submit — chạy 1 lần để notify Bing/Yandex
 * node indexnow-submit.js
 */
const https = require('https');

const KEY = 'clituspc2026'; // key tùy chọn
const HOST = 'portfolio-xi-gray-20.vercel.app';
const URLS = [
  `https://${HOST}/`,
  `https://${HOST}/services.html`,
  `https://${HOST}/blog.html`,
  `https://${HOST}/ai-chat.html`,
  `https://${HOST}/tools.html`,
  `https://${HOST}/payment.html`,
  `https://${HOST}/arcade.html`,
];

const body = JSON.stringify({ host: HOST, key: KEY, urlList: URLS });

const req = https.request({
  hostname: 'api.indexnow.org',
  path: '/indexnow',
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  console.log('Status:', res.statusCode);
  res.on('data', d => process.stdout.write(d));
});
req.on('error', e => console.error(e));
req.write(body);
req.end();
