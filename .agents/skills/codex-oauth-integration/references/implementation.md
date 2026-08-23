# Implementation Blueprint

## Data model

Keep secrets out of the normal settings model and API response shape.

```ts
type Provider = 'codex-account' | 'openai-api';

interface PendingAuthorization {
  userId: string;
  state: string;
  verifier: string;
  redirectUri: string;
  createdAt: number;
  expiresAt: number;
}

interface OAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountId?: string;
}

interface ModelSelection {
  provider: Provider;
  modelId: string;
}

interface ProviderStatus {
  connected: boolean;
  needsReauth: boolean;
  expiresAt: number | null;
  capabilities: string[];
}
```

Encrypt `OAuthCredentials` as a single authenticated payload. Keep an encryption-format version so credentials can be rotated without guessing their format. Never place those fields in a general `GET /settings` response.

## Start authorization

```text
require an authenticated application user
verify the configured OAuth client is supported for this application
create 32 or more cryptographically random bytes for state
create an RFC 7636 verifier and S256 challenge
choose the exact registered redirect URI
persist a pending, one-time authorization bound to the user and expiring soon
for a loopback flow, bind the listener before returning the authorization URL
return the URL only, never verifier or tokens
```

Use URL construction APIs, not string concatenation. Send the OAuth provider only the documented parameters. Keep state in the server-side pending record rather than a browser-readable cookie when a backend exists.

## Complete authorization

```text
receive callback
require the exact expected method and path
check provider error parameters first
load and consume the pending authorization atomically
reject missing, expired, cross-user, or mismatched state
exchange code with grant_type=authorization_code, original verifier, and exact redirect URI
validate the response shape and expiry
encrypt and save credentials for the bound user
clear stale capability and model caches
return a minimal success page or redirect
close temporary callback listener
```

Do not accept a callback merely because it contains a code. The `state` check is the binding between the authorization response and the attempt that initiated it.

## Refresh and reauthentication

Refresh when remaining lifetime is below a conservative safety threshold. Serialize concurrent refreshes for one credential, otherwise multiple requests can race and invalidate a refresh-token rotation.

```text
if no credentials: provider unavailable
if token is comfortably valid: use it
if a refresh is already running: await it
refresh with the documented grant
on success: atomically replace encrypted credentials and expiry
on permanent authorization failure: delete credentials, clear caches, set needsReauth
on transient failure: preserve credentials, return a retryable provider-unavailable error
```

Do not assume a refresh response always includes a new refresh token. Retain the old token only when the provider's documented behavior permits it.

## Browser and desktop UX

- Create the popup or external-browser window synchronously in the click handler, then replace its initial blank location after the server returns the authorization URL.
- If the popup cannot open, leave the app page in place and explain the browser permission needed.
- Poll or subscribe to a status endpoint after initiating authorization. Do not expose callback tokens to the application page.
- Show distinct states: not connected, connecting, connected, expiring soon, reconnect required, and provider temporarily unavailable.
- Do not display stored secrets. A replacement credential field starts empty, even after a successful connection.

## Live catalogs and requests

Only call a documented model or capability catalog with the credential type it expects. Cache results briefly and invalidate after connect, refresh, disconnect, authorization failure, or a provider error that indicates access changed.

Persist a model selection with its provider. Before every request, verify that the provider connection exists, the application master setting is enabled, the selected model is still in the current catalog, and the requested capability is allowed. Server-side checks are mandatory.

For streaming responses, implement a real SSE decoder:

```text
append each byte chunk to a buffer
split complete event frames, retaining incomplete trailing data
parse event and data lines according to SSE framing
handle the documented completed-text and completed-tool-call events
handle failure, incomplete, cancellation, timeout, and malformed-event paths
do not mark a request successful until a terminal success event arrives
```
