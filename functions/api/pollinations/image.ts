type PollinationsEnv = {
  POLLINATIONS_API_TOKEN?: string;
};

type PagesFunctionArgs<Env = Record<string, unknown>> = {
  request: Request;
  env: Env & Record<string, unknown>;
};

type ImageRequestPayload = {
  prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  model?: string;
  enhance?: boolean;
  safe?: boolean;
  quality?: 'low' | 'medium' | 'high' | 'hd';
};

export const onRequestPost = async ({ request, env }: PagesFunctionArgs<PollinationsEnv>) => {
  let payload: ImageRequestPayload;

  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON payload", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const prompt = payload.prompt?.trim();

  if (!prompt) {
    return new Response("Prompt is required", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const width = payload.width ?? 1024;
  const height = payload.height ?? 1024;
  const seed = payload.seed ?? Math.floor(Math.random() * 1000);
  const model = payload.model ?? "flux";
  const enhance = payload.enhance;
  const safe = payload.safe;
  const quality = payload.quality;

  const upstreamUrl = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`);
  upstreamUrl.searchParams.set("width", String(width));
  upstreamUrl.searchParams.set("height", String(height));
  upstreamUrl.searchParams.set("seed", String(seed));
  upstreamUrl.searchParams.set("model", model);
  if (typeof enhance === 'boolean') {
    upstreamUrl.searchParams.set("enhance", enhance ? "true" : "false");
  }
  if (typeof safe === 'boolean') {
    upstreamUrl.searchParams.set("safe", safe ? "true" : "false");
  }
  if (quality) {
    upstreamUrl.searchParams.set("quality", quality);
  }

  const incomingAuthorization = request.headers.get("authorization");
  const envToken = env.POLLINATIONS_API_TOKEN;

  const tokenValue = incomingAuthorization
    ?? (envToken ? (envToken.startsWith("Bearer ") ? envToken : `Bearer ${envToken}`) : undefined);

  if (!tokenValue) {
    return new Response(
      JSON.stringify({
        error: "Pollinations API key required",
        message: "Provide an API key from https://enter.pollinations.ai in Settings → Integrations.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }

  const upstreamHeaders = new Headers();
  upstreamHeaders.set("Authorization", tokenValue);

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: upstreamHeaders,
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      return new Response(errorText, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const responseHeaders = new Headers({
      "Content-Type": upstreamResponse.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "no-store",
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Pollinations proxy error: ${message}`, {
      status: 502,
      statusText: "Bad Gateway",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
};
