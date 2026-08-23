# Codex App Server — JSON-RPC Protocol Reference

Method names and payload shapes here reflect the current official protocol as
of this writing. The protocol evolves — if something doesn't match what you
observe, regenerate the schema from the user's actual installed binary:

```bash
codex app-server generate-ts --out ./schemas
codex app-server generate-json-schema --out ./schemas
```

Each generated artifact is version-exact to the Codex build that produced it,
which beats trusting any static doc (including this one) for edge cases.

## Table of contents

1. Transports & message schema
2. Initialization & capability opt-in
3. Core primitives: thread, turn, item
4. Threads (start/resume/fork/list/archive/etc.)
5. Turns (start/steer/interrupt, skill invocation)
6. Events & notifications (turn/*, item/*, deltas)
7. Approvals & elicitations
8. Errors
9. Apps (connectors) & skills-within-Codex
10. Models & other discovery endpoints

---

## 1. Transports & message schema

Like MCP, `codex app-server` is bidirectional JSON-RPC 2.0 (the `"jsonrpc":"2.0"`
header is omitted on the wire). Supported transports:

- **stdio** (default) — newline-delimited JSON (JSONL). This is what you want
  for a desktop app spawning Codex as a child process.
- **websocket** (`--listen ws://IP:PORT`) — experimental/unsupported for
  production. One JSON-RPC message per WebSocket text frame. Bounded queues;
  full ingress returns error code `-32001` ("Server overloaded; retry
  later.") — retry with exponential backoff + jitter.
- **Unix socket** (`--listen unix://` or a custom path) — WebSocket handshake
  over a Unix socket, useful for local multi-client scenarios.
- **`off`** — no local transport exposed.

Message shapes:

```json
{ "method": "thread/start", "id": 10, "params": { "model": "..." } }
```
```json
{ "id": 10, "result": { "thread": { "id": "thr_123" } } }
```
```json
{ "id": 10, "error": { "code": 123, "message": "Something went wrong" } }
```
```json
{ "method": "turn/started", "params": { "turn": { "id": "turn_456" } } }
```

Requests have `id`; notifications omit it. Every incoming message is one of:
a response to a request you sent, a notification, or a server-initiated
request you must respond to (approvals, elicitations). Don't assume it's
always a plain response.

## 2. Initialization & capability opt-in

Send exactly one `initialize` per connection before anything else, then
acknowledge with `initialized`:

```json
{
  "method": "initialize",
  "id": 0,
  "params": {
    "clientInfo": { "name": "my_app", "title": "My App", "version": "0.1.0" }
  }
}
```
```json
{ "method": "initialized", "params": {} }
```

Requests sent before this handshake get a `Not initialized` error. Calling
`initialize` twice on the same connection returns `Already initialized`.

**Use a real `clientInfo.name`** — it identifies your client for OpenAI's
Compliance Logs Platform. If you're building a new integration meant for
enterprise use, contact OpenAI to get it added to their known-clients list.

`capabilities` on `initialize` also supports:

- `optOutNotificationMethods` — exact notification method names to suppress
  on this connection (no wildcards; unknown names are ignored). Use this to
  cut noise from high-volume streams like `item/agentMessage/delta` if you
  don't need incremental rendering.
- `requestAttestation` — opt into the server-initiated `attestation/generate`
  request (desktop hosts with upstream attestation respond with an opaque
  token).
- `mcpServerOpenaiFormElicitation` — allow downstream MCP servers to send the
  OpenAI extended-form variant of elicitation requests.
- `experimentalApi: true` — required before you can use any method or field
  marked experimental below. Without it, the server rejects experimental
  calls with `<descriptor> requires experimentalApi capability`.

## 3. Core primitives

- **Thread** — a conversation between a user and the Codex agent; contains turns.
- **Turn** — one user request plus the agent work that follows; streams items incrementally.
- **Item** — a unit of input or output within a turn: user message, agent
  message, command execution, file change, tool call, and more.

Lifecycle: initialize once → start/resume a thread → start a turn → stream
notifications → turn completes (or is interrupted).

## 4. Threads

### Start / resume / fork

```json
{ "method": "thread/start", "id": 10, "params": {
  "model": "gpt-5.6-terra",
  "cwd": "/path/to/project",
  "approvalPolicy": "never",
  "sandbox": "workspaceWrite"
} }
```
Response includes `thread.id` and emits a `thread/started` notification. Don't
create a fresh thread per message unless that's a deliberate UX choice — a
thread is meant to persist as an ongoing conversation.

`thread/resume` reopens a stored thread by id so later `turn/start` calls
append to it — same params shape as `thread/start`, plus `threadId`.

`thread/fork` branches history into a new thread id; pass `lastTurnId` to copy
through that turn (omit later ones), or `ephemeral: true` for an in-memory
fork that doesn't show up in stored thread listings.

`thread.sessionId` identifies the live session-tree root — read this instead
of deriving it from the thread id yourself (forked threads keep their root's
session id).

### Read / list (without resuming)

`thread/read` fetches stored thread data without loading it into memory or
subscribing to events — use `includeTurns: true` for full history. Returned
`thread.status` is one of `notLoaded`, `idle`, `systemError`, or `active` (with
`activeFlags`).

`thread/list` supports cursor pagination plus `modelProviders`, `sourceKinds`,
`archived`, `isPinned`, `cwd`, `searchTerm`, and sort options. Default
`sourceKinds` filter is interactive sources only (`cli`, `vscode`) — pass an
explicit list if your client is a different source kind.

`thread/loaded/list` returns thread ids currently in memory.

### Lifecycle management

- `thread/archive` — moves the persisted log to an archived directory; emits `thread/archived`.
- `thread/unarchive` — restores it; emits `thread/unarchived`.
- `thread/delete` — permanently deletes a thread and descendants; emits `thread/deleted`.
- `thread/unsubscribe` — drops your connection's subscription; after a 30-minute no-subscriber grace period with no activity, the server unloads the thread (`thread/status/changed` → `notLoaded`, then `thread/closed`).
- `thread/metadata/update` — patch `isPinned` / `gitInfo` without resuming.
- `thread/compact/start` — trigger history compaction; progress streams as normal `turn/*`/`item/*` events including a `contextCompaction` item.
- `thread/status/changed` (notify) — fires whenever a loaded thread's runtime status changes.

## 5. Turns

### Starting a turn

```json
{ "method": "turn/start", "id": 30, "params": {
  "threadId": "thr_123",
  "input": [ { "type": "text", "text": "Explain this diff" } ]
} }
```

`input` items can be `{"type": "text", "text": "..."}`,
`{"type": "image", "url": "..."}`, or `{"type": "localImage", "path": "..."}`.

Per-turn overrides (`model`, `effort`, `cwd`, `sandboxPolicy`, `personality`,
`summary`, `outputSchema`) become the new defaults for later turns on the same
thread unless it's `outputSchema`, which applies only to the current turn.

Response returns the initial `turn` object immediately
(`{"id": ..., "status": "inProgress", "items": [], "error": null}`) — the
actual content streams via notifications, not the RPC response.

### Steering and interrupting

`turn/steer` appends more input to the *currently in-flight* turn (include
`expectedTurnId` matching the active turn; fails if there's no active turn;
doesn't accept turn-level overrides like `model`/`cwd`/`sandboxPolicy`).

`turn/interrupt` cancels an in-flight turn; on success it finishes with
`status: "interrupted"`.

### Invoking a skill explicitly

Include `$<skill-name>` in the text and add a matching `skill` input item so
the server injects full instructions rather than relying on the model to
resolve the name from text alone:

```json
{ "method": "turn/start", "id": 33, "params": {
  "threadId": "thr_123",
  "input": [
    { "type": "text", "text": "$skill-creator Add a skill for triaging flaky CI." },
    { "type": "skill", "name": "skill-creator", "path": "/Users/me/.codex/skills/skill-creator/SKILL.md" }
  ]
} }
```

## 6. Events & notifications

After starting/resuming a thread, keep reading the transport stream for
`thread/*`, `turn/*`, `item/*`, and `serverRequest/resolved` notifications.

### Turn-level

- `turn/started` — `{turn}` with empty `items`, `status: "inProgress"`.
- `turn/completed` — `{turn}` with `status` of `completed`, `interrupted`, or
  `failed` (failures carry `{error: {message, codexErrorInfo?, additionalDetails?}}`).
- `turn/diff/updated` — aggregated unified diff across all file changes in the turn.
- `turn/plan/updated` — the agent's plan, `{step, status}` entries with status `pending`/`inProgress`/`completed`.
- `thread/tokenUsage/updated` — usage stats for the active thread.

### Item types (the `ThreadItem` union)

Common types you'll see in `item/started` / `item/completed`:

- `userMessage` — `{id, content}`.
- `agentMessage` — `{id, text, phase?}` (`phase` is `commentary` or `final_answer`). **This is the assistant's reply text** — accumulate `item/agentMessage/delta` into it as it streams.
- `plan` — proposed plan text (plan mode); treat the final `item/completed` version as authoritative, not the concatenated deltas.
- `reasoning` — `{id, summary, content}`.
- `commandExecution` — `{id, command, cwd, status, aggregatedOutput?, exitCode?, durationMs?}`.
- `fileChange` — `{id, changes, status}`, each change `{path, kind, diff}`.
- `mcpToolCall` — `{id, server, tool, status, arguments, result?, error?}`.
- `webSearch`, `imageView`, `enteredReviewMode`, `exitedReviewMode`, `contextCompaction`.

Every item emits `item/started` (full item when work begins) and
`item/completed` (final authoritative state).

### Delta (streaming) events

- `item/agentMessage/delta` — incremental assistant text. **Render this
  incrementally** — don't wait for `turn/completed` before showing anything.
- `item/plan/delta`, `item/reasoning/summaryTextDelta`, `item/reasoning/textDelta`
- `item/commandExecution/outputDelta` — stdout/stderr chunks, append in order.

### Suppressing noise

Pass exact method names in `initialize.params.capabilities.optOutNotificationMethods`
if you don't want, e.g., delta spam for a non-streaming UI.

## 7. Approvals & elicitations

Depending on user settings, command execution and file changes may require
approval. The server sends a server-initiated request; you must respond.

**Command execution:**
1. `item/started` shows the pending `commandExecution` item.
2. `item/commandExecution/requestApproval` — includes `itemId`, `threadId`, `turnId`, optional `reason`/`command`/`cwd`.
3. You respond with one of: `accept`, `acceptForSession`, `decline`, `cancel`, or an amendment payload.
4. `serverRequest/resolved` confirms resolution.
5. `item/completed` — final item with `status: completed | failed | declined`.

**File change:** same shape via `item/fileChange/requestApproval`.

**MCP server elicitation** (`mcpServer/elicitation/request`) — a connected MCP
server can interrupt a turn asking for form input or URL-flow confirmation.
Respond with `action: "accept"` (+ `content`), `"decline"`, or `"cancel"`.

Always scope your UI state to `threadId`/`turnId` from the request — multiple
threads can have concurrent pending approvals.

## 8. Errors

Failed turns emit an `error` event —
`{error: {message, codexErrorInfo?, additionalDetails?}}` — then finish with
`status: "failed"`. Useful `codexErrorInfo` values to branch UX on:

- `ContextWindowExceeded`
- `UsageLimitExceeded` — show this distinctly; don't just retry silently.
- `HttpConnectionFailed` / `ResponseStreamConnectionFailed` / `ResponseStreamDisconnected`
- `BadRequest`, `Unauthorized`, `SandboxError`, `InternalServerError`, `Other`

When available, the upstream HTTP status appears in
`codexErrorInfo.httpStatusCode`.

## 9. Apps (connectors) & skills-within-Codex

These are optional, only relevant if your integration surfaces Codex's own
connector/skill ecosystem to the user (distinct from your app's own features):

- `app/list` / `app/installed` / `app/read` — discover and inspect connectors (Google Drive, Slack, etc.) Codex itself can call.
- `skills/list` — list Codex skills available for a `cwd`; `skills/config/write` toggles one on/off.
- Invoke by mentioning `$<name>` in turn text plus a matching `skill` or `mention` input item, as shown above for skills and similarly for apps (`{"type": "mention", "name": "...", "path": "app://<id>"}`).

## 10. Models & discovery

`model/list` — discover available models/capabilities before rendering a
picker. Returns `id`, `displayName`, `defaultReasoningEffort`,
`supportedReasoningEfforts`, `inputModalities`, `supportsPersonality`,
`isDefault`, and optionally `hidden`/`upgrade` info. By default only
picker-visible models are returned; pass `includeHidden: true` for the full
catalog.

`experimentalFeature/list` — feature flags with `stage`
(`beta`/`underDevelopment`/`stable`/`deprecated`/`removed`).

`command/exec` — run a single sandboxed command without a thread/turn, useful
for one-off tooling rather than conversational turns.

---

## Minimum viable surface (repeat from SKILL.md, for convenience)

`initialize`, `initialized`, `account/read`, `account/login/start`,
`account/login/completed`, `account/updated`, `account/logout`,
`thread/start`, `turn/start`, `item/agentMessage/delta`, `turn/completed`.
Everything else in this file is available when you need it — don't implement
it preemptively.
