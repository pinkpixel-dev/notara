import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { usePersistedPaneSize } from '@/hooks/use-persisted-pane-size';

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
  /**
   * Width the list pane opens at, in pixels.
   *
   * A sidebar is a fixed-ish width rather than a proportion of the window:
   * widening the window should hand the extra space to the editor, not scale up
   * a column of note titles. When set, this wins over `listDefaultSize`, which
   * remains the fallback until the group has been measured.
   */
  listDefaultPx?: number;
  /**
   * Name this pane is remembered under.
   *
   * The width the user drags to is stored per pane, so each screen keeps its
   * own and none of them reset between sessions. Leave it unset for a pane that
   * should always open at its default.
   */
  storageKey?: string;
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
  listMinPx = 240,
  listDefaultPx,
  storageKey,
}) => {
  const isMobile = useIsMobile();
  const groupRef = useRef<HTMLDivElement>(null);
  const listPanelRef = useRef<ImperativePanelHandle>(null);
  /**
   * Whether the user has taken hold of the divider.
   *
   * Until they do, the list pane is held at its pixel width, so resizing the
   * window hands the extra space to the detail pane instead of stretching a
   * column of note titles. Once they have dragged it, that size is theirs and
   * nothing here moves it again.
   */
  const userHasResized = useRef(false);
  const [groupWidth, setGroupWidth] = useState(0);
  const { saved: savedWidth, persist: persistWidth } = usePersistedPaneSize(storageKey);

  /*
   * Measured rather than read off the window, because the group is not the full
   * width of the page and only its own width decides what a percentage is worth.
   *
   * This is a layout effect, and the first measurement is taken directly rather
   * than waiting for the observer. `defaultSize` is only read when a panel
   * mounts, so a width arriving after the first paint is ignored and the pane
   * keeps whatever percentage it opened at. Measuring before paint, and holding
   * the panels back until there is a width, is what makes a pixel default apply.
   */
  useLayoutEffect(() => {
    const element = groupRef.current;
    if (!element || isMobile) {
      return;
    }

    setGroupWidth(element.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      setGroupWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [isMobile]);

  /*
   * These sit above the mobile branch on purpose. The branch returns early, and
   * a hook declared after it would not run on mobile, which React reports as
   * rendering fewer hooks than expected and takes the whole page down.
   */
  const asPercent = (pixels: number) =>
    Math.min((pixels / groupWidth) * 100, listMaxSize);

  const effectiveMin = groupWidth > 0 ? asPercent(listMinPx) : listMinSize;

  /*
   * A width the user chose beats every computed default.
   *
   * It is read synchronously on the first render, so it is already available
   * when the panel mounts and reads its opening size. Only a workspace that has
   * never been resized falls through to `listDefaultPx`, which is where the
   * notes sidebar picks up its alignment with the header divider.
   */
  const openingWidth = savedWidth ?? listDefaultPx;

  const requestedDefault =
    groupWidth > 0 && openingWidth !== undefined
      ? asPercent(openingWidth)
      : listDefaultSize;

  // The floor wins over the requested width. A default narrower than the
  // minimum would be snapped wider on the first drag, which reads as the pane
  // moving on its own.
  const effectiveDefault = Math.min(
    Math.max(requestedDefault, effectiveMin),
    listMaxSize,
  );

  /*
   * Re-applies the opening width when it changes.
   *
   * A panel reads `defaultSize` once, at mount, so a width corrected later has
   * no effect on its own. Two things correct it: webfonts settling, which moves
   * the header divider this pane lines up with, and the window resizing, which
   * changes what that pixel width is as a percentage.
   */
  useEffect(() => {
    if (isMobile || userHasResized.current || groupWidth <= 0 || openingWidth === undefined) {
      return;
    }
    listPanelRef.current?.resize(effectiveDefault);
  }, [effectiveDefault, groupWidth, isMobile, openingWidth]);

  /**
   * Stores the width as the user drags.
   *
   * Percentages are converted back to pixels here, so the pane reopens at the
   * size it was left at rather than at the same fraction of a different window.
   * Only a drag is recorded: the layout callback also fires for the opening
   * size and for window resizes, and writing those back would overwrite the
   * user's choice with a value they never picked.
   */
  const handleLayout = useCallback(
    (sizes: number[]) => {
      if (!userHasResized.current || groupWidth <= 0 || sizes.length === 0) {
        return;
      }
      persistWidth((sizes[0] / 100) * groupWidth);
    },
    [groupWidth, persistWidth]
  );


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

  return (
    // The panel group's ref is its imperative handle rather than the element,
    // so the measurement goes on a wrapper.
    <div ref={groupRef} className="h-full">
      {/* Nothing renders until the width is known. One frame of an empty pane
          beats a pane that opens at the wrong size and cannot be corrected,
          because `defaultSize` is read once at mount. */}
      {groupWidth > 0 && (
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full"
          onLayout={handleLayout}
        >
          <ResizablePanel
            ref={listPanelRef}
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
            // Taking hold of the divider hands sizing to the user for good.
            onPointerDown={() => {
              userHasResized.current = true;
            }}
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
      )}
    </div>
  );
};

export default WorkspacePanes;
