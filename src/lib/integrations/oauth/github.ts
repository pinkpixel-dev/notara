/**
 * GitHub OAuth Helper Utilities
 * 
 * Implements OAuth 2.0 flow with PKCE (Proof Key for Code Exchange)
 * for secure authentication without client secrets.
 */

const GITHUB_OAUTH_BASE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_API_BASE_URL = 'https://api.github.com';
const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
const GITHUB_DEVICE_TOKEN_URL = 'https://github.com/login/oauth/access_token';

/**
 * Get the token exchange endpoint
 * In development: Use local proxy
 * In production: Use Cloudflare function
 */
function getTokenExchangeUrl(): string {
  const origin = window.location.origin;
  return `${origin}/api/github/token`;
}

/**
 * Device Flow Types
 */
interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

/**
 * Required OAuth scopes for Notara GitHub integration
 */
export const GITHUB_SCOPES = [
  'repo',        // Full repository access for reading/writing notes
  'user:email',  // Read user email for attribution
] as const;

/**
 * OAuth state stored during flow
 */
interface OAuthState {
  state: string;
  codeVerifier: string;
  timestamp: number;
}

/**
 * Generate a random string for OAuth state and PKCE
 */
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate PKCE code verifier (RFC 7636)
 */
export function generateCodeVerifier(): string {
  return generateRandomString(32); // 64 characters hex string
}

/**
 * Generate PKCE code challenge from verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  // Convert hash to base64url
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate OAuth state parameter for CSRF protection
 */
export function generateState(): string {
  return generateRandomString(16); // 32 characters hex string
}

/**
 * Get storage used for OAuth state (needs to be shared across popup + opener)
 */
function getOAuthStateStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Store OAuth state in shared storage so the popup can read it
 */
export function storeOAuthState(state: OAuthState): void {
  const storage = getOAuthStateStorage();
  if (!storage) {
    return;
  }

  storage.setItem('github_oauth_state', JSON.stringify(state));
}

/**
 * Retrieve OAuth state from shared storage
 */
export function retrieveOAuthState(): OAuthState | null {
  const storage = getOAuthStateStorage();
  if (!storage) {
    return null;
  }

  const stored = storage.getItem('github_oauth_state');
  if (!stored) {
    return null;
  }
  
  try {
    const state = JSON.parse(stored) as OAuthState;
    
    // Validate state is not too old (15 minutes max)
    const age = Date.now() - state.timestamp;
    if (age > 15 * 60 * 1000) {
      clearOAuthState();
      return null;
    }
    
    return state;
  } catch {
    clearOAuthState();
    return null;
  }
}

/**
 * Clear OAuth state from shared storage
 */
export function clearOAuthState(): void {
  const storage = getOAuthStateStorage();
  if (!storage) {
    return;
  }

  storage.removeItem('github_oauth_state');
}

/**
 * Build GitHub OAuth authorization URL
 * Note: GitHub OAuth Apps use client_secret (server-side), not PKCE
 * Only GitHub Apps support PKCE
 */
export async function buildAuthorizationUrl(clientId: string, redirectUri: string): Promise<string> {
  const state = generateState();
  
  // Store state for callback validation
  storeOAuthState({
    state,
    codeVerifier: '', // Not used with OAuth Apps, but kept for compatibility
    timestamp: Date.now(),
  });
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: GITHUB_SCOPES.join(' '),
    state,
    // Note: No PKCE parameters for GitHub OAuth Apps
    // OAuth Apps authenticate using client_secret on the server
  });
  
  return `${GITHUB_OAUTH_BASE_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * Uses our proxy endpoint to avoid CORS issues and securely use client_secret
 * 
 * Note: For GitHub OAuth Apps (not GitHub Apps), the server uses client_secret
 * instead of PKCE. The client_secret is kept secure on the server.
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  redirectUri: string
): Promise<{ access_token: string; token_type: string; scope: string }> {
  const storedState = retrieveOAuthState();
  if (!storedState) {
    throw new Error('OAuth state not found or expired');
  }
  
  // Use our proxy endpoint instead of calling GitHub directly
  const tokenUrl = getTokenExchangeUrl();
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      clientId,
      redirectUri,
      // Note: codeVerifier not needed for OAuth Apps (only for GitHub Apps with PKCE)
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Token exchange failed: ${error.error || error.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }
  
  // Clear stored state after successful exchange
  clearOAuthState();
  
  return data;
}

/**
 * Verify OAuth callback state parameter
 */
export function verifyState(receivedState: string): boolean {
  const storedState = retrieveOAuthState();
  if (!storedState) {
    return false;
  }
  
  return storedState.state === receivedState;
}

/**
 * Get GitHub OAuth redirect URI
 */
export function getRedirectUri(): string {
  // For development, use the current origin
  // In production, this should be configured in environment variables
  const origin = window.location.origin;
  return `${origin}/oauth/github/callback`;
}

/**
 * Parse OAuth callback URL parameters
 */
export interface OAuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export function parseCallbackParams(url: string): OAuthCallbackParams {
  const urlObj = new URL(url);
  const params = new URLSearchParams(urlObj.search);
  
  return {
    code: params.get('code') || undefined,
    state: params.get('state') || undefined,
    error: params.get('error') || undefined,
    error_description: params.get('error_description') || undefined,
  };
}

/**
 * Test GitHub API access with token
 */
export async function testGitHubToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${GITHUB_API_BASE_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch GitHub user information
 */
export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(`${GITHUB_API_BASE_URL}/user`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Revoke GitHub OAuth token
 * 
 * Delegates to server route since revocation requires client_secret
 * which must never be exposed to the browser.
 */
export async function revokeGitHubToken(accessToken: string): Promise<void> {
  const origin = window.location.origin;
  const revokeUrl = `${origin}/api/github/revoke`;
  
  const response = await fetch(revokeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: accessToken }),
  });
  
  if (!response.ok && response.status !== 404) {
    // 404 means token already revoked, which is fine
    const errorText = await response.text().catch(() => 'Token revoke failed');
    throw new Error(errorText);
  }
}
