# Product UX & Graceful Fallbacks

## Language

Say what the feature does in plain terms, not in Codex-internals terms:

| Say this | Not this |
|---|---|
| "Connect ChatGPT" | "Configure Codex OAuth authentication" |
| "Connect your ChatGPT account to use supported Codex AI features without entering an API key." | (anything that mentions OAuth scopes, token types, or JSON-RPC to the user) |
| "Use AI through your connected ChatGPT/Codex account, subject to your plan's available features and usage limits." | "Unlimited AI" / "Free OpenAI API" / "Use your ChatGPT subscription as API credits" |

The bottom-row phrasings on the right are not just marketing fluff to avoid —
they're factually wrong (usage is metered against the user's plan) and will
generate confused support tickets the first time someone hits a limit.

## Failure modes to design for up front

Treat each of these as a first-class UI state, not an unhandled exception:

### Codex not installed / not found
```text
Codex could not be found.
```
Depending on your distribution model: point to install instructions, offer to
bundle/download a compatible binary, or fall back to another provider (API
key, Gemini, local model) if you support one. Don't let this surface as a raw
`ENOENT` stack trace.

### User not logged in
```text
Not connected
[ Connect ChatGPT ]
```
Standard empty state — see `references/authentication.md` for the actual login flow.

### Authentication expired
Let Codex attempt its own refresh first (it does this automatically for
active ChatGPT sessions). Only surface a reconnect prompt if a call still
fails after that — don't jump straight to "please log in again" on the first
sign of trouble.

### Usage limit reached (`UsageLimitExceeded`)
Don't retry silently or loop. Show a clear, specific message and — if you
support multiple providers — offer alternatives directly:
```text
Usage limit reached for your ChatGPT plan.
[ Use an OpenAI API key ]  [ Use Gemini ]  [ Use a local model ]
```

### App-server process terminated unexpectedly
Attempt one controlled restart if that fits your app's model; don't spawn an
unbounded restart loop if it keeps crashing. Surface a clear "AI features
temporarily unavailable, retrying..." state, and give up gracefully (with a
manual retry button) after a small number of attempts.

## Multi-provider UI pattern

If your app supports more than just Codex, make the picker explicit rather
than silently picking one:

```text
AI Providers

✓ ChatGPT / Codex
○ OpenAI API
○ Gemini
○ Local Model
```

Keep each provider's credentials and logic in its own module — never let a
ChatGPT-authenticated Codex connection be treated interchangeably with a raw
OpenAI API key internally (their capabilities, rate limits, and billing model
differ even though both ultimately reach OpenAI models).

```ts
type ProviderType = "codex" | "openai" | "gemini" | "local";
```

## Minimum viable test UI

Before building anything fancier, confirm this full path works end-to-end —
it's the entire value proposition of the integration:

```text
┌──────────────────────────────┐
│ ChatGPT                      │
│ Not connected                │
│ [ Connect ChatGPT ]          │
└──────────────────────────────┘
       ↓ (after login)
┌──────────────────────────────┐
│ ChatGPT                      │
│ Connected ✓                  │
│ [ Disconnect ]                │
└──────────────────────────────┘
┌──────────────────────────────┐
│ Ask something...          Send│
└──────────────────────────────┘
```

Sequence to verify manually:

```text
launch Codex App Server
→ initialize / initialized
→ account/read (check existing auth)
→ account/login/start {"type":"chatgpt"}
→ open browser to authUrl
→ user completes login in browser
→ account/login/completed
→ account/updated
→ thread/start
→ turn/start
→ item/agentMessage/delta (streaming)
→ turn/completed
```

Only expand into approvals, MCP, apps/connectors, or process control after
this loop is solid and a real feature actually needs them — see the "minimum
viable surface" list in SKILL.md.
