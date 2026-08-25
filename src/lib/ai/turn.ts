/**
 * One exchange with the model, including any tools it asks for along the way.
 *
 * The Responses API answers a request with either an answer or a request to
 * call a tool. Nothing is stored on the provider side, so every round sends the
 * whole exchange again: the turns so far, each tool the model asked for, and
 * each result Notara gave back.
 *
 * The loop lives here rather than in the panel so it can be tested without a
 * browser, a backend, or a key. Both the sending and the running of tools are
 * passed in.
 */
import type { OpenAiInputItem, OpenAiTextResult, OpenAiToolDefinition } from '@/lib/openai/client';
import type { Proposal } from './proposals';

export interface TurnMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** What one tool call did, for the record shown in the panel. */
export interface ToolRun {
  name: string;
  /** The arguments as the model wrote them, parsed when they parsed. */
  arguments: Record<string, unknown>;
  /** One line describing what happened, written by the tool. */
  summary: string;
  /** True when the tool could not run. The model is told either way. */
  failed: boolean;
  /**
   * The change this call is asking permission for.
   *
   * Present only for a write tool. Nothing has happened yet: the proposal goes
   * to the user, who approves or rejects it.
   */
  proposal?: Proposal;
}

/** What a tool gives back: text for the model, a line for the user. */
export interface ToolOutcome {
  /** Returned to the model as the tool result. */
  output: string;
  /** Shown in the panel, so the user can see what was read. */
  summary: string;
  /** Set by a write tool: the change waiting for the user's approval. */
  proposal?: Proposal;
}

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>
) => Promise<ToolOutcome>;

export type TurnSender = (
  input: OpenAiInputItem[],
  tools: OpenAiToolDefinition[]
) => Promise<OpenAiTextResult>;

export interface RunTurnOptions {
  messages: TurnMessage[];
  tools: OpenAiToolDefinition[];
  send: TurnSender;
  execute: ToolExecutor;
  /**
   * How many times the model may come back asking for more tools.
   *
   * A ceiling rather than a target. Each round is a paid request, and a model
   * that has not answered after this many looks at the workspace is not about
   * to.
   */
  maxRounds?: number;
  /** Returns true when the caller has stopped caring about this turn. */
  isAbandoned?: () => boolean;
}

export interface TurnResult {
  text: string;
  toolRuns: ToolRun[];
  /** True when the round limit ended the turn rather than the model. */
  stoppedEarly: boolean;
}

export const DEFAULT_MAX_ROUNDS = 5;

/** Thrown when the exchange ends with nothing to show the user. */
export class EmptyTurnError extends Error {}

const parseArguments = (raw: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return null;
  }
};

export const runTurn = async ({
  messages,
  tools,
  send,
  execute,
  maxRounds = DEFAULT_MAX_ROUNDS,
  isAbandoned,
}: RunTurnOptions): Promise<TurnResult> => {
  const input: OpenAiInputItem[] = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const texts: string[] = [];
  const toolRuns: ToolRun[] = [];

  for (let round = 0; round < maxRounds; round += 1) {
    const result = await send(input, tools);

    if (result.text.trim()) {
      texts.push(result.text.trim());
    }

    if (result.toolCalls.length === 0) {
      return { text: texts.join('\n\n'), toolRuns, stoppedEarly: false };
    }

    // The model's own words come before the calls it made, so the replayed
    // exchange reads in the order it happened.
    if (result.text.trim()) {
      input.push({ role: 'assistant', content: result.text });
    }

    for (const call of result.toolCalls) {
      input.push({
        type: 'function_call',
        call_id: call.callId,
        name: call.name,
        arguments: call.arguments,
      });

      const args = parseArguments(call.arguments);

      if (args === null) {
        input.push({
          type: 'function_call_output',
          call_id: call.callId,
          output: 'The arguments were not valid JSON. Try the call again.',
        });
        toolRuns.push({
          name: call.name,
          arguments: {},
          summary: 'The assistant sent arguments that could not be read',
          failed: true,
        });
        continue;
      }

      try {
        const outcome = await execute(call.name, args);

        input.push({
          type: 'function_call_output',
          call_id: call.callId,
          output: outcome.output,
        });
        toolRuns.push({
          name: call.name,
          arguments: args,
          summary: outcome.summary,
          failed: false,
          ...(outcome.proposal ? { proposal: outcome.proposal } : {}),
        });
      } catch (error) {
        // A tool that failed is told to the model rather than thrown. It can
        // try a different approach, and the user sees the failed step either
        // way.
        const message = error instanceof Error ? error.message : String(error);

        input.push({
          type: 'function_call_output',
          call_id: call.callId,
          output: `The tool failed: ${message}`,
        });
        toolRuns.push({ name: call.name, arguments: args, summary: message, failed: true });
      }
    }

    if (isAbandoned?.()) {
      return { text: texts.join('\n\n'), toolRuns, stoppedEarly: true };
    }
  }

  const text = texts.join('\n\n');

  if (!text) {
    throw new EmptyTurnError(
      `The assistant used tools ${maxRounds} times without answering. Try asking something narrower.`
    );
  }

  return { text, toolRuns, stoppedEarly: true };
};
