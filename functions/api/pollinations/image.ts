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
  nologo?: boolean;
  model?: string;
  referrer?: string;
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
  const nologo = payload.nologo ?? false;
  const model = payload.model ?? "flux";
  const referrer = payload.referrer;

  const upstreamUrl = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);
  upstreamUrl.searchParams.set("width", String(width));
  upstreamUrl.searchParams.set("height", String(height));
  upstreamUrl.searchParams.set("seed", String(seed));
  upstreamUrl.searchParams.set("nologo", nologo ? "true" : "false");
  upstreamUrl.searchParams.set("model", model);
  if (referrer) {
    upstreamUrl.searchParams.set("referrer", referrer);
  }

  const incomingAuthorization = request.headers.get("authorization");
  const envToken = env.POLLINATIONS_API_TOKEN;

  const tokenValue = incomingAuthorization
    ?? (envToken ? (envToken.startsWith("Bearer ") ? envToken : `Bearer ${envToken}`) : undefined);

  const upstreamHeaders = new Headers();
  if (tokenValue) {
    upstreamHeaders.set("Authorization", tokenValue);
  }

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
