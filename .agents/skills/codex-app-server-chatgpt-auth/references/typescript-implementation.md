# TypeScript Implementation Structure

A concrete, opinionated shape for wiring this into a real TypeScript app
(Electron, Tauri, or a plain Node desktop app). Adapt names/paths to fit the
existing project rather than forcing this exact layout onto something that
already has its own conventions.

## Recommended file layout

```text
src/
  ai/
    providers/
      codex/
        CodexProcess.ts     - spawn, lifecycle, stdin/stdout/stderr, shutdown
        CodexRpcClient.ts   - request ids, framing, pending promises, notifications
        CodexAuth.ts        - account state, login (browser + device code), logout
        CodexProvider.ts    - implements AIProvider; threads, turns, streaming
        CodexEvents.ts      - event router / dispatch table for item/turn notifications
        types.ts
    AIProvider.ts            - provider-agnostic interface
```

## CodexProcess — spawning and lifecycle

```ts
import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";

export class CodexProcess {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private rl: readline.Interface | null = null;

  async start(onLine: (line: string) => void, onExit: (code: number | null) => void): Promise<void> {
    this.proc = spawn("codex", ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.proc.on("error", (err) => {
      // ENOENT here almost always means Codex isn't installed — surface a
      // specific "Codex not found" state, not a generic error.
      throw new Error(`Failed to launch codex app-server: ${err.message}`);
    });

    this.proc.stderr.on("data", (chunk) => {
      // Treat stderr as diagnostic logging only — never try to parse it as
      // JSON-RPC. Log it, don't route it into your message handler.
      console.error("[codex stderr]", chunk.toString());
    });

    this.proc.on("exit", (code) => {
      this.proc = null;
      onExit(code);
    });

    this.rl = readline.createInterface({ input: this.proc.stdout });
    this.rl.on("line", onLine);
  }

  send(message: unknown): void {
    if (!this.proc?.stdin.writable) {
      throw new Error("Codex process is not running");
    }
    this.proc.stdin.write(`${JSON.stringify(message)}\n`);
  }

  async stop(): Promise<void> {
    this.rl?.close();
    this.proc?.kill();
    this.proc = null;
  }
}
```

Things this must handle, called out explicitly because they're the easy parts
to skip and the first parts that break in the field:
- missing executable (bad `PATH`, not installed) — give the user something
  actionable, not a stack trace,
- unexpected termination mid-session — don't leave the UI in "connected" state,
- malformed JSON on a line — log and skip that line rather than crashing the reader,
- graceful shutdown when the app quits — don't leave orphaned `codex` processes.

## CodexRpcClient — the JSON-RPC layer

```ts
type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

type NotificationHandler = (method: string, params: unknown) => void;
type ServerRequestHandler = (method: string, params: unknown, id: number) => void;

export class CodexRpcClient {
  private pending = new Map<number, PendingRequest>();
  private nextId = 1;

  constructor(
    private send: (msg: unknown) => void,
    private onNotification: NotificationHandler,
    private onServerRequest: ServerRequestHandler,
  ) {}

  request(method: string, params?: unknown): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({ method, id, params });
    });
  }

  notify(method: string, params?: unknown): void {
    this.send({ method, params });
  }

  respond(id: number, result: unknown): void {
    this.send({ id, result });
  }

  handleLine(line: string): void {
    let msg: any;
    try {
      msg = JSON.parse(line);
    } catch {
      return; // malformed line — ignore, don't crash the reader
    }

    // Response to something we sent.
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const pending = this.pending.get(msg.id);
      if (pending) {
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(msg.error);
        else pending.resolve(msg.result);
      }
      return;
    }

    // Server-initiated request needing a response (approvals, elicitations).
    if (msg.id !== undefined && msg.method) {
      this.onServerRequest(msg.method, msg.params, msg.id);
      return;
    }

    // Plain notification.
    if (msg.method) {
      this.onNotification(msg.method, msg.params);
    }
  }
}
```

The key discipline here: **don't assume every incoming message is a response
to something you sent.** Three categories exist (response / notification /
server-initiated request); route by shape, not by hope.

## CodexAuth — account and login

```ts
export interface AccountState {
  type: "none" | "apiKey" | "chatgpt";
  email?: string;
  planType?: string;
}

export class CodexAuth {
  constructor(private rpc: CodexRpcClient) {}

  async readAccount(): Promise<AccountState> {
    const result = await this.rpc.request("account/read", { refreshToken: false });
    return result as AccountState;
  }

  async loginWithChatGPT(onAuthUrl: (url: string) => void): Promise<void> {
    const result = (await this.rpc.request("account/login/start", { type: "chatgpt" })) as {
      loginId: string;
      authUrl: string;
    };
    onAuthUrl(result.authUrl); // open in the system browser, not a webview
    // Resolution arrives via account/login/completed notification — see
    // CodexProvider's notification handler, matched on result.loginId.
  }

  async loginWithDeviceCode(onCode: (verificationUrl: string, userCode: string) => void): Promise<void> {
    const result = (await this.rpc.request("account/login/start", {
      type: "chatgptDeviceCode",
    })) as { loginId: string; verificationUrl: string; userCode: string };
    onCode(result.verificationUrl, result.userCode);
  }

  async cancelLogin(loginId: string): Promise<void> {
    await this.rpc.request("account/login/cancel", { loginId });
  }

  async logout(): Promise<void> {
    await this.rpc.request("account/logout");
  }
}
```

## The provider abstraction

Keep Codex swappable behind a plain interface so adding OpenAI-API-key,
Gemini, or a local-model provider later doesn't touch the UI layer:

```ts
export interface AIAccount {
  connected: boolean;
  email?: string;
  planType?: string;
}

export interface AIEvent {
  type: "textDelta" | "complete" | "error" | "toolCall" | "fileChange";
  data: unknown;
}

export interface AIProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAccount(): Promise<AIAccount | null>;
  createConversation(): Promise<string>;
  sendMessage(conversationId: string, input: string): AsyncIterable<AIEvent>;
}

export class CodexProvider implements AIProvider {
  // Wraps CodexProcess + CodexRpcClient + CodexAuth, maps thread/turn/item
  // events into AIEvent, and is the only place that knows about Codex's
  // wire format. Everything above the provider boundary talks AIEvent.
}
```

This lets you add later:

```ts
type ProviderType = "codex" | "openai" | "gemini" | "local";
```

without ever hard-coding a Codex assumption into your UI components.

## Electron / Tauri process boundary

Codex JSON-RPC traffic — and therefore any credential-adjacent state — must
stay in the **privileged main/backend process**. Expose only a narrow,
purpose-built IPC surface to the renderer:

```ts
// main process
ipcMain.handle("ai:connectChatGPT", () => provider.connect());
ipcMain.handle("ai:disconnectChatGPT", () => provider.disconnect());
ipcMain.handle("ai:getAccount", () => provider.getAccount());
ipcMain.handle("ai:createConversation", () => provider.createConversation());
ipcMain.handle("ai:sendMessage", (_e, convId: string, input: string) => {
  // stream results back via ipcRenderer events, not a raw async generator
  // across the IPC boundary
});
```

Never forward the raw app-server socket/pipe to the renderer, and never let
renderer code construct or inspect JSON-RPC messages directly — that's how
tokens end up in a place a compromised renderer (or a stray `console.log` a
future contributor adds) can leak them.

## Streaming into an async generator

```ts
async *sendMessage(threadId: string, text: string): AsyncIterable<AIEvent> {
  const queue: AIEvent[] = [];
  let done = false;
  let notifyNext: (() => void) | null = null;

  const unsubscribe = this.onNotification((method, params) => {
    if (method === "item/agentMessage/delta" && params.threadId === threadId) {
      queue.push({ type: "textDelta", data: params.delta });
    } else if (method === "turn/completed" && params.turn?.threadId === threadId) {
      done = true;
      queue.push({ type: "complete", data: params.turn });
    }
    notifyNext?.();
  });

  await this.rpc.request("turn/start", {
    threadId,
    input: [{ type: "text", text }],
  });

  try {
    while (!done || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => (notifyNext = resolve));
      }
      const event = queue.shift();
      if (event) yield event;
    }
  } finally {
    unsubscribe();
  }
}
```

Adapt field names (`params.threadId`, `params.delta`) to whatever the actual
generated schema for the user's installed Codex version specifies — don't
assume this exact shape is frozen; see `references/protocol.md` for how to
regenerate the schema.
