import React from 'react';
import { cn } from '@/lib/utils';
import MarkdownPreview from '@/components/notes/MarkdownPreview';
import type { AiChatMessage } from './useAiChat';

interface AiMessageProps {
  /** A user or assistant turn. Tool rows render through `AiToolRow`. */
  message: AiChatMessage;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * One turn in the conversation.
 *
 * The two roles are told apart by alignment, surface, and a visible label
 * rather than by colour alone. The label is also what a screen reader reads
 * before the content, so the turns do not run together.
 *
 * The user's turn is plain text on purpose. It is shown back exactly as typed,
 * so a stray asterisk stays an asterisk. The assistant's turn is Markdown,
 * because that is what it was asked to write.
 */
const AiMessage: React.FC<AiMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <article
      className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}
      aria-label={isUser ? 'Your message' : 'Assistant reply'}
    >
      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <span className="font-medium">{isUser ? 'You' : 'Assistant'}</span>
        <time dateTime={new Date(message.createdAt).toISOString()}>
          {timeFormatter.format(message.createdAt)}
        </time>
      </div>

      <div
        className={cn(
          'max-w-[92%] rounded-lg border px-3 py-2 text-sm',
          isUser
            ? 'border-border surface-elevated text-foreground'
            : 'border-transparent surface-content text-foreground'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <MarkdownPreview content={message.content} className="text-sm" />
        )}
      </div>
    </article>
  );
};

export default AiMessage;
