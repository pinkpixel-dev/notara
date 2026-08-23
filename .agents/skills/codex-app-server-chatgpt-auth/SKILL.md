---
name: codex-app-server-chatgpt-auth
description: Build apps that let a user connect their ChatGPT account and use Codex-powered AI features without an OpenAI API key, by driving the official codex app-server JSON-RPC protocol (initialize, account/login/start with type "chatgpt" or "chatgptDeviceCode", thread/start, turn/start, streaming item/* events). ALWAYS use for "sign in with ChatGPT", "connect ChatGPT account", "use my ChatGPT subscription instead of an API key", "Codex app-server", "codex app-server JSON-RPC", "spawn codex app-server", "codex login flow in my app", "OAuth with Codex/ChatGPT", or adding AI chat/agent features to a desktop app (Electron, Tauri, Node.js, VS Code/JetBrains extension) backed by a user's ChatGPT/Codex login rather than a raw API key. Also trigger for app-server JSON-RPC errors, thread/turn lifecycle issues, streaming agent-message deltas, approval/elicitation flows, or account/login/completed handling. Do NOT use for the plain OpenAI API or generic identity-only "Sign in with ChatGPT" flows that don't involve Codex.
---

# Codex App Server — ChatGPT-Account Auth Integration

## What this is for

This skill covers building the **"Connect ChatGPT"** experience: an app lets a
user log in with their existing ChatGPT account (Plus/Pro/Team/Enterprise) and
then get Codex-powered AI features — without the user ever touching an OpenAI
API key. Under the hood, the app talks to the **Codex App Server**, a
long-lived local process that exposes a bidirectional JSON-RPC 2.0 protocol.
Codex itself owns the OAuth flow, token storage, and refresh; your app only
ever talks JSON-RPC to Codex.

Read `references/protocol.md` before implementing any wire-level detail — it's
the full method/notification reference and is more authoritative than
paraphrasing it here.

## The one rule that matters most

```text
Application  →  JSON-RPC  →  codex app-server  →  ChatGPT managed OAuth  →  OpenAI
```

Your app **never**:
- extracts, reads, logs, or reuses Codex's OAuth/refresh tokens (`auth.json`, OS credential store),
- calls undocumented ChatGPT web endpoints,
- treats "Sign in with ChatGPT" (generic identity) as equivalent to Codex-managed ChatGPT auth (it is not — identity login does not grant `/v1/responses` access),
- uses the `chatgptAuthTokens` login mode (internal/unstable, not for third-party apps),
- claims a connected ChatGPT account equals "unlimited AI" or "free OpenAI API access." It's subject to the user's plan and usage limits.

Codex owns: OAuth authorization, token persistence/refresh, account selection,
auth lifecycle. Your app owns: UI, process lifecycle, and JSON-RPC
communication with Codex. See `references/authentication.md` for the full
security boundary and forbidden patterns.

## Where this fits architecturally

Codex App Server needs a real local process, so this pattern fits:

- Desktop apps (Electron, Tauri), local Node.js/CLI tools, IDE extensions.

It does **not** fit a plain static/browser-only web app — you can't spawn
`codex app-server` from a browser tab, and you should never shuttle a user's
locally-managed Codex OAuth credentials to a remote server as a workaround.
For server-side or CI automation without a UI login, point the user at the
**Codex SDK** instead (different skill/tool — mention it, don't build it here).

## Implementation workflow (high level)

1. **Detect or launch Codex.** Spawn `codex app-server` as a child process
   (stdio transport is the natural fit for desktop apps) or connect to an
   already-running instance over its Unix socket / WebSocket listener.
   Handle "Codex not found" gracefully — this is a common first-run failure.
2. **Build a JSON-RPC client.** Track pending requests by id, route
   notifications separately from responses, support server-initiated requests
   (approvals, elicitations). See `references/typescript-implementation.md`
   for a concrete client shape.
3. **Initialize.** Send `initialize` with `clientInfo`, then `initialized`.
   Nothing else works until this handshake completes.
4. **Check existing auth.** Call `account/read` before showing any login UI —
   the user may already be connected.
5. **Log in.** `account/login/start` with `{"type": "chatgpt"}` (opens a
   browser to the returned `authUrl`) or `{"type": "chatgptDeviceCode"}`
   (returns `verificationUrl` + `userCode` for headless/remote UX). Listen for
   `account/login/completed` matched by `loginId`, then refresh state via
   `account/updated` / `account/read`.
6. **Create a thread, start a turn.** `thread/start` → `turn/start` with
   `input: [{"type": "text", "text": "..."}]`.
7. **Stream the response.** Route `item/started`, `item/agentMessage/delta`,
   `item/completed`, and `turn/completed` — plus whatever else the turn
   produces (commands, file changes, tool calls, approvals). Don't assume
   every notification is plain text.
8. **Handle the edges.** Codex-unavailable, not-logged-in, expired auth,
   usage-limit-reached, app-server crash/restart. See
   `references/ux-and-fallbacks.md`.

For the **minimum viable slice**, only implement:
`initialize` / `initialized` / `account/read` / `account/login/start` /
`account/login/completed` / `account/updated` / `account/logout` /
`thread/start` / `turn/start` / agent-message streaming / `turn/completed`.
Don't reach for approvals, MCP, skills-within-Codex, or process control until
the basic connect → chat loop is solid and the user actually needs them.

## Reference files — read before you build

- **`references/authentication.md`** — auth modes (`chatgpt`, `chatgptDeviceCode`,
  `apiKey`; forbidden `chatgptAuthTokens`), the full login/logout sequence,
  account state shape, security boundary, and what NOT to do. Read this first,
  always — auth mistakes here are the ones with real consequences.
- **`references/protocol.md`** — the full JSON-RPC surface: initialization and
  capability opt-in, threads (`start`/`resume`/`fork`/`list`/`archive`/etc.),
  turns (`start`/`steer`/`interrupt`), the item type union and their delta
  events, approvals and elicitations, errors, apps/connectors, and skills.
  Treat method names here as versioned — re-check current docs before
  shipping if this skill feels stale (protocol evolves fast; `codex app-server
  generate-ts --out ./schemas` / `generate-json-schema` gives you a
  version-exact schema straight from the user's installed binary).
- **`references/typescript-implementation.md`** — recommended file layout
  (`CodexProcess`, `CodexRpcClient`, `CodexAuth`, `CodexProvider`), a fleshed
  out `AIProvider` abstraction so Codex isn't hard-wired into the UI, and
  Electron/Tauri process-boundary guidance (keep Codex communication in the
  privileged main/backend process; expose a narrow IPC surface like
  `connectChatGPT()` / `sendMessage()` to the renderer).
- **`references/ux-and-fallbacks.md`** — user-facing copy guidance ("Connect
  ChatGPT" not "Configure Codex OAuth"), accurate claims about what a
  connected account gives you, and graceful handling for every failure mode
  (Codex missing, not logged in, auth expired, rate-limited, server died).

## Agent checklist before calling this done

- [ ] Codex launches, `initialize`/`initialized` handshake completes.
- [ ] Existing ChatGPT auth is detected via `account/read` before showing a login button.
- [ ] Login opens the real OpenAI authorization URL (or shows the device code) — no custom login form, no password field.
- [ ] `account/login/completed` / `account/updated` correctly update app state; cancellation and failure are both handled.
- [ ] Logout clears app-level account state without touching Codex's credential files directly.
- [ ] A thread can be created, a turn started, and the assistant reply streams incrementally (not just on `turn/completed`).
- [ ] Non-text turn events (commands, file changes, approvals) are routed through a real switch/dispatch, not silently ignored or mis-rendered as text.
- [ ] No OAuth/refresh tokens ever reach frontend/renderer code or logs.
- [ ] App-server crash is handled without an infinite restart loop.
- [ ] Copy doesn't overpromise ("unlimited AI", "free API access") — see `references/ux-and-fallbacks.md`.

When editing an existing project, fit its existing provider/service
abstractions instead of rewriting unrelated code — the goal is the smallest
correct integration, not a framework rewrite.
