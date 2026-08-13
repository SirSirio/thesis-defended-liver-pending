/* Tiny static server for previewing the site locally.
   Run it with "Preview locally.cmd" in the project folder, or: node tools/preview.js
   Nothing here ships to the live site. */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4',
  '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';

  // Stay inside the project folder.
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found: ' + rel);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',   // always serve your latest edit
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('');
  console.log('  Course 03102 is running at:  http://127.0.0.1:' + PORT + '/');
  console.log('');
  console.log('  Edit any file and refresh the browser to see the change.');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
