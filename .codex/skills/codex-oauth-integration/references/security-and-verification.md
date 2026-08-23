# Security and Verification

## Credential handling

- Require HTTPS for every non-loopback application route. HTTP does not protect an API key or authorization code in transit.
- Use secure, HttpOnly, same-site application sessions. OAuth callback state is not a replacement for application authentication.
- Encrypt provider secrets at rest with authenticated encryption, a random nonce or IV per encryption, and a key held outside the database. Prefer an operating-system key store or managed secret service when available.
- Separate secrets from ordinary settings, configuration exports, diagnostics, analytics, error payloads, OpenAPI examples, and browser state.
- Redact authorization headers, form bodies, query parameters containing codes, tokens, keys, and refresh responses before logging.
- Restrict callback listeners to loopback for desktop flows. Do not bind them to all interfaces.
- Set short pending-authorization TTLs, use one-time records, rate-limit start attempts, and protect the start route with the application's normal authorization controls.

## Legacy plaintext migration

When replacing plaintext storage:

1. Read the legacy value only on the trusted side.
2. Write the encrypted replacement and a cleanup-pending marker transactionally.
3. Remove the plaintext field from the logical settings record.
4. Checkpoint and rebuild the active database when the store format needs it. SQLite does not normally erase deleted content, and WAL files can retain prior frames. A database rewrite can remove the value from the active database and WAL, but it cannot erase old filesystem snapshots, backups, disks, or logs.
5. Keep the cleanup marker until the checkpoint and rebuild finish. If blocked by another database user, preserve the marker, report the condition without secrets, and retry at a controlled time.
6. Tell operators to protect or remove backups made before migration.

Never describe ordinary database deletion as cryptographic erasure.

## Tests that matter

Write tests for these observable guarantees:

- authorization URL has a unique high-entropy state, S256 challenge, exact redirect URI, and only documented parameters;
- pending state expires, is one-time, is user-bound, and rejects mismatch or replay;
- callback rejects an incorrect path, method, missing code, provider error, expired state, and token-exchange failure;
- refresh happens before expiry, survives concurrent requests, handles token rotation, and transitions to re-authentication on permanent failure;
- raw persisted records do not contain fixture access tokens, refresh tokens, or keys;
- legacy records migrate to encrypted storage and no longer appear in the active database or WAL after cleanup;
- settings, availability, model-catalog, diagnostics, and error responses do not include secrets;
- no fallback models appear without a successful live catalog fetch;
- provider A cannot use provider B's model selection or capability;
- assistant and gated features reject direct server requests when no valid provider and selected model exist;
- disconnect removes local tokens, pending state, and cached capabilities.

## Runtime verification checklist

Use a real authorized account only after automated tests pass. Inspect network traffic without recording sensitive request bodies.

1. Begin sign-in and confirm the product page remains open while the dedicated authorization window opens.
2. Complete sign-in, confirm the callback is accepted once, and confirm the temporary listener closes.
3. Reload the app and confirm the connected state returns without exposing a token.
4. Force near-expiry or use a controlled test credential to verify refresh behavior.
5. Disconnect and confirm UI state, server authorization, cached models, and gated actions are all removed.
6. Verify model groups, capability gates, and a real text request for each configured provider separately.
7. Verify HTTPS in any non-local deployment and inspect browser console and relevant network status for errors.

## Handoff report

State exactly:

- which official authorization contract and client registration were used;
- which account types and capabilities were confirmed, and which were not;
- how credentials are encrypted and where the encryption key is managed;
- whether existing plaintext credentials and backup copies were migrated or require operator action;
- the selected-model persistence behavior and capability gates;
- automated tests and real-account flows run;
- any runtime, provider, entitlement, or deployment limitation still open.
