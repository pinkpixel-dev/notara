/**
 * GitHub OAuth Token Exchange Proxy
 * 
 * This Cloudflare function proxies the OAuth token exchange request to GitHub.
 * We need this because GitHub's token endpoint doesn't allow CORS requests from browsers.
 * 
 * Security: For GitHub OAuth Apps (not GitHub Apps), we need client_secret on the server.
 * The client_secret is stored securely in Cloudflare environment variables.
 * 
 * Note: PKCE only works with GitHub Apps, not OAuth Apps!
 */

interface Env {
  VITE_GITHUB_CLIENT_SECRET: string;
}

interface TokenRequest {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier?: string; // Optional, not used with OAuth Apps
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // In production, set this to your domain
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle OPTIONS request for CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    const body = await context.request.json() as TokenRequest;
    const { code, clientId, redirectUri } = body;

    // Validate required fields
    if (!code || !clientId || !redirectUri) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['code', 'clientId', 'redirectUri']
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get client secret from environment
    const clientSecret = context.env.VITE_GITHUB_CLIENT_SECRET;
    if (!clientSecret) {
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          message: 'GitHub client secret not configured'
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Exchange code for token with GitHub
    // Note: OAuth Apps require client_secret, not PKCE code_verifier
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('[GitHub Token Exchange] Failed:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Token exchange failed',
          details: error
        }),
        {
          status: tokenResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const tokenData = await tokenResponse.json();

    // Check for OAuth errors
    if (tokenData.error) {
      return new Response(
        JSON.stringify({
          error: tokenData.error,
          error_description: tokenData.error_description,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Return token data
    return new Response(
      JSON.stringify(tokenData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[GitHub Token Exchange] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
