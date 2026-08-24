/**
 * Model preferences for the OpenAI provider.
 *
 * Only the model choices live here, and they are not secret, so browser storage
 * is the right home for them. The API key is deliberately absent: it lives
 * encrypted behind the Rust backend and never reaches this layer. See
 * `src/lib/openai/client.ts` for the key commands.
 */
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_TEXT_MODEL,
  isImageModel,
  isImageSize,
  isTextModel,
  type ImageModel,
  type ImageSize,
  type TextModel,
} from './models';

export const OPENAI_CONFIG_STORAGE_KEY = 'notara-openai-config';

export interface OpenAiConfig {
  textModel: TextModel;
  imageModel: ImageModel;
  imageSize: ImageSize;
}

export const OPENAI_DEFAULT_CONFIG: OpenAiConfig = {
  textModel: DEFAULT_TEXT_MODEL,
  imageModel: DEFAULT_IMAGE_MODEL,
  imageSize: DEFAULT_IMAGE_SIZE,
};

/**
 * What arrives from storage before it has been checked.
 *
 * The values are plain strings rather than the catalog unions, because they
 * come out of `JSON.parse` and a retired model ID is exactly the case this has
 * to handle.
 */
export type StoredOpenAiConfig = Partial<Record<keyof OpenAiConfig, string>>;

/**
 * Falls back to a default only for a value that is missing or no longer in the
 * catalog, which happens when a model is retired between releases. A saved
 * model that is still approved is never replaced.
 */
export const normalizeOpenAiConfig = (config?: StoredOpenAiConfig): OpenAiConfig => {
  const { textModel, imageModel, imageSize } = config ?? {};

  return {
    textModel: textModel && isTextModel(textModel) ? textModel : DEFAULT_TEXT_MODEL,
    imageModel: imageModel && isImageModel(imageModel) ? imageModel : DEFAULT_IMAGE_MODEL,
    imageSize: imageSize && isImageSize(imageSize) ? imageSize : DEFAULT_IMAGE_SIZE,
  };
};

export const readOpenAiConfig = (): OpenAiConfig => {
  if (typeof window === 'undefined') {
    return OPENAI_DEFAULT_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(OPENAI_CONFIG_STORAGE_KEY);
    return raw ? normalizeOpenAiConfig(JSON.parse(raw) as StoredOpenAiConfig) : OPENAI_DEFAULT_CONFIG;
  } catch (error) {
    console.warn('Failed to load OpenAI model settings:', error);
    return OPENAI_DEFAULT_CONFIG;
  }
};

export const saveOpenAiConfig = (config: StoredOpenAiConfig): OpenAiConfig => {
  const normalized = normalizeOpenAiConfig(config);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(OPENAI_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.warn('Failed to save OpenAI model settings:', error);
    }
  }

  return normalized;
};
