# OAuth/GitHub Integration — Triage & Fix Plan

This document identifies concrete issues in the current GitHub OAuth implementation, pinpoints the files involved, and provides exact changes to implement. It is written for a new contributor who will make the fixes.

---

## Overview of Issues

1. **Incorrect authentication for GitHub token revocation**

   * **Files:** `github.ts` (client) and server token proxy (`token.ts` / server route)
   * **Problem:** Revocation calls GitHub’s `/applications/{client_id}/token` with `client_id:access_token` instead of `client_id:client_secret` Basic auth, and it is attempted from the client (where the secret must not exist).
   * **Fix:** Move revocation to the server-only route and authenticate with `client_id:client_secret`. Never expose the secret to the browser.

2. **Risk of double token exchange (duplicate callback handling)**

   * **Files:** `GitHubAdapter.ts`, any callback listener in `IntegrationContext.tsx`
   * **Problem:** The popup/callback message handler can fire twice (e.g., HMR or route effects), causing the same auth `code` to be exchanged again and returning `invalid_grant`.
   * **Fix:** Add a one-shot guard (boolean “settled” flag), remove event listeners after resolve, and close the popup reliably.

3. **Redirect URI equality not strictly enforced**

   * **Files:** `GitHubAdapter.ts`, `IntegrationContext.tsx`, server token proxy (`token.ts`)
   * **Problem:** `redirect_uri` used in the **authorize** step must match byte-for-byte the value sent to the **token** endpoint and the value configured in GitHub OAuth App settings. Mismatches (port/host/trailing slash) produce `invalid_grant`.
   * **Fix:** Centralize `getRedirectUri()` and ensure the same value is included in both the authorize URL and the token exchange body. Verify app settings match exactly.

4. **CORS too broad on token proxy**

   * **Files:** server token proxy (`token.ts` or equivalent)
   * **Problem:** `Access-Control-Allow-Origin: *` allows any origin to hit the exchange endpoint.
   * **Fix:** Restrict CORS to the known site origins in production.

5. **Logging not surfacing GitHub’s error JSON**

   * **Files:** server token proxy (`token.ts`)
   * **Problem:** Failures return a 400 without printing GitHub’s structured error payload (`bad_verification_code`, `redirect_uri_mismatch`, etc.).
   * **Fix:** Log and forward a safe subset of GitHub’s error JSON to aid debugging.

---

## Detailed Fixes by File

### 1) `github.ts` (client) — Remove client-side revocation

**What’s wrong:**
Client attempts to revoke by calling:

```
DELETE https://api.github.com/applications/{client_id}/token
Authorization: Basic base64(client_id:access_token)  // ← incorrect and insecure
```

GitHub requires **Basic base64(client_id:client_secret)** and this must be done server-side only.

**What to change:**

* Remove or refactor the client function `revokeGitHubToken` so it calls your **server** revoke route and **never** handles secrets directly.
* If no server revoke route exists, create one (see `token.ts` changes below).

**Patch (client pseudo-diff):**

```diff
- export async function revokeGitHubToken(accessToken: string) {
-   const credentials = btoa(`${clientId}:${accessToken}`);
-   const res = await fetch(`https://api.github.com/applications/${clientId}/token`, {
-     method: 'DELETE',
-     headers: {
-       'Authorization': `Basic ${credentials}`,
-       'Accept': 'application/vnd.github.v3+json',
-       'Content-Type': 'application/json',
-     },
-     body: JSON.stringify({ access_token: accessToken }),
-   });
-   if (!res.ok) throw new Error('Failed to revoke GitHub token');
- }
+ // Delegate to server route (no secrets in the browser)
+ export async function revokeGitHubToken(accessToken: string) {
+   const res = await fetch('/api/github/revoke', {
+     method: 'POST',
+     headers: { 'Content-Type': 'application/json' },
+     body: JSON.stringify({ access_token: accessToken }),
+     credentials: 'include',
+   });
+   if (!res.ok) {
+     const msg = await res.text().catch(() => 'Token revoke failed');
+     throw new Error(msg);
+   }
+ }
```

---

### 2) `token.ts` (server) — Add proper revoke endpoint and improve exchange logging/CORS

**What to add (new revoke route):**

* **Route:** `POST /api/github/revoke`
* **Auth:** `Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)`
* **Endpoint:** `https://api.github.com/applications/{CLIENT_ID}/token`
* **Body:** `{ "access_token": "<user_access_token>" }`

**What to change (existing token exchange route):**

* Ensure `Accept: application/json` and log GitHub’s error JSON on non-200.
* Restrict CORS in production to known origins.

**Patch (server pseudo-code additions):**

```ts
// helpers
function basic(clientId: string, clientSecret: string) {
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

// CORS (example)
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? ['https://your.app', 'https://staging.your.app']
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

// In your request handler: set CORS to the specific Origin if in list
// e.g., res.setHeader('Access-Control-Allow-Origin', originIfAllowed)

// ===== Token Exchange (existing) =====
app.post('/api/github/token', async (req, res) => {
  try {
    const { code, clientId, redirectUri, codeVerifier } = req.body;
    const ghRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        code,
        redirect_uri: redirectUri,      // must match authorize step
        code_verifier: codeVerifier,    // if PKCE used in authorize
      }),
    });
    const json = await ghRes.json();
    if (!ghRes.ok || (json && json.error)) {
      console.error('[GitHub] token error', ghRes.status, json);
      return res.status(400).json({
        error: json?.error || 'token_exchange_failed',
        error_description: json?.error_description || 'GitHub token exchange failed',
      });
    }
    return res.json(json);
  } catch (e: any) {
    console.error('[GitHub] token exchange exception', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ===== Revoke (NEW) =====
app.post('/api/github/revoke', async (req, res) => {
  const access_token = req.body?.access_token;
  if (!access_token) return res.status(400).json({ error: 'missing_access_token' });

  const CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
  try {
    const ghRes = await fetch(`https://api.github.com/applications/${CLIENT_ID}/token`, {
      method: 'DELETE',
      headers: {
        'Authorization': basic(CLIENT_ID, CLIENT_SECRET),
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token }),
    });
    if (ghRes.status !== 204) {
      const text = await ghRes.text();
      console.error('[GitHub] revoke error', ghRes.status, text);
      return res.status(400).json({ error: 'revoke_failed' });
    }
    return res.status(204).end();
  } catch (e: any) {
    console.error('[GitHub] revoke exception', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});
```

**CORS tightening (example):**

```ts
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,DELETE');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});
```

---

### 3) `GitHubAdapter.ts` — One-shot popup message handling & redirect URI usage

**What to change:**

* Add a guard (`settled`) in the message handler so code is exchanged once.
* Ensure `window.removeEventListener('message', ...)` and `popup.close()` are called after success/failure.
* Make sure the **same** `redirectUri` constant is used when building the authorize URL and when sending the body to `/api/github/token`.

**Patch (pseudo-diff):**

```diff
- window.addEventListener('message', handleMessage);
+ let settled = false;
+ const handleMessage = (event: MessageEvent) => {
+   if (settled) return;
+   // validate event.origin and event.data...
+   if (/* has code */) {
+     settled = true;
+     window.removeEventListener('message', handleMessage);
+     try {
+       // call /api/github/token with { code, clientId, redirectUri, codeVerifier }
+     } finally {
+       try { popup?.close(); } catch {}
+     }
+   }
+ };
+ window.addEventListener('message', handleMessage);
```

Also verify you are using a single `const REDIRECT_URI = getRedirectUri()` and passing it:

* In the authorize URL (as `redirect_uri`),
* In the token exchange body sent to your server proxy,
* And that it matches the GitHub OAuth App’s “Authorization callback URL”.

---

### 4) `IntegrationContext.tsx` — Single source of truth for `redirect_uri`

**What to change:**

* Export a single `getRedirectUri()` and reuse it in both the authorize step and token exchange call sites.
* Avoid environment-dependent drift (localhost vs 127.0.0.1; trailing slash).

**Example:**

```ts
export function getRedirectUri() {
  // Keep this consistent across the app and server config
  return `${window.location.origin}/oauth/github/callback`;
}
```

---

### 5) `token.ts` (server) — Include `redirect_uri` and `code_verifier` correctly

**What to verify:**

* If the authorize step used `redirect_uri` and PKCE (`code_challenge`), the token exchange must include `redirect_uri` and `code_verifier` respectively.
* You’re already sending JSON with `Accept: application/json` (OK for GitHub OAuth Apps).

---

## Testing Checklist

1. **Fresh end-to-end sign-in**

   * Clear session storage/cookies for the site.
   * Start the flow, complete authorization, and confirm token exchange succeeds.
   * Ensure the popup closes and the message listener is removed.

2. **Duplicate callback prevention**

   * Manually trigger any rerender/HMR while on callback. Verify no second token exchange occurs and no `invalid_grant` appears.

3. **Redirect URI equality**

   * Confirm these three values are **exactly the same**:

     * GitHub App settings → “Authorization callback URL”
     * `redirect_uri` in authorize URL you open in the popup
     * `redirect_uri` in the body to `/api/github/token`

4. **Revoke flow**

   * Acquire a token, call `/api/github/revoke` (server). Expect **204 No Content** from your server.
   * In GitHub → Settings → Applications → Authorized OAuth Apps, confirm the app no longer shows as authorized (or test that subsequent API calls with the token fail).

5. **Server logs**

   * On any failure, verify the server logs include the GitHub error JSON (e.g., `bad_verification_code`, `redirect_uri_mismatch`).

6. **CORS**

   * In production, requests from unapproved origins should be blocked (check `Access-Control-Allow-Origin` response header).

---

## Command-line sanity test (isolates app issues)

After obtaining a **fresh** `code` from the authorize step (and having the original PKCE `code_verifier`), test the exchange directly:

```bash
curl -X POST https://github.com/login/oauth/access_token \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "YOUR_CLIENT_ID",
    "code": "THE_CODE_FROM_CALLBACK",
    "redirect_uri": "http://localhost:5173/oauth/github/callback",
    "code_verifier": "THE_ORIGINAL_CODE_VERIFIER"
  }'
```

* If this succeeds, issues likely reside in the app’s callback handler (double-fire) or payload formatting.
* If this fails, check `redirect_uri` and app configuration.

---

## Environment Notes

* **Secrets:** `GITHUB_CLIENT_SECRET` must never be sent to or used in the browser. Keep it server-side (Cloudflare Worker, API route, etc.).
* **Frontend `.env` (Vite):** values needed in the browser must be `VITE_*`. Do **not** place secrets there.
* **Multiple environments:** Ensure the **same** `client_id` that initiated authorization is used during token exchange; do not mix dev/prod app credentials.

---

## Summary of Required Changes

* Move GitHub token **revocation** to a **server** route using `client_id:client_secret` Basic auth. Remove client-side revocation calls to GitHub.
* Add **one-shot** guard and cleanup to the popup/callback message handling to prevent **double exchange**.
* Enforce **byte-for-byte identical** `redirect_uri` across authorize, token exchange, and GitHub App settings.
* Tighten **CORS** for the token proxy in production.
* Log and surface **GitHub error JSON** in token exchange failures to speed up debugging.

Implementing the above will eliminate the `invalid_grant` caused by reused/expired codes or redirect mismatches and will secure the revocation flow according to GitHub’s OAuth requirements.
