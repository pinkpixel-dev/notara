/**
 * Interface fonts offered in Settings.
 *
 * Every family here is loaded in `src/index.css`. Adding one to this list
 * without adding the matching Google Fonts import silently falls back to the
 * next family in the stack.
 *
 * The Notara wordmark stays on Poppins regardless of this setting.
 */

export type AppFont = 'inter' | 'poppins' | 'outfit' | 'geist' | 'jakarta';

export interface AppFontOption {
  id: AppFont;
  /** Label shown in the Settings picker. */
  name: string;
  /** Full CSS font-family stack. */
  stack: string;
}

const FALLBACK = "'Inter', system-ui, -apple-system, sans-serif";

export const availableFonts: AppFontOption[] = [
  {
    id: 'inter',
    name: 'Inter',
    stack: FALLBACK,
  },
  {
    id: 'poppins',
    name: 'Poppins',
    stack: `'Poppins', ${FALLBACK}`,
  },
  {
    id: 'outfit',
    name: 'Outfit',
    stack: `'Outfit', ${FALLBACK}`,
  },
  {
    id: 'geist',
    name: 'Geist',
    stack: `'Geist', ${FALLBACK}`,
  },
  {
    id: 'jakarta',
    name: 'Plus Jakarta Sans',
    stack: `'Plus Jakarta Sans', ${FALLBACK}`,
  },
];

export const defaultFont: AppFont = 'inter';

export const isAppFont = (value: unknown): value is AppFont =>
  availableFonts.some((font) => font.id === value);

export const getFontStack = (id: AppFont): string =>
  availableFonts.find((font) => font.id === id)?.stack ?? FALLBACK;
