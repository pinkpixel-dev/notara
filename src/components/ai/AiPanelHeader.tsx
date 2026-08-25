import React from 'react';
import { FileText, PanelRightClose, SquarePen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AiPanelHeaderProps {
  /** The note or section this conversation is about. */
  subject: string;
  /** Changes the icon and the wording, so the subject is never ambiguous. */
  isNoteConversation: boolean;
  onNewChat: () => void;
  canStartNewChat: boolean;
  /**
   * Left out on mobile, where the sheet draws its own close control. Two close
   * buttons in one corner is a coin toss the user should not have to make.
   */
  onClose?: () => void;
  className?: string;
}

/**
 * The panel's title bar.
 *
 * The subject line matters more than it looks. Every note has its own
 * conversation, so without it there is no way to tell which one is showing, and
 * New chat would be a button that clears something unnamed.
 */
const AiPanelHeader: React.FC<AiPanelHeaderProps> = ({
  subject,
  isNoteConversation,
  onNewChat,
  canStartNewChat,
  onClose,
  className,
}) => (
  <div
    className={cn(
      'flex shrink-0 items-center gap-1 border-b border-border px-2 py-2',
      className
    )}
  >
    <div className="flex min-w-0 flex-1 flex-col px-1">
      <h2 className="truncate text-sm font-semibold">Assistant</h2>
      <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
        {isNoteConversation && <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />}
        <span className="truncate">
          {isNoteConversation ? subject : `${subject} section`}
        </span>
      </p>
    </div>

    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={`Start a new chat about ${subject}`}
          disabled={!canStartNewChat}
          onClick={onNewChat}
        >
          <SquarePen className="h-4 w-4" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>New chat</TooltipContent>
    </Tooltip>

    {onClose && (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Close the assistant panel"
            aria-keyshortcuts="Control+J Meta+J"
            onClick={onClose}
          >
            <PanelRightClose className="h-4 w-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Close panel</TooltipContent>
      </Tooltip>
    )}
  </div>
);

export default AiPanelHeader;
