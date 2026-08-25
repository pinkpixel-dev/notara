import React from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiChatMessage } from './useAiChat';

interface AiToolRowProps {
  message: AiChatMessage;
}

/**
 * A line saying what the assistant looked at.
 *
 * This is the panel's honesty about what left the machine. An answer that came
 * from three notes should say so, and the note paths should be readable without
 * asking the assistant what it read. It is quieter than a message on purpose:
 * it is a record of a step, not a turn of the conversation.
 */
const AiToolRow: React.FC<AiToolRowProps> = ({ message }) => {
  const Icon = message.failed ? AlertCircle : Search;

  return (
    <p
      className={cn(
        'flex items-start gap-2 px-1 text-xs',
        message.failed ? 'text-destructive' : 'text-muted-foreground'
      )}
    >
      <Icon className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">{message.content}</span>
    </p>
  );
};

export default AiToolRow;
