import React from 'react';
import { PanelRightClose, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AiPanelHeaderProps {
  onClear: () => void;
  canClear: boolean;
  /**
   * Left out on mobile, where the sheet draws its own close control. Two close
   * buttons in one corner is a coin toss the user should not have to make.
   */
  onClose?: () => void;
  className?: string;
}

const AiPanelHeader: React.FC<AiPanelHeaderProps> = ({
  onClear,
  canClear,
  onClose,
  className,
}) => (
  <div
    className={cn(
      'flex shrink-0 items-center gap-1 border-b border-border px-2 py-2',
      className
    )}
  >
    <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">Assistant</h2>

    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Clear this conversation"
          disabled={!canClear}
          onClick={onClear}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Clear this conversation</TooltipContent>
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
