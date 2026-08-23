import { useLayoutEffect, useState } from 'react';

/**
 * Where the header's divider sits, so a sidebar can line up with it.
 *
 * The divider between the File menu and the section tabs is the one vertical
 * line already in the header. Opening the notes sidebar at exactly that width
 * continues the line straight down the page instead of leaving two edges a few
 * pixels apart, which is the sort of near-miss that looks like a mistake.
 *
 * Its position depends on rendered text: the wordmark, and the width of File,
 * Edit, and View. Those change with the interface font, so it is measured
 * rather than hard coded.
 *
 * Two details make this work rather than being a race:
 *
 * - It is a layout effect, so the measurement lands before the browser paints
 *   and nothing is seen at the wrong width.
 * - It returns `null` until it has measured. Callers use that to hold back a
 *   panel whose opening width is only read once, at mount. Mounting first and
 *   measuring afterwards would leave the panel at the wrong size for good.
 *
 * Returns 0 when there is no divider to line up with, which is the mobile
 * layout, where the header has no tabs and the panes are not side by side.
 */
export const useNavDividerX = (): number | null => {
  const [dividerX, setDividerX] = useState<number | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const divider = document.querySelector('[data-nav-divider]');
      if (!divider) {
        setDividerX(0);
        return;
      }

      // A hidden element reports zeros, which is the mobile case. That is
      // reported as "nothing to align to" rather than as a zero-width sidebar.
      const left = divider.getBoundingClientRect().left;
      setDividerX(left > 0 ? Math.round(left) : 0);
    };

    measure();

    /*
     * Follow the divider rather than measuring it once.
     *
     * `document.fonts.ready` is not good enough here. It resolves when whatever
     * was loading at the time finished, which was before this app's fonts had
     * even been requested: measured that way the divider read 302 pixels and
     * then moved to 315 once the real font arrived.
     *
     * Watching the element holding everything to the divider's left catches all
     * of it: the font landing, the interface font being changed in Settings, and
     * the window being resized.
     */
    const leading = document.querySelector('[data-nav-leading]');
    if (!leading) {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(leading);
    return () => observer.disconnect();
  }, []);

  return dividerX;
};
