import { useCallback, useEffect, useRef, useState } from 'react';
import {
  describeOpenAiFailure,
  generateOpenAiText,
  isOpenAiAvailable,
  readOpenAiKeyStatus,
} from '@/lib/openai/client';
import { readOpenAiConfig } from '@/lib/openai/config';
import { AI_TOOLS } from '@/lib/ai/tools/definitions';
import { AI_WRITE_TOOLS } from '@/lib/ai/tools/write-definitions';
import { EmptyTurnError, runTurn, type ToolExecutor, type TurnMessage } from '@/lib/ai/turn';

import type { StoredAiMessage } from '@/lib/ai/conversations';

/**
 * A turn, in the shape it is stored in.
 *
 * The panel and the file agree on one shape rather than mapping between two.
 * There is nothing in a turn that is worth showing but not worth keeping.
 */
export type AiChatMessage = StoredAiMessage;

export type AiChatStatus = 'idle' | 'sending' | 'error';

/**
 * Whether the assistant can be used at all, and why not when it cannot.
 *
 * Two separate reasons, because the fixes are different. No backend means the
 * browser or Docker build, which cannot hold a key at all. No key means the
 * desktop app with nothing saved in Settings yet.
 */
export type AiChatAvailability = 'checking' | 'ready' | 'no-backend' | 'no-key';

const createId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * Every tool the assistant may call.
 *
 * The write tools do not write. Each one produces a proposal the user approves,
 * so what the model is really being offered is the ability to ask.
 */
const TOOLS = [...AI_TOOLS, ...AI_WRITE_TOOLS];

/**
 * What the assistant is told about itself.
 *
 * The important sentence is the one about proposing rather than doing. A model
 * that believes it saved the file will say so, and the user will read that
 * their note was changed while the proposal is still sitting there unapproved.
 */
const INSTRUCTIONS = [
  'You are the assistant built into Notara, a local-first Markdown notes app.',
  'You help with the notes, tasks, and plans the user is working on.',
  'You can read the workspace through the tools you have been given: search and',
  'read notes, list them, read the to-do lists, and read the calendar. Use them',
  'rather than guessing or asking the user to paste something you could look up.',
  'A note is identified by its file path, so name paths when you refer to notes.',
  'You can also propose changes: edit a note, write a new one, make or change a',
  'to-do list, add or move a calendar entry, and generate an image for a vision',
  'board. Proposing is not doing. Each proposal is shown to the user, who',
  'approves, edits, or rejects it, so say what you have proposed and never say a',
  'change has been made. Before proposing an edit, read the note, and send its',
  'complete new content rather than a fragment. Propose one change at a time and',
  'wait for the user rather than repeating a proposal they have not answered.',
  'Answer in Markdown. Be brief unless asked for detail.',
].join(' ');

/** Turns the stored transcript into the turns the model is sent. */
const toTurnMessages = (messages: AiChatMessage[]): TurnMessage[] =>
  messages
    .filter((message): message is AiChatMessage & { role: 'user' | 'assistant' } =>
      message.role === 'user' || message.role === 'assistant'
    )
    .map((message) => ({ role: message.role, content: message.content }));

export interface AiChatOptions {
  /**
   * Which conversation these turns belong to.
   *
   * Changing it drops any request in flight. The reply was asked for while
   * looking at another note, and dropping it into the conversation the user
   * has since moved to would be worse than not answering.
   */
  conversationKey: string;
  messages: AiChatMessage[];
  onMessagesChange: (messages: AiChatMessage[]) => void;
  /** Runs a tool the model asked for. */
  executeTool: ToolExecutor;
}

export interface AiChatController {
  status: AiChatStatus;
  /** The sentence shown when the last request failed. */
  error: string | null;
  availability: AiChatAvailability;
  sendMessage: (text: string) => void;
  /** Re-sends the last user turn after a failure or a cancel. */
  retry: () => void;
  /** Stops waiting for the request in flight. */
  cancel: () => void;
  /** True when there is a user turn waiting for a reply that never came. */
  canRetry: boolean;
}

/**
 * The chat behind the AI panel.
 *
 * Cancel is honest about what it does: the request has already left for OpenAI
 * through a Rust command, and a command in flight cannot be recalled. Cancelling
 * stops the app waiting for it and stops the reply from landing in the
 * conversation. The request still finishes on OpenAI's side and still counts
 * against the account. Stage 5 brings streaming, which is where a real abort
 * becomes possible.
 */
export const useAiChat = ({
  conversationKey,
  messages,
  onMessagesChange,
  executeTool,
}: AiChatOptions): AiChatController => {
  const [status, setStatus] = useState<AiChatStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AiChatAvailability>('checking');

  /**
   * Which request the component is still interested in.
   *
   * Bumped by cancel, by a new send, and on unmount. A reply whose token no
   * longer matches is dropped rather than appended, which is what keeps a
   * cancelled request from reappearing a few seconds later.
   */
  const requestToken = useRef(0);

  useEffect(() => {
    let active = true;

    const check = async () => {
      if (!isOpenAiAvailable()) {
        if (active) {
          setAvailability('no-backend');
        }
        return;
      }

      try {
        const keyStatus = await readOpenAiKeyStatus();
        if (active) {
          setAvailability(keyStatus.saved ? 'ready' : 'no-key');
        }
      } catch {
        // The backend answered with a storage problem. Treating that as a
        // missing key sends the user to the one screen that can fix it.
        if (active) {
          setAvailability('no-key');
        }
      }
    };

    void check();

    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      requestToken.current += 1;
    },
    []
  );

  // Read inside the request callback rather than captured, so a reply appends
  // to the turns as they stand when it arrives.
  const messagesRef = useRef<AiChatMessage[]>(messages);
  messagesRef.current = messages;

  const changeRef = useRef(onMessagesChange);
  changeRef.current = onMessagesChange;

  const executeRef = useRef(executeTool);
  executeRef.current = executeTool;

  const run = useCallback(async (history: AiChatMessage[]) => {
    requestToken.current += 1;
    const token = requestToken.current;

    setStatus('sending');
    setError(null);

    const model = readOpenAiConfig().textModel;

    try {
      const result = await runTurn({
        messages: toTurnMessages(history),
        tools: TOOLS,
        send: (input, tools) =>
          generateOpenAiText({ model, input, tools, instructions: INSTRUCTIONS }),
        execute: (name, args) => executeRef.current(name, args),
        isAbandoned: () => token !== requestToken.current,
      });

      if (token !== requestToken.current) {
        return;
      }

      const now = Date.now();

      // What was read comes before the answer, in the order it happened, so the
      // reply can be judged against the material it came from.
      const trace: AiChatMessage[] = result.toolRuns.map((toolRun, index) =>
        toolRun.proposal
          ? {
              id: createId(),
              role: 'proposal',
              content: toolRun.summary,
              createdAt: now + index,
              proposal: toolRun.proposal,
              proposalStatus: 'pending',
            }
          : {
              id: createId(),
              role: 'tool',
              content: toolRun.summary,
              createdAt: now + index,
              toolName: toolRun.name,
              ...(toolRun.failed ? { failed: true } : {}),
            }
      );

      if (result.stoppedEarly) {
        trace.push({
          id: createId(),
          role: 'tool',
          content: 'Stopped after the limit on how many times one question may use tools',
          createdAt: now + trace.length,
          toolName: 'limit',
          failed: true,
        });
      }

      changeRef.current([
        ...messagesRef.current,
        ...trace,
        {
          id: createId(),
          role: 'assistant',
          content: result.text,
          createdAt: Date.now(),
        },
      ]);
      setStatus('idle');
    } catch (failure) {
      if (token !== requestToken.current) {
        return;
      }

      setError(
        failure instanceof EmptyTurnError ? failure.message : describeOpenAiFailure(failure)
      );
      setStatus('error');
    }
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      const next: AiChatMessage[] = [
        ...messages,
        { id: createId(), role: 'user', content: trimmed, createdAt: Date.now() },
      ];

      onMessagesChange(next);
      void run(next);
    },
    [messages, onMessagesChange, run]
  );

  const retry = useCallback(() => {
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return;
    }

    void run(messages);
  }, [messages, run]);

  const cancel = useCallback(() => {
    requestToken.current += 1;
    setStatus('idle');
    setError(null);
  }, []);

  // Moving to another conversation abandons whatever this one was waiting for,
  // and takes its error with it. An error about a request sent from a different
  // note is noise here.
  useEffect(() => {
    requestToken.current += 1;
    setStatus('idle');
    setError(null);
  }, [conversationKey]);

  const canRetry =
    status !== 'sending' &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'user';

  return {
    status,
    error,
    availability,
    sendMessage,
    retry,
    cancel,
    canRetry,
  };
};
