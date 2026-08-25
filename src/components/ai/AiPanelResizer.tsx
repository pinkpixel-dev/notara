import React, { useCallback, useRef } from 'react';
import { AI_PANEL_MAX_WIDTH, AI_PANEL_MIN_WIDTH } from '@/hooks/use-ai-panel';

interface AiPanelResizerProps {
  width: number;
  onWidthChange: (width: number) => void;
}

const KEYBOARD_STEP = 16;

/**
 * The drag handle on the panel's left edge.
 *
 * Written by hand rather than reusing the resizable panel group, because that
 * library sizes a whole group in percentages and this is one fixed-width column
 * beside a page that already runs its own group. Nesting one inside the other
 * would make the page's own divider fight this one.
 *
 * The handle is a real separator: focusable, announced with its current width,
 * and movable with the arrow keys. A drag-only handle would put the panel width
 * out of reach for anyone not using a mouse.
 */
const AiPanelResizer: React.FC<AiPanelResizerProps> = ({ width, onWidthChange }) => {
  const startX = useRef(0);
  const startWidth = useRef(width);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      // Pointer capture keeps the drag alive over the editor, an iframe, or
      // anything else the cursor crosses on the way.
      event.currentTarget.setPointerCapture(event.pointerId);
      startX.current = event.clientX;
      startWidth.current = width;
    },
    [width]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        return;
      }

      // The panel is on the right, so dragging left makes it wider.
      onWidthChange(startWidth.current + (startX.current - event.clientX));
    },
    [onWidthChange]
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const moves: Record<string, number> = {
        ArrowLeft: width + KEYBOARD_STEP,
        ArrowRight: width - KEYBOARD_STEP,
        Home: AI_PANEL_MAX_WIDTH,
        End: AI_PANEL_MIN_WIDTH,
      };

      const next = moves[event.key];
      if (next === undefined) {
        return;
      }

      event.preventDefault();
      onWidthChange(next);
    },
    [onWidthChange, width]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the assistant panel"
      aria-valuenow={width}
      aria-valuemin={AI_PANEL_MIN_WIDTH}
      aria-valuemax={AI_PANEL_MAX_WIDTH}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className="w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    />
  );
};

export default AiPanelResizer;
