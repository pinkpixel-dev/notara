import { createReadStream } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

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

const normalizeToken = (token) => {
  if (!token) {
    return undefined;
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}`;
};

const readBody = async (req) => {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const sendJson = (res, statusCode, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
};

const relayFetchResponse = async (res, upstreamResponse, fallbackContentType) => {
  const headers = {
    'Cache-Control': upstreamResponse.headers.get('Cache-Control') ?? 'no-store',
    'Content-Type': upstreamResponse.headers.get('Content-Type') ?? fallbackContentType,
  };

  res.writeHead(upstreamResponse.status, headers);

  if (!upstreamResponse.body) {
    res.end();
    return;
  }

  Readable.fromWeb(upstreamResponse.body).pipe(res);
};

const handlePollinationsText = async (req, res) => {
  const authorization =
    req.headers.authorization || normalizeToken(process.env.POLLINATIONS_API_TOKEN);

  if (!authorization) {
    sendJson(res, 401, {
      error: 'Pollinations API key required',
      message: 'Provide an API key from https://enter.pollinations.ai in Settings -> Integrations.',
    });
    return;
  }

  try {
    const requestBody = await readBody(req);

    const upstreamResponse = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      res.writeHead(upstreamResponse.status, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end(errorText);
      return;
    }

    await relayFetchResponse(res, upstreamResponse, 'text/event-stream');
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Pollinations proxy error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const handlePollinationsImage = async (req, res) => {
  const authorization =
    req.headers.authorization || normalizeToken(process.env.POLLINATIONS_API_TOKEN);

  if (!authorization) {
    sendJson(res, 401, {
      error: 'Pollinations API key required',
      message: 'Provide an API key from https://enter.pollinations.ai in Settings -> Integrations.',
    });
    return;
  }

  let payload;

  try {
    payload = JSON.parse((await readBody(req)).toString('utf8'));
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Invalid JSON payload');
    return;
  }

  const prompt = payload.prompt?.trim();

  if (!prompt) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Prompt is required');
    return;
  }

  const upstreamUrl = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`);
  upstreamUrl.searchParams.set('width', String(payload.width ?? 1024));
  upstreamUrl.searchParams.set('height', String(payload.height ?? 1024));
  upstreamUrl.searchParams.set('seed', String(payload.seed ?? Math.floor(Math.random() * 1000)));
  upstreamUrl.searchParams.set('model', payload.model ?? 'flux');

  if (typeof payload.enhance === 'boolean') {
    upstreamUrl.searchParams.set('enhance', payload.enhance ? 'true' : 'false');
  }

  if (typeof payload.safe === 'boolean') {
    upstreamUrl.searchParams.set('safe', payload.safe ? 'true' : 'false');
  }

  if (payload.quality) {
    upstreamUrl.searchParams.set('quality', payload.quality);
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Authorization: authorization,
      },
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      res.writeHead(upstreamResponse.status, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end(errorText);
      return;
    }

    await relayFetchResponse(res, upstreamResponse, 'image/png');
  } catch (error) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Pollinations proxy error: ${error instanceof Error ? error.message : String(error)}`);
  }
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

  if (req.method === 'OPTIONS' && req.url.startsWith('/api/')) {
    res.writeHead(204, {
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/pollinations/text') {
    await handlePollinationsText(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/pollinations/image') {
    await handlePollinationsImage(req, res);
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
