import { useCallback, useState } from 'react';

/**
 * Remembers how wide the user made a pane.
 *
 * Widths are stored in pixels rather than as a percentage of the window. A
 * sidebar is a fixed-ish thing: told to stay at 380 pixels it should be 380
 * pixels next time, not 26 percent of whatever window it opens in. Percentages
 * are right for a split that is genuinely proportional, which is why the
 * calendar keeps using the panel library's own percentage persistence instead
 * of this.
 *
 * Everything lives under one key so the app does not scatter a dozen entries
 * across local storage.
 */
const STORAGE_KEY = 'notara-pane-sizes';

type PaneSizes = Record<string, number>;

const readAll = (): PaneSizes => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    // Anything that is not a usable width is dropped rather than trusted. This
    // value ends up sizing a panel, and a NaN there breaks the whole layout.
    const sizes: PaneSizes = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        sizes[key] = value;
      }
    });
    return sizes;
  } catch {
    // A quota error, a private window, or a hand-edited value. None of them are
    // worth failing a render over; the pane just opens at its default.
    return {};
  }
};

export interface PersistedPaneSize {
  /**
   * The stored width in pixels, or null when there is none.
   *
   * Read once, on the first render. Local storage is synchronous, so this is
   * available before the panel mounts, which matters because a panel reads its
   * opening size once and cannot be corrected afterwards.
   */
  saved: number | null;
  /** Stores a new width. Called as the user drags. */
  persist: (pixels: number) => void;
}

export const usePersistedPaneSize = (storageKey?: string): PersistedPaneSize => {
  const [saved] = useState<number | null>(() =>
    storageKey ? (readAll()[storageKey] ?? null) : null
  );

  const persist = useCallback(
    (pixels: number) => {
      if (!storageKey || typeof window === 'undefined') {
        return;
      }
      if (!Number.isFinite(pixels) || pixels <= 0) {
        return;
      }

      try {
        const next = { ...readAll(), [storageKey]: Math.round(pixels) };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage being unavailable costs the user a remembered width, which is
        // not worth interrupting them over.
      }
    },
    [storageKey]
  );

  return { saved, persist };
};
