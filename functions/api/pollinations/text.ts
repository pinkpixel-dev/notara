type PollinationsEnv = {
  POLLINATIONS_API_TOKEN?: string;
};

type PagesFunctionArgs<Env = Record<string, unknown>> = {
  request: Request;
  env: Env & Record<string, unknown>;
};

export const onRequestPost = async ({ request, env }: PagesFunctionArgs<PollinationsEnv>) => {
  const requestBody = await request.text();

  const upstreamHeaders = new Headers({
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  });

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

  upstreamHeaders.set("Authorization", tokenValue);

  try {
    const upstreamResponse = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: upstreamHeaders,
      body: requestBody,
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      return new Response(errorText, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: {
        "Content-Type": upstreamResponse.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache",
      },
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
