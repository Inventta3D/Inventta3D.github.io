// Servidor estático mínimo da pasta site/ para os testes de navegador (sem dependências, sem cache).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..', '..', 'site');
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.b64': 'text/plain' };

http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const arquivo = path.join(raiz, rel);
  if (!arquivo.startsWith(raiz) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) { res.writeHead(404); return res.end('não encontrado'); }
  res.writeHead(200, { 'content-type': tipos[path.extname(arquivo)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(arquivo).pipe(res);
}).listen(5190, '127.0.0.1', () => console.log('site em http://127.0.0.1:5190'));
