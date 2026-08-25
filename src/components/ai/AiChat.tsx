import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OPENAI_UNAVAILABLE_MESSAGE } from '@/lib/openai/client';
import MarkdownPreview from '@/components/notes/MarkdownPreview';
import AiComposer from './AiComposer';
import AiMessage from './AiMessage';
import AiToolRow from './AiToolRow';
import AiProposalCard from './proposals/AiProposalCard';
import type { ProposalDecisions } from './useProposalDecisions';
import type { AiChatController, AiChatMessage } from './useAiChat';

interface AiChatProps {
  chat: AiChatController;
  /** The turns in the conversation now showing. */
  messages: AiChatMessage[];
  /** Apply, Cancel, and Undo for the proposals in this conversation. */
  decisions: ProposalDecisions;
}

const PLACEHOLDERS: Record<string, string> = {
  checking: 'Checking whether AI is available...',
  ready: 'Ask about your notes, or paste something in',
  'no-backend': 'AI needs the desktop app',
  'no-key': 'Add an API key in Settings first',
};

/**
 * The conversation, the composer, and everything that explains why there is no
 * conversation yet.
 *
 * The three empty states are different problems with different fixes, so they
 * do not share one message. No backend is the browser build and cannot be
 * fixed from here. No key is one trip to Settings. Ready but empty is just an
 * empty chat, which needs no explanation beyond a prompt to start.
 */
const AiChat: React.FC<AiChatProps> = ({ chat, messages, decisions }) => {
  const { status, streamingText, error, availability, sendMessage, retry, cancel, canRetry } = chat;
  const endRef = useRef<HTMLDivElement>(null);

  // New turns arrive at the bottom, so the bottom is where the user should be.
  // The streaming text is in here too, which is what keeps the view following a
  // reply as it is written.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, status, streamingText]);

  const isSending = status === 'sending';
  const isDisabled = availability !== 'ready';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {availability === 'no-backend' && (
          <p className="rounded-md border border-border surface-elevated p-3 text-sm text-muted-foreground">
            {OPENAI_UNAVAILABLE_MESSAGE}
          </p>
        )}

        {availability === 'no-key' && (
          <div className="rounded-md border border-border surface-elevated p-3 text-sm text-muted-foreground">
            <p>Notara needs your OpenAI API key before the assistant can answer.</p>
            <Button asChild variant="link" className="h-auto p-0 text-sm">
              <Link to="/settings">Add a key in Settings</Link>
            </Button>
          </div>
        )}

        {availability === 'ready' && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Ask a question to start. Every note keeps its own conversation, so
              this one comes back when you open that note again.
            </p>
            {/* Said before the first question rather than after it. The
                assistant reads notes on its own, and that is worth knowing
                up front rather than discovering in the transcript. */}
            <p className="text-xs text-muted-foreground">
              It can search and read your notes, tasks, and calendar. Every
              lookup is listed here as it happens, and any change it wants to
              make is shown to you before anything is written.
            </p>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex flex-col gap-3">
            {messages.map((message) => {
              if (message.role === 'tool') {
                return <AiToolRow key={message.id} message={message} />;
              }

              if (message.role === 'proposal' && message.proposal) {
                return (
                  <AiProposalCard
                    key={message.id}
                    proposal={message.proposal}
                    status={message.proposalStatus ?? 'pending'}
                    undo={message.undo}
                    outcome={message.proposalStatus === 'pending' ? '' : message.content}
                    busy={decisions.busyId === message.id}
                    onApply={(proposal) => decisions.apply(message.id, proposal)}
                    onCancel={() => decisions.cancel(message.id)}
                    onUndo={() => decisions.undo(message.id)}
                  />
                );
              }

              return <AiMessage key={message.id} message={message} />;
            })}
          </div>
        )}

        {/* Polite rather than assertive: a reply on its way is worth announcing,
            but not worth cutting off whatever is being read. */}
        {/* The reply as it arrives. Outside the live region below, because a
            screen reader announcing every few characters would be unusable; the
            finished turn is announced when it lands. */}
        {isSending && streamingText && (
          <article className="mt-4 flex flex-col gap-1 items-start" aria-label="Assistant reply">
            <p className="px-1 text-xs font-medium text-muted-foreground">Assistant</p>
            <div className="max-w-[92%] rounded-lg border border-transparent surface-content px-3 py-2 text-sm">
              <MarkdownPreview content={streamingText} className="text-sm" />
            </div>
          </article>
        )}

        <div aria-live="polite" className="mt-3">
          {isSending && !streamingText && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Waiting for a reply...
            </p>
          )}

          {status === 'error' && error && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm"
            >
              <p className="flex items-start gap-2 text-foreground">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <span>{error}</span>
              </p>
              {canRetry && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="self-start"
                  onClick={retry}
                >
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Try again
                </Button>
              )}
            </div>
          )}

          {status === 'idle' && canRetry && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={retry}
              className="self-start"
            >
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Send that again
            </Button>
          )}
        </div>

        <div ref={endRef} />
      </div>

      <AiComposer
        onSend={sendMessage}
        onCancel={cancel}
        isSending={isSending}
        disabled={isDisabled}
        placeholder={PLACEHOLDERS[availability] ?? PLACEHOLDERS.ready}
      />
    </div>
  );
};

export default AiChat;
