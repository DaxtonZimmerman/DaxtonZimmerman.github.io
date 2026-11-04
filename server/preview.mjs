import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};
const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    let path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!path.startsWith(root + '/') && path !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (url.pathname.endsWith('/')) path = resolve(path, 'index.html');
    let status = 200;
    try {
      if (!(await stat(path)).isFile()) throw Error();
    } catch {
      path = resolve(root, '404.html');
      status = 404;
    }
    const data = await readFile(path);
    res.writeHead(status, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    json(res, 500, { error: 'Request unavailable' });
  }
}).listen(8777, '127.0.0.1', () => console.log('Portfolio preview: http://127.0.0.1:8777'));
