# Authorization Boundary and Product Reality

## What must be true before implementation

A generic OAuth implementation needs all of the following from the authorization provider:

- an application-owned client registration;
- registered redirect URI or loopback redirect rules;
- documented authorization and token endpoints;
- documented scopes and grant types;
- an explicit statement that the target resource API accepts tokens issued to that client;
- account, workspace, plan, and regional eligibility rules.

The presence of a sign-in flow in a first-party client does not establish these rights for a third-party or self-hosted application. First-party client values are implementation details, even when they are observable in a browser URL. Do not embed them in a product or describe them as stable.

## Research sequence

1. Search and open current OpenAI documentation, not search-result snippets.
2. Separate statements about using a first-party Codex client with ChatGPT from statements about building an independent application with OAuth.
3. Record the exact supported client type, redirect policy, token audience, resource endpoint, and revocation behavior.
4. Verify what the token authorizes. A user identity token, a Codex client session, an OpenAI API key, and an API organization credential are different things unless the provider explicitly states otherwise.
5. If any item is undocumented, label it unsupported rather than filling the gap with reverse-engineered behavior.

Useful starting points, which must be rechecked because eligibility and product behavior change:

- [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540/)
- [OpenAI developer documentation](https://developers.openai.com/)

## How to explain a blocker

Use direct wording:

> OpenAI documents account sign-in for its Codex clients, but we do not have a public OAuth client registration and resource API contract for this application. Reusing another client’s credentials would be unsupported. We can implement the supported API-key path now, or proceed when OpenAI provides an authorized integration surface.

Do not characterize that boundary as a technical inconvenience. It is an authorization and compatibility requirement.

## Product decisions to obtain

- Is the app browser-only, desktop, server-hosted, or a hybrid?
- Where does the trusted backend or native secure storage live?
- Is the app single-user or multi-user? For multi-user apps, which local account owns each provider connection?
- Which capabilities are required: text, tools, images, files, audio, or background work?
- What does disconnect mean locally, and is there a documented upstream revocation action?
- Is a supported OpenAI API-key option required as a separate provider?
