import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Measures an element's own width.
 *
 * Components inside a resizable pane cannot use viewport breakpoints, because
 * the pane's width has nothing to do with the window's. The notes sidebar is
 * the case this exists for: it can be 240 pixels on a wide monitor if the user
 * drags it there, and its contents have to react to that rather than to how big
 * the screen is.
 *
 * Tailwind 3 has no container queries without a plugin, so this does the same
 * job with a `ResizeObserver`.
 *
 * Returns a callback ref and the last measured width. The width is 0 until the
 * first measurement, so callers should treat 0 as "not known yet" rather than
 * as a very narrow element.
 */
export const useElementWidth = <T extends HTMLElement>(): [
  (node: T | null) => void,
  number,
] => {
  const [width, setWidth] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  // A callback ref rather than a ref object, so the observer attaches as soon
  // as the node exists instead of waiting for an effect on a later render.
  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();

    if (!node) {
      observerRef.current = null;
      return;
    }

    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, width];
};
