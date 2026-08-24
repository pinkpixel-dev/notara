// Static file server for the Docker image.
//
// This used to proxy AI requests as well. It does not any more: OpenAI runs
// through the desktop backend, which is the only place the API key can be held
// safely, so a hosted Notara serves the app without AI features.
import { createReadStream } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');
const port = Number(process.env.PORT || 3489);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const serveStaticFile = async (req, res) => {
  const requestedPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const normalizedPath = requestedPath === '/' ? '/index.html' : requestedPath;
  const filePath = path.resolve(distDir, `.${normalizedPath}`);

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let finalPath = filePath;

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      finalPath = path.join(filePath, 'index.html');
    }
  } catch {
    if (!path.extname(filePath)) {
      finalPath = path.join(distDir, 'index.html');
    }
  }

  try {
    await access(finalPath);
  } catch {
    if (path.extname(finalPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    finalPath = path.join(distDir, 'index.html');
  }

  const extension = path.extname(finalPath).toLowerCase();
  const mimeType = MIME_TYPES[extension] ?? 'application/octet-stream';

  if (req.method === 'HEAD') {
    const fileBuffer = await readFile(finalPath);
    res.writeHead(200, {
      'Content-Length': fileBuffer.byteLength,
      'Content-Type': mimeType,
    });
    res.end();
    return;
  }

  res.writeHead(200, { 'Content-Type': mimeType });
  createReadStream(finalPath).pipe(res);
};

const server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
    return;
  }

  await serveStaticFile(req, res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Notara Docker server listening on http://0.0.0.0:${port}`);
});
