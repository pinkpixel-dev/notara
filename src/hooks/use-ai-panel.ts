import { useCallback, useEffect, useState } from 'react';
import { usePersistedPaneSize } from './use-persisted-pane-size';

/**
 * Open state and width for the AI panel.
 *
 * The panel lives in the application shell rather than on a page, so its state
 * has to outlive a section change. It also has to survive a restart: a panel
 * the user dragged to 460 pixels and left open should come back that way.
 *
 * Width reuses the pane size store, because this is the same kind of thing as
 * the notes sidebar: a fixed-ish column measured in pixels, not a proportion of
 * the window. Open state gets its own key, since it is a boolean and does not
 * belong in a map of widths.
 */
const OPEN_STORAGE_KEY = 'notara-ai-panel-open';
const WIDTH_STORAGE_KEY = 'ai-panel';

export const AI_PANEL_DEFAULT_WIDTH = 380;
export const AI_PANEL_MIN_WIDTH = 300;
export const AI_PANEL_MAX_WIDTH = 640;

const readOpenState = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(OPEN_STORAGE_KEY) === 'true';
  } catch {
    // A private window or blocked storage. Closed is the safe default: it costs
    // one keystroke to open and never covers content the user did not ask to
    // have covered.
    return false;
  }
};

export const clampAiPanelWidth = (width: number): number =>
  Math.min(AI_PANEL_MAX_WIDTH, Math.max(AI_PANEL_MIN_WIDTH, Math.round(width)));

export interface AiPanelState {
  isOpen: boolean;
  width: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Called as the user drags or presses an arrow key on the resize handle. */
  setWidth: (width: number) => void;
}

export const useAiPanel = (): AiPanelState => {
  const [isOpen, setIsOpen] = useState<boolean>(readOpenState);
  const { saved, persist } = usePersistedPaneSize(WIDTH_STORAGE_KEY);
  const [width, setWidthState] = useState<number>(() =>
    clampAiPanelWidth(saved ?? AI_PANEL_DEFAULT_WIDTH)
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(OPEN_STORAGE_KEY, isOpen ? 'true' : 'false');
    } catch {
      // Losing the remembered open state is not worth interrupting anyone over.
    }
  }, [isOpen]);

  const setWidth = useCallback(
    (next: number) => {
      const clamped = clampAiPanelWidth(next);
      setWidthState(clamped);
      persist(clamped);
    },
    [persist]
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((current) => !current), []);

  return { isOpen, width, open, close, toggle, setWidth };
};
