---
name: codex-oauth-integration
description: Implement, audit, or troubleshoot a secure Codex and ChatGPT account OAuth connection in an application, including PKCE, token lifecycle, provider separation, capability discovery, and verification. Use when a user asks to connect their ChatGPT or Codex account, not for API-key-only OpenAI integrations.
metadata:
  short-description: Secure Codex OAuth integrations
---

# Codex OAuth Integration

Build a real, secure account-connection feature. The goal is not merely to make an authorization page open. A complete integration has an authorized client, exact redirect handling, PKCE, protected refresh tokens, clear re-authentication behavior, live capability discovery, and user-visible recovery paths.

## Establish the authorization boundary first

Do this before writing OAuth code or promising that a ChatGPT subscription can power the application:

1. Find current official OpenAI documentation for the requested Codex sign-in or developer integration surface.
2. Identify the OAuth client registration that belongs to the application. Confirm its client ID, redirect URIs, allowed grant types, scopes, token endpoint, and any documented resource APIs.
3. Confirm that the intended account type, workspace, plan, and region may use the requested feature.

Do not reuse a client ID, scope set, redirect URI, browser parameters, internal endpoint, model catalog, or token claim copied from another OpenAI client. That is not the application's authorization grant, is not a public compatibility contract, and can fail or create a security problem. If OpenAI has not provisioned a supported OAuth client and resource API for the product being built, say so plainly. Offer an OpenAI API-key integration as a separate supported path when it fits the product.

Codex account access and OpenAI API billing are separate provider paths. Never infer that one supplies the other, and never imply that account sign-in includes images, audio, every model, or direct API access.

Read [authorization-boundary.md](references/authorization-boundary.md) for the decision record, research checklist, and public communication guidance.

## Choose the integration topology deliberately

Use Authorization Code with PKCE for native apps, SPAs with a trusted backend, and browser-initiated desktop flows. Keep the exchange and refresh-token storage on a trusted server or native secure store.

- A browser-only application must not retain refresh tokens in `localStorage`, session storage, IndexedDB, query strings, logs, analytics, or error reports.
- For a desktop app, a loopback callback can be appropriate only when the browser and app run on the same machine. Bind the listener to loopback, choose the registered redirect exactly, validate every callback, and stop the listener on success, failure, expiry, or shutdown.
- For a web app, use an HTTPS callback controlled by the application. Associate the authorization attempt with the authenticated application user server-side.
- Open a sign-in popup or external browser during the user click gesture. Do not navigate the Settings page away merely to begin authorization. Detect popup blocking and show a concrete recovery message.

Read [implementation.md](references/implementation.md) before writing or changing the flow.

## Required behavior

Implement these as a single coherent feature:

1. Generate a high-entropy `state`, PKCE verifier, and S256 challenge for every attempt. Store the verifier and state server-side with the intended redirect URI, user/session binding, creation time, and a short expiry. It must be one-time use.
2. Start listening or register the pending callback before returning the authorization URL. If a loopback port cannot bind, fail before opening the browser and explain how to resolve the conflict.
3. On callback, reject the wrong method, path, missing parameters, provider error, expired state, repeated callback, or state mismatch. Compare state values in constant time when the runtime supports it. Delete pending state before or atomically with completion so it cannot be replayed.
4. Exchange the code only at the documented token endpoint using the original verifier and exact redirect URI. Treat the authorization code, verifier, access token, refresh token, ID token, and raw error bodies as secrets.
5. Store tokens in a dedicated encrypted credential store, separate from ordinary preferences. Use authenticated encryption with a securely managed application secret or operating-system key store. Return only non-secret status and capability fields to the browser.
6. Refresh before expiry with a small safety window. Preserve a refresh token when the provider omits a replacement. On an unrecoverable refresh failure, remove the invalid credentials, surface `needsReauth`, and require an intentional reconnect.
7. Disconnect locally deletes every token and pending authorization record, closes any temporary listener, clears cached provider capabilities, and explains any separate upstream revocation the user must perform.
8. Fetch models and capabilities from the provider's documented live catalog when available. Do not ship a fake default list. Persist a selected model only with its provider identity, and invalidate or prompt for a replacement when it disappears.

## Provider mixing and capability gates

When an application supports both Codex account connection and OpenAI API keys:

- Model IDs are provider-qualified data, not globally interchangeable strings. Store `{ provider, modelId }` or an equivalent unambiguous representation.
- Keep live catalogs visually and logically separated. Fetch each only when its credential exists. An unavailable provider produces an empty group, not guessed models.
- Gate every feature by the selected provider's verified capabilities. Do not enable image generation, audio, file processing, tool features, or a model selector simply because some other provider is connected.
- Disable the assistant everywhere when no usable provider, selected model, and required master setting are present. Enforce the same rule on the server, not only in the UI.
- A subscription-oriented response service may require streaming, a provider-specific input shape, and provider-specific tool-call events. Parse Server-Sent Events as framed events, buffer partial chunks, handle terminal error and incomplete events, and use only a documented event contract.

## Security, quality, and handoff

Read [security-and-verification.md](references/security-and-verification.md) before implementation is considered complete. It covers encrypted storage, migration of legacy plaintext, HTTP transport, logs, tests, runtime verification, and the exact questions to answer in a user-facing handoff.

Never claim a model, entitlement, endpoint, scope, rate limit, or modality is supported because it worked for one account. Verify it from current official documentation and the signed-in user's live capability response.
