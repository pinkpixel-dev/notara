/**
 * GitHub OAuth Token Revocation Proxy
 * 
 * This Cloudflare function revokes GitHub OAuth tokens.
 * Revocation requires Basic auth with client_id:client_secret,
 * so it must be done server-side to keep secrets secure.
 */

interface Env {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

interface RevokeRequest {
  access_token: string;
}

/**
 * Create Basic auth header
 */
function createBasicAuth(clientId: string, clientSecret: string): string {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  return `Basic ${credentials}`;
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
    const body = await context.request.json() as RevokeRequest;
    const { access_token } = body;

    // Validate required fields
    if (!access_token) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing access_token',
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

    // Get credentials from environment
    const clientId = context.env.GITHUB_CLIENT_ID;
    const clientSecret = context.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('[GitHub Revoke] Missing credentials in environment');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          message: 'GitHub credentials not configured',
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

    // Revoke token with GitHub
    const revokeResponse = await fetch(
      `https://api.github.com/applications/${clientId}/token`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': createBasicAuth(clientId, clientSecret),
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token }),
      }
    );

    // 204 = success, 404 = already revoked (also success)
    if (revokeResponse.status === 204 || revokeResponse.status === 404) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handle errors
    const errorText = await revokeResponse.text();
    console.error('[GitHub Revoke] Failed:', revokeResponse.status, errorText);
    
    return new Response(
      JSON.stringify({ 
        error: 'Revocation failed',
        details: errorText,
      }),
      {
        status: revokeResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[GitHub Revoke] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
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
