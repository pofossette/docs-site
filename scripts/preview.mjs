import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const distDir = resolve(import.meta.dirname, '..', 'dist');
const port = Number(process.env.PORT || 4321);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.pf_meta': 'application/octet-stream',
  '.pf_fragment': 'application/octet-stream',
  '.pf_index': 'application/octet-stream',
  '.pagefind': 'application/octet-stream',
};

function resolveFile(reqPath) {
  const cleanPath = decodeURIComponent(reqPath.split('?')[0]);
  const candidate = resolve(distDir, `.${cleanPath}`);
  if (!candidate.startsWith(distDir)) return null;

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }
  const indexHtml = join(candidate, 'index.html');
  if (existsSync(indexHtml) && statSync(indexHtml).isFile()) {
    return indexHtml;
  }
  return null;
}

const server = http.createServer((req, res) => {
  const file = resolveFile(req.url || '/');
  if (!file) {
    const fallback = resolve(distDir, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    if (existsSync(fallback)) {
      createReadStream(fallback).pipe(res);
    } else {
      res.end('404 Not Found');
    }
    return;
  }
  const mime = MIME_TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Preview server running at http://127.0.0.1:${port}`);
});
