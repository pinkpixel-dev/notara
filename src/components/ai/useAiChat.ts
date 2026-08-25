import { useCallback, useEffect, useRef, useState } from 'react';
import {
  describeOpenAiFailure,
  generateOpenAiText,
  isOpenAiAvailable,
  readOpenAiKeyStatus,
  type OpenAiChatMessage,
} from '@/lib/openai/client';
import { readOpenAiConfig } from '@/lib/openai/config';

export type AiChatRole = 'user' | 'assistant';

export interface AiChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  /** Milliseconds since the epoch, used only for ordering and display. */
  createdAt: number;
}

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
 * What the assistant is told about itself.
 *
 * Stage 1 gives it no tools, so it is told that plainly. An assistant that
 * offers to edit a file it cannot reach is worse than one that says it cannot.
 * Stage 3 replaces this with the real tool instructions.
 */
const INSTRUCTIONS = [
  'You are the assistant built into Notara, a local-first Markdown notes app.',
  'You help with the notes, tasks, and plans the user is working on.',
  'You cannot read or change files yet, so ask for the text you need instead of',
  'claiming to have opened anything. Answer in Markdown. Be brief unless asked',
  'for detail.',
].join(' ');

export interface AiChatController {
  messages: AiChatMessage[];
  status: AiChatStatus;
  /** The sentence shown when the last request failed. */
  error: string | null;
  availability: AiChatAvailability;
  sendMessage: (text: string) => void;
  /** Re-sends the last user turn after a failure or a cancel. */
  retry: () => void;
  /** Stops waiting for the request in flight. */
  cancel: () => void;
  /** Clears the conversation. */
  reset: () => void;
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
export const useAiChat = (): AiChatController => {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
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

  const run = useCallback(async (history: AiChatMessage[]) => {
    requestToken.current += 1;
    const token = requestToken.current;

    setStatus('sending');
    setError(null);

    const payload: OpenAiChatMessage[] = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    try {
      const result = await generateOpenAiText({
        model: readOpenAiConfig().textModel,
        messages: payload,
        instructions: INSTRUCTIONS,
      });

      if (token !== requestToken.current) {
        return;
      }

      setMessages((current) => [
        ...current,
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

      setError(describeOpenAiFailure(failure));
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

      setMessages(next);
      void run(next);
    },
    [messages, run]
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

  const reset = useCallback(() => {
    requestToken.current += 1;
    setMessages([]);
    setStatus('idle');
    setError(null);
  }, []);

  const canRetry =
    status !== 'sending' &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'user';

  return {
    messages,
    status,
    error,
    availability,
    sendMessage,
    retry,
    cancel,
    reset,
    canRetry,
  };
};
