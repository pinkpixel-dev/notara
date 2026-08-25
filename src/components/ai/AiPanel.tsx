import React from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import type { AiPanelState } from '@/hooks/use-ai-panel';
import AiChat from './AiChat';
import AiPanelHeader from './AiPanelHeader';
import AiPanelResizer from './AiPanelResizer';
import { useAiChat } from './useAiChat';
import { useAiConversations } from './useAiConversations';
import { useAiTools } from './useAiTools';

interface AiPanelProps {
  panel: AiPanelState;
}

/**
 * The assistant, beside the work rather than instead of it.
 *
 * The conversations live here, in a component the shell always renders, so
 * closing the panel or moving between sections does not throw them away. Only
 * the container around it changes with the viewport.
 *
 * Each note has its own conversation and so does each section, and the panel
 * follows whatever the user is looking at. They are written into `.notara`, so
 * they come back after a restart.
 *
 * The assistant can read the workspace through the tools in
 * `src/lib/ai/tools`, and what it read shows in the transcript beside the
 * answer. It cannot change anything: writing waits for the review step.
 *
 * On desktop it is a resizable right-hand column. Below the mobile breakpoint
 * there is no room for a third column, so it becomes a sheet over the content
 * at most of the viewport height. A full-screen sheet was turned down: the note
 * being discussed should stay visible behind it, and it will matter more in
 * Stage 4, where a proposed edit is reviewed against the file it changes.
 */
const AiPanel: React.FC<AiPanelProps> = ({ panel }) => {
  const isMobile = useIsMobile();
  const conversations = useAiConversations();
  const executeTool = useAiTools();
  const chat = useAiChat({
    conversationKey: conversations.key,
    messages: conversations.messages,
    onMessagesChange: conversations.setMessages,
    executeTool,
  });

  const header = (
    <AiPanelHeader
      subject={conversations.label}
      isNoteConversation={conversations.isNoteConversation}
      onNewChat={conversations.newChat}
      canStartNewChat={conversations.messages.length > 0}
      onClose={isMobile ? undefined : panel.close}
      // The sheet draws its own close control in the top right corner, over
      // this row. Without the reserved space it lands on top of Clear.
      className={isMobile ? 'pr-12' : undefined}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={panel.isOpen} onOpenChange={(open) => (open ? panel.open() : panel.close())}>
        <SheetContent
          side="bottom"
          className="flex h-[85vh] flex-col gap-0 rounded-t-lg p-0 surface-sidebar"
        >
          <SheetTitle className="sr-only">Assistant</SheetTitle>
          {header}
          <AiChat chat={chat} messages={conversations.messages} />
        </SheetContent>
      </Sheet>
    );
  }

  if (!panel.isOpen) {
    return null;
  }

  return (
    <>
      <AiPanelResizer width={panel.width} onWidthChange={panel.setWidth} />
      <aside
        aria-label="Assistant"
        style={{ width: `${panel.width}px` }}
        className="flex min-h-0 shrink-0 flex-col surface-sidebar"
      >
        {header}
        <AiChat chat={chat} messages={conversations.messages} />
      </aside>
    </>
  );
};

export default AiPanel;
