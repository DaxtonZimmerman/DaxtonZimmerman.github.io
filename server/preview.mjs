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
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
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
    const headers = {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-cache',
      'Accept-Ranges': 'bytes',
      'Content-Length': data.length,
    };
    // Media players request a byte range when the listener seeks.
    if (status === 200 && req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      const start = range?.[1] ? Number(range[1]) : Math.max(0, data.length - Number(range?.[2]));
      const end =
        range?.[1] && range?.[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
      if (
        !range ||
        (!range[1] && !range[2]) ||
        !Number.isFinite(start) ||
        start > end ||
        start >= data.length
      ) {
        res.writeHead(416, { 'Content-Range': `bytes */${data.length}` });
        res.end();
        return;
      }
      const chunk = data.subarray(start, end + 1);
      res.writeHead(206, {
        ...headers,
        'Content-Length': chunk.length,
        'Content-Range': `bytes ${start}-${end}/${data.length}`,
      });
      res.end(req.method === 'HEAD' ? undefined : chunk);
      return;
    }
    res.writeHead(status, headers);
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    json(res, 500, { error: 'Request unavailable' });
  }
}).listen(8777, '127.0.0.1', () => console.log('Portfolio preview: http://127.0.0.1:8777'));
