import { useNavDividerX } from './use-nav-divider-x';

/** Width a sidebar opens at when there is no header divider to line up with. */
const FALLBACK_WIDTH = 270;

/** Narrowest a sidebar may be dragged. */
export const SIDEBAR_MIN_PX = 240;

export interface SidebarPaneDefaults {
  /**
   * Whether the width is known yet.
   *
   * A panel reads its opening size once, at mount, so a pane must not be
   * rendered before this is true or it opens at the wrong width for good.
   */
  ready: boolean;
  listDefaultPx: number;
  listMinPx: number;
}

/**
 * Shared sizing for the app's sidebars.
 *
 * Every sidebar opens level with the divider in the header, so the one vertical
 * line runs straight down the page and stays put when you move between Notes
 * and To-Do. Keeping this in one place is what stops the two from drifting
 * apart the next time one of them is adjusted.
 *
 * Panes that are a proportional split rather than a sidebar, such as the
 * calendar and the cheat sheet, deliberately do not use this.
 */
export const useSidebarPane = (): SidebarPaneDefaults => {
  const navDividerX = useNavDividerX();

  return {
    ready: navDividerX !== null,
    listDefaultPx: navDividerX && navDividerX > 0 ? navDividerX : FALLBACK_WIDTH,
    listMinPx: SIDEBAR_MIN_PX,
  };
};
