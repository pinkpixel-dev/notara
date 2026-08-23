import { Readable } from 'node:stream';
import type { Plugin } from 'vite';

export const createPollinationsProxyPlugin = (env: Record<string, string>): Plugin => ({
  name: 'notara-pollinations-proxy',
  configureServer(server) {
    server.middlewares.use('/api/pollinations/text', (req, res, next) => {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'POST') {
        next();
        return;
      }

      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', async () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const incoming = req.headers.authorization;
        const parsedIncoming = Array.isArray(incoming) ? incoming[0] : incoming;
        const envToken = env.VITE_POLLINATIONS_API_TOKEN;
        const authorization = parsedIncoming
          ?? (envToken ? (envToken.startsWith('Bearer ') ? envToken : `Bearer ${envToken}`) : undefined);

        if (!authorization) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            error: 'Pollinations API key required',
            message: 'Provide an API key from https://enter.pollinations.ai in Settings → AI & Data.',
          }));
          return;
        }

        try {
          const upstreamResponse = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
              Authorization: authorization,
            },
            body,
          });
          res.statusCode = upstreamResponse.status;
          res.statusMessage = upstreamResponse.statusText;
          res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') ?? 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');

          if (!upstreamResponse.body) {
            res.end();
            return;
          }
          Readable.fromWeb(upstreamResponse.body as unknown as ReadableStream)
            .on('error', (error) => {
              server.config.logger.error(`Pollinations text proxy stream error: ${error}`);
              if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              }
              res.end('Upstream stream error');
            })
            .pipe(res);
        } catch (error) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(`Pollinations proxy error: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
      req.on('error', (error) => {
        server.config.logger.error(`Pollinations text proxy request error: ${error}`);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Request stream error');
      });
    });

    server.middlewares.use('/api/pollinations/image', (req, res, next) => {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== 'POST') {
        next();
        return;
      }

      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', async () => {
        try {
          const body = Buffer.concat(chunks).toString('utf8');
          const payload = body ? JSON.parse(body) : {};
          const prompt: string | undefined = payload.prompt;
          if (!prompt?.trim()) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('Prompt is required');
            return;
          }

          const upstreamUrl = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`);
          upstreamUrl.searchParams.set('width', String(payload.width ?? 1024));
          upstreamUrl.searchParams.set('height', String(payload.height ?? 1024));
          upstreamUrl.searchParams.set('seed', String(payload.seed ?? Math.floor(Math.random() * 1000)));
          upstreamUrl.searchParams.set('model', payload.model ?? 'flux');
          if (typeof payload.enhance === 'boolean') upstreamUrl.searchParams.set('enhance', String(payload.enhance));
          if (typeof payload.safe === 'boolean') upstreamUrl.searchParams.set('safe', String(payload.safe));
          if (payload.quality) upstreamUrl.searchParams.set('quality', payload.quality);

          const incoming = req.headers.authorization;
          const parsedIncoming = Array.isArray(incoming) ? incoming[0] : incoming;
          const envToken = env.VITE_POLLINATIONS_API_TOKEN;
          const authorization = parsedIncoming
            ?? (envToken ? (envToken.startsWith('Bearer ') ? envToken : `Bearer ${envToken}`) : undefined);
          if (!authorization) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({
              error: 'Pollinations API key required',
              message: 'Provide an API key from https://enter.pollinations.ai in Settings → AI & Data.',
            }));
            return;
          }

          const upstreamResponse = await fetch(upstreamUrl, {
            method: 'GET',
            headers: { Authorization: authorization },
          });
          const arrayBuffer = await upstreamResponse.arrayBuffer();
          res.statusCode = upstreamResponse.status;
          res.statusMessage = upstreamResponse.statusText;
          res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') ?? 'image/png');
          res.setHeader('Cache-Control', 'no-store');
          res.end(Buffer.from(arrayBuffer));
        } catch (error) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(`Pollinations proxy error: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
      req.on('error', (error) => {
        server.config.logger.error(`Pollinations image proxy request error: ${error}`);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Request stream error');
      });
    });
  },
});
