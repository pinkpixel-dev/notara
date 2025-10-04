import { Readable } from "node:stream";
import path from "path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv, type Plugin } from "vite";

const createPollinationsProxyPlugin = (env: Record<string, string>): Plugin => {
  return {
    name: "notara-pollinations-proxy",
    configureServer(server) {
      server.middlewares.use("/api/pollinations/text", (req, res, next) => {
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== "POST") {
          next();
          return;
        }

        const chunks: Buffer[] = [];

        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        req.on("end", async () => {
          const body = Buffer.concat(chunks).toString("utf8");

          const upstreamHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          };

          const incomingAuthorization = req.headers["authorization"];
          const envToken = env.VITE_POLLINATIONS_API_TOKEN;
          const parsedIncoming = Array.isArray(incomingAuthorization) ? incomingAuthorization[0] : incomingAuthorization;
          const authHeaderValue = parsedIncoming
            ?? (envToken ? (envToken.startsWith("Bearer ") ? envToken : `Bearer ${envToken}`) : undefined);

          if (authHeaderValue) {
            upstreamHeaders["Authorization"] = authHeaderValue;
          }

          try {
            const upstreamResponse = await fetch("https://text.pollinations.ai/v1/chat/completions", {
              method: "POST",
              headers: upstreamHeaders,
              body,
            });

            res.statusCode = upstreamResponse.status;
            res.statusMessage = upstreamResponse.statusText;
            res.setHeader(
              "Content-Type",
              upstreamResponse.headers.get("content-type") ?? "text/event-stream"
            );
            res.setHeader("Cache-Control", "no-cache");

            const upstreamBody = upstreamResponse.body;

            if (!upstreamBody) {
              res.end();
              return;
            }

            Readable.fromWeb(upstreamBody as unknown as ReadableStream).on("error", (err) => {
              server.config.logger.error(`Pollinations text proxy stream error: ${err}`);
              if (!res.headersSent) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
              }
              res.end("Upstream stream error");
            }).pipe(res);
          } catch (error) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(
              `Pollinations proxy error: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        });

        req.on("error", (err) => {
          server.config.logger.error(`Pollinations text proxy request error: ${err}`);
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("Request stream error");
        });
      });

      server.middlewares.use("/api/pollinations/image", (req, res, next) => {
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== "POST") {
          next();
          return;
        }

        const chunks: Buffer[] = [];

        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        req.on("end", async () => {
          try {
            const body = Buffer.concat(chunks).toString("utf8");
            const payload = body ? JSON.parse(body) : {};

            const prompt: string | undefined = payload.prompt;

            if (!prompt || !prompt.trim()) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "text/plain; charset=utf-8");
              res.end("Prompt is required");
              return;
            }

            const width = payload.width ?? 1024;
            const height = payload.height ?? 1024;
            const seed = payload.seed ?? Math.floor(Math.random() * 1000);
            const nologo = payload.nologo ?? false;
            const model = payload.model ?? "flux";
            const referrer = payload.referrer as string | undefined;

            const upstreamUrl = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);
            upstreamUrl.searchParams.set("width", String(width));
            upstreamUrl.searchParams.set("height", String(height));
            upstreamUrl.searchParams.set("seed", String(seed));
            upstreamUrl.searchParams.set("nologo", nologo ? "true" : "false");
            upstreamUrl.searchParams.set("model", model);
            if (referrer) {
              upstreamUrl.searchParams.set("referrer", referrer);
            }

            const incomingAuthorization = req.headers["authorization"];
            const envToken = env.VITE_POLLINATIONS_API_TOKEN;
            const parsedIncoming = Array.isArray(incomingAuthorization)
              ? incomingAuthorization[0]
              : incomingAuthorization;
            const authHeaderValue = parsedIncoming
              ?? (envToken ? (envToken.startsWith("Bearer ") ? envToken : `Bearer ${envToken}`) : undefined);

            const upstreamHeaders: Record<string, string> = {};
            if (authHeaderValue) {
              upstreamHeaders["Authorization"] = authHeaderValue;
            }

            const upstreamResponse = await fetch(upstreamUrl.toString(), {
              method: "GET",
              headers: upstreamHeaders,
            });

            const arrayBuffer = await upstreamResponse.arrayBuffer();

            res.statusCode = upstreamResponse.status;
            res.statusMessage = upstreamResponse.statusText;
            res.setHeader(
              "Content-Type",
              upstreamResponse.headers.get("content-type") ?? "image/png"
            );
            res.setHeader("Cache-Control", "no-store");
            res.end(Buffer.from(arrayBuffer));
          } catch (error) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(
              `Pollinations proxy error: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        });

        req.on("error", (err) => {
          server.config.logger.error(`Pollinations image proxy request error: ${err}`);
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("Request stream error");
        });
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && createPollinationsProxyPlugin(env),
      // mode === 'development' && componentTagger(),
    ].filter(Boolean) as Plugin[],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
