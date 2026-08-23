# Authentication — Codex App Server + ChatGPT

This is the part where mistakes actually matter: token handling, what "connect
ChatGPT" is allowed to mean, and what your app must never do. Read this fully
before wiring up login.

## Don't confuse these two things

- **"Sign in with ChatGPT"** — a generic identity/auth mechanism. On its own it
  does not grant arbitrary OpenAI API access and does not let an app consume a
  user's ChatGPT subscription through `/v1/responses`.
- **Codex App Server's managed ChatGPT authentication** — what this skill
  covers. Your app talks to `codex app-server`, which owns the OAuth
  relationship with ChatGPT and exposes AI functionality through its own
  JSON-RPC methods (`thread/*`, `turn/*`). Your app never talks to the ChatGPT
  OAuth access token directly.

Also worth knowing (context, not something you need to build against): Codex's
own sign-in method affects governance downstream. Signing in with ChatGPT
means Codex usage follows the user's ChatGPT workspace permissions, RBAC, and
(for Enterprise) retention/residency settings; an API key instead follows the
API organization's own retention and data-sharing settings. You don't need to
implement anything for this — it's useful only for explaining to a user why
"connect ChatGPT" might behave differently under a managed workspace.

## Supported auth modes

Codex's `AuthMode` supports:

```json
{ "type": "chatgpt" }
```
Browser-based, Codex-managed ChatGPT OAuth. **This is the default choice for
this skill.**

```json
{ "type": "chatgptDeviceCode" }
```
Device-code flow: no local browser needed. Codex returns a `loginId` plus a
`verificationUrl` and `userCode` immediately, then completes the login
asynchronously in the background (same underlying polling flow the CLI uses).
Good fit for headless machines, remote/SSH sessions, or any UI that can't pop
a browser. Successful device-code login resolves to ordinary `chatgpt` auth
and still completes through the normal `account/login/completed` /
`account/updated` notifications — you don't need separate handling once it's
started.

```json
{ "type": "apiKey", "apiKey": "..." }
```
Optional fallback if you want to support bring-your-own-key alongside
ChatGPT login.

### Forbidden: `chatgptAuthTokens`

The protocol technically has a login mode that accepts a raw access token
directly (`chatgptAuthTokens` / equivalent `ChatgptAuthTokensLoginAccountParams`
shapes you may see in generated schemas). **Do not build against this for a
normal third-party app.** OpenAI marks it unstable and for internal use. Never:

- extract an access token from Codex-managed auth and feed it back in via this path,
- read tokens out of `auth.json` or the OS credential store and reuse them yourself,
- log, display, or transmit these tokens anywhere (including your own backend).

Codex owns OAuth authorization, token persistence, refresh tokens, token
refresh, account selection, and the whole authentication lifecycle. Your app's
job is UI plus JSON-RPC calls — nothing more.

## Checking existing authentication

Before showing a "Connect ChatGPT" button, check whether the user is already
authenticated:

```json
{ "method": "account/read", "id": 2, "params": { "refreshToken": false } }
```

The result tells you whether there's no account, an API-key account, or a
ChatGPT account (with `email` and `planType` when ChatGPT-authenticated).
Treat `planType` as **informational UI metadata only** — don't gate
authorization decisions on it; Codex/OpenAI enforce actual entitlements
server-side.

UI sketch:

```text
Not connected:              Connected:
┌───────────────────────┐   ┌───────────────────────┐
│ ChatGPT                │   │ ChatGPT                │
│ Not connected           │   │ jane@example.com       │
│                         │   │ Plus                   │
│ [ Connect ChatGPT ]     │   │ Connected ✓            │
└───────────────────────┘   └───────────────────────┘
```

## Starting login

```json
{ "method": "account/login/start", "id": 3, "params": { "type": "chatgpt" } }
```

Result contains `type`, `loginId`, and `authUrl`. Open `authUrl` in the user's
**normal system browser** — for Node desktop apps use the platform's default
browser API; for Tauri, the supported shell/opener plugin. Never embed a login
form in your own UI and never ask for the user's ChatGPT password — the user
authenticates directly with OpenAI in their browser.

For device code instead:

```json
{ "method": "account/login/start", "id": 3, "params": { "type": "chatgptDeviceCode" } }
```

Result includes `loginId` plus `verificationUrl` and `userCode` — show these
directly in your UI ("Go to `verificationUrl` and enter code `userCode`").

## Waiting for completion

Track the `loginId` from the start call. Listen for:

- `account/login/completed` — match `loginId` against your pending login;
  payload indicates success/failure.
- `account/updated` — fires with fresh account state (`authMode`, `planType`,
  etc.) after a successful login; use this to refresh UI immediately.

After a successful `account/login/completed`, call `account/read` again and
treat that as the canonical state rather than trusting cached fields.

## Cancellation and logout

```json
{ "method": "account/login/cancel", "id": 4, "params": { "loginId": "..." } }
```
Use this if the user backs out of a login mid-flow — don't leave abandoned
login attempts running.

```json
{ "method": "account/logout", "id": 5 }
```
After logout: clear your app's own cached account metadata and reset the
connection UI. **Do not** manually delete Codex's credential files
(`auth.json` or OS credential store entries) unless official docs specifically
tell you to for a particular recovery scenario — that's Codex's data to own.

## Security boundary (the part to actually enforce in code review)

```text
Application
    ↓ (JSON-RPC only)
Codex protocol
    ↓
Codex owns ChatGPT credentials, refresh, lifecycle
```

Never:
- read Codex refresh/access tokens from disk or the OS keychain,
- log access tokens (including in crash reports or telemetry),
- expose tokens to frontend/renderer code in an Electron/Tauri app,
- send Codex credentials to your own application backend,
- store OAuth tokens in your own database,
- call private/undocumented ChatGPT endpoints as a shortcut around the protocol.

For Electron/Tauri specifically: keep all Codex JSON-RPC communication in the
privileged main/backend process. Expose only a narrow, purpose-built IPC
surface to the untrusted renderer — e.g. `connectChatGPT()`,
`disconnectChatGPT()`, `getAIAccount()`, `createConversation()`,
`sendMessage()`, `cancelTurn()` — never raw JSON-RPC pass-through.

## Product copy guidance

Say:
```text
Connect your ChatGPT account to use supported Codex AI features without
entering an API key.
```
```text
Use AI through your connected ChatGPT/Codex account, subject to your plan's
available features and usage limits.
```

Don't say:
```text
Unlimited AI
Free OpenAI API
Use your ChatGPT subscription as API credits
```
These are inaccurate and will generate support tickets when usage limits hit.

## Command-line context you may encounter (not something you build, just useful for support/debug)

Users may already be signed in via the Codex CLI itself (`codex login`, or
choosing "Sign in with ChatGPT" in the TUI), with credentials cached in
`~/.codex/auth.json` or the OS credential store. Codex auto-refreshes ChatGPT
tokens during active use. A user can also force `preferred_auth_method` in
`~/.codex/config.toml` to `"chatgpt"` (default) or `"apikey"` — this affects
which auth Codex prefers when both exist, and can explain support cases where
a user "logs in" but the app still seems to use an API key. Your app doesn't
need to manipulate this config directly; `account/read` reflects the resolved
state either way.
