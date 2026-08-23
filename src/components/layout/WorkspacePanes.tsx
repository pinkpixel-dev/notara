import React from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

export type WorkspacePaneId = 'list' | 'detail';

interface WorkspacePanesProps {
  /** Label for the narrow pane, used by the mobile switcher and the region name. */
  listLabel: string;
  /** Label for the wide pane, used by the mobile switcher and the region name. */
  detailLabel: string;
  list: React.ReactNode;
  detail: React.ReactNode;
  /** Which pane the mobile layout shows. Ignored on desktop, where both show. */
  activePane: WorkspacePaneId;
  onPaneChange: (pane: WorkspacePaneId) => void;
  /** Desktop sizing for the list pane, as a percentage of the group. */
  listDefaultSize?: number;
  listMinSize?: number;
  listMaxSize?: number;
}

/**
 * The two-pane workspace layout.
 *
 * Desktop keeps both panes side by side with a draggable divider. Below the
 * mobile breakpoint there is not enough room for two useful columns, so one
 * pane shows at a time and a switcher moves between them. The switcher is
 * always visible rather than hover-revealed, and both entries stay reachable
 * by keyboard and touch.
 */
const WorkspacePanes: React.FC<WorkspacePanesProps> = ({
  listLabel,
  detailLabel,
  list,
  detail,
  activePane,
  onPaneChange,
  listDefaultSize = 20,
  listMinSize = 20,
  listMaxSize = 70,
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    const panes: Array<{ id: WorkspacePaneId; label: string }> = [
      { id: 'list', label: listLabel },
      { id: 'detail', label: detailLabel },
    ];

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div
          className="flex shrink-0 gap-1 border-b border-border surface-toolbar p-2"
          role="group"
          aria-label="Switch pane"
        >
          {panes.map((pane) => {
            const isActive = activePane === pane.id;
            return (
              <button
                key={pane.id}
                type="button"
                onClick={() => onPaneChange(pane.id)}
                aria-pressed={isActive}
                className={cn(
                  'min-h-11 flex-1 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {pane.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <section
            aria-label={activePane === 'list' ? listLabel : detailLabel}
            className="h-full min-h-0"
          >
            {activePane === 'list' ? list : detail}
          </section>
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel
        defaultSize={listDefaultSize}
        minSize={listMinSize}
        maxSize={listMaxSize}
      >
        <section aria-label={listLabel} className="h-full min-h-0">
          {list}
        </section>
      </ResizablePanel>

      <ResizableHandle withHandle className="bg-border hover:bg-primary/50 transition-colors" />

      {/* Panel sizes normalize against their sum, so the pair has to add up to
          100 or neither pane renders at the size it asks for. */}
      <ResizablePanel defaultSize={100 - listDefaultSize}>
        <section aria-label={detailLabel} className="h-full min-h-0">
          {detail}
        </section>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default WorkspacePanes;
