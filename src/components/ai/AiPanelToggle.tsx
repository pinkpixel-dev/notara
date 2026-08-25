import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AiPanelToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * The one visible way in and out of the assistant.
 *
 * It sits in the header rather than in the overflow menu, because the panel is
 * available from every section and a control that follows the user everywhere
 * should not be two clicks deep. The shortcut is on the button itself, so it is
 * discoverable rather than documented somewhere else.
 */
const AiPanelToggle: React.FC<AiPanelToggleProps> = ({ isOpen, onToggle }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className={cn('shrink-0', isOpen && 'bg-accent text-primary')}
        aria-label={isOpen ? 'Close the assistant panel' : 'Open the assistant panel'}
        aria-expanded={isOpen}
        aria-keyshortcuts="Control+J Meta+J"
        onClick={onToggle}
      >
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{isOpen ? 'Close assistant' : 'Open assistant'}</TooltipContent>
  </Tooltip>
);

export default AiPanelToggle;
