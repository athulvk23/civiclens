import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleApiRequest } from './apiMiddleware';

const PORT = Number(process.env.PORT || 5173);
const DIST_DIR = path.resolve(process.cwd(), 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url || '/', 'http://localhost');
    if (urlObj.pathname.startsWith('/api/')) {
      const handled = await handleApiRequest(req, res);
      if (handled) return;
    }

    let safePath = decodeURIComponent(urlObj.pathname);
    if (safePath === '/' || safePath === '') {
      safePath = '/index.html';
    }

    const candidate = path.join(DIST_DIR, safePath);
    if (
      candidate.startsWith(DIST_DIR) &&
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile()
    ) {
      const ext = path.extname(candidate).toLowerCase();
      res.statusCode = 200;
      res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
      if (ext !== '.html') {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
      fs.createReadStream(candidate).pipe(res);
      return;
    }

    // SPA fallback
    const indexHtml = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      fs.createReadStream(indexHtml).pipe(res);
      return;
    }

    res.statusCode = 404;
    res.end('Not found');
  } catch (err) {
    res.statusCode = 500;
    res.end(err instanceof Error ? err.message : 'Internal Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CivicLens Full-Stack Production Server running on http://localhost:${PORT}/`);
});
