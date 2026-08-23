import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export type WorkspacePaneId = "list" | "detail";

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
  /**
   * Narrowest the list pane may get, in pixels.
   *
   * The panel library sizes in percentages, and a percentage does not survive a
   * change of viewport: 20 percent is a comfortable 288 pixels on a wide desktop
   * and an unusable 154 on a tablet, where the search field reads "Searc". This
   * is converted into a percentage against the measured width of the group, so
   * the pane keeps a real floor at every width.
   */
  listMinPx?: number;
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
  listMinPx = 280,
}) => {
  const isMobile = useIsMobile();
  const groupRef = useRef<HTMLDivElement>(null);
  const [groupWidth, setGroupWidth] = useState(0);

  // Measured rather than read off the window, because the group is not the full
  // width of the page and only its own width decides what a percentage is worth.
  useEffect(() => {
    const element = groupRef.current;
    if (!element || isMobile) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      setGroupWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [isMobile]);

  if (isMobile) {
    const panes: Array<{ id: WorkspacePaneId; label: string }> = [
      { id: "list", label: listLabel },
      { id: "detail", label: detailLabel },
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
                  "min-h-11 flex-1 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {pane.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <section
            aria-label={activePane === "list" ? listLabel : detailLabel}
            className="h-full min-h-0"
          >
            {activePane === "list" ? list : detail}
          </section>
        </div>
      </div>
    );
  }

  // Before the first measurement there is no width to convert against, so the
  // plain percentages stand in. They are replaced on the first observed frame.
  const minFromPixels =
    groupWidth > 0
      ? Math.min((listMinPx / groupWidth) * 100, listMaxSize)
      : listMinSize;
  const effectiveMin = Math.max(listMinSize, minFromPixels);
  const effectiveDefault = Math.min(
    Math.max(listDefaultSize, effectiveMin),
    listMaxSize,
  );

  return (
    // The panel group's ref is its imperative handle rather than the element,
    // so the measurement goes on a wrapper.
    <div ref={groupRef} className="h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel
          defaultSize={effectiveDefault}
          minSize={effectiveMin}
          maxSize={listMaxSize}
        >
          <section aria-label={listLabel} className="h-full min-h-0">
            {list}
          </section>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="bg-border hover:bg-primary/50 transition-colors"
        />

        {/* Panel sizes normalize against their sum, so the pair has to add up to
          100 or neither pane renders at the size it asks for. */}
        <ResizablePanel defaultSize={100 - effectiveDefault}>
          <section aria-label={detailLabel} className="h-full min-h-0">
            {detail}
          </section>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default WorkspacePanes;
