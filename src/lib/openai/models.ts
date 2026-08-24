/**
 * The approved model catalog, mirrored for the UI.
 *
 * This list, the Rust list in `src-tauri/src/openai/models.rs`, and
 * `DOCS/openai_models.md` have to be updated together. Tests on both sides read
 * the Markdown document and compare, so a change to one of the three fails the
 * build rather than shipping a selector the backend will reject.
 *
 * Nothing here is trusted. Settings uses these IDs to build fixed selectors,
 * and Rust validates the model again before any request leaves the machine.
 */

/** Text models, in the order Settings shows them. */
export const TEXT_MODELS = [
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'gpt-5.5',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
  'gpt-5.2',
  'gpt-5.1',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
] as const;

/** Image models, in the order Settings shows them. */
export const IMAGE_MODELS = [
  'gpt-image-2',
  'gpt-image-1.5',
  'gpt-image-1-mini',
  'gpt-image-1',
] as const;

export type TextModel = (typeof TEXT_MODELS)[number];
export type ImageModel = (typeof IMAGE_MODELS)[number];

/**
 * The model used before the user has chosen one.
 *
 * This is a starting point, not a fallback. Notara never changes a chosen model
 * after a failed request.
 */
export const DEFAULT_TEXT_MODEL: TextModel = TEXT_MODELS[0];
export const DEFAULT_IMAGE_MODEL: ImageModel = IMAGE_MODELS[0];

export const isTextModel = (value: string): value is TextModel =>
  (TEXT_MODELS as readonly string[]).includes(value);

export const isImageModel = (value: string): value is ImageModel =>
  (IMAGE_MODELS as readonly string[]).includes(value);

/**
 * Image sizes the GPT Image models accept.
 *
 * These are the shared presets rather than the full range. `gpt-image-2` takes
 * many more resolutions, but a selector offering sizes that only one model
 * accepts would fail for anyone on a different one.
 */
export const IMAGE_SIZES = [
  { value: '1024x1024', label: 'Square · 1024 × 1024' },
  { value: '1536x1024', label: 'Landscape · 1536 × 1024' },
  { value: '1024x1536', label: 'Portrait · 1024 × 1536' },
  { value: 'auto', label: 'Auto · model decides' },
] as const;

export type ImageSize = (typeof IMAGE_SIZES)[number]['value'];

export const DEFAULT_IMAGE_SIZE: ImageSize = '1024x1024';

export const isImageSize = (value: string): value is ImageSize =>
  IMAGE_SIZES.some((size) => size.value === value);
