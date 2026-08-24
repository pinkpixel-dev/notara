import { describe, expect, it } from 'vitest';
import { normalizeOpenAiConfig, OPENAI_DEFAULT_CONFIG } from '../config';
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL } from '../models';

describe('OpenAI model settings', () => {
  it('keeps an approved model that was already saved', () => {
    const config = normalizeOpenAiConfig({ textModel: 'gpt-5-mini', imageModel: 'gpt-image-1' });

    expect(config.textModel).toBe('gpt-5-mini');
    expect(config.imageModel).toBe('gpt-image-1');
  });

  it('falls back only when a saved model is no longer in the catalog', () => {
    const config = normalizeOpenAiConfig({ textModel: 'gpt-4o', imageModel: 'flux' });

    expect(config.textModel).toBe(DEFAULT_TEXT_MODEL);
    expect(config.imageModel).toBe(DEFAULT_IMAGE_MODEL);
  });

  it('returns the defaults for an empty object', () => {
    expect(normalizeOpenAiConfig({})).toEqual(OPENAI_DEFAULT_CONFIG);
  });

  it('keeps an approved image size and rejects an unsupported one', () => {
    expect(normalizeOpenAiConfig({ imageSize: '1024x1536' }).imageSize).toBe('1024x1536');
    expect(normalizeOpenAiConfig({ imageSize: '512x512' }).imageSize).toBe(OPENAI_DEFAULT_CONFIG.imageSize);
  });
});
