import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_TEXT_MODEL,
  IMAGE_MODELS,
  isImageModel,
  isTextModel,
  TEXT_MODELS,
} from '../models';

/**
 * Reads the model IDs listed under a heading in `DOCS/openai_models.md`.
 *
 * The catalog rules forbid parsing that document at runtime. Reading it in a
 * test is what keeps this list, the Rust list, and the document in agreement.
 */
const documentedModels = (heading: string): string[] => {
  const document = readFileSync(resolve(__dirname, '../../../../DOCS/openai_models.md'), 'utf8');
  const found: string[] = [];
  let inside = false;

  for (const line of document.split('\n')) {
    if (line.startsWith('## ')) {
      inside = line.trim() === heading;
      continue;
    }

    const match = inside ? line.match(/^- `(.+)`$/) : null;
    if (match) {
      found.push(match[1]);
    }
  }

  expect(found.length).toBeGreaterThan(0);
  return found;
};

describe('OpenAI model catalog', () => {
  it('matches the documented text models', () => {
    expect(documentedModels('## Text models')).toEqual([...TEXT_MODELS]);
  });

  it('matches the documented image models', () => {
    expect(documentedModels('## Image models')).toEqual([...IMAGE_MODELS]);
  });

  it('defaults to the first entry of each catalog', () => {
    expect(DEFAULT_TEXT_MODEL).toBe(TEXT_MODELS[0]);
    expect(DEFAULT_IMAGE_MODEL).toBe(IMAGE_MODELS[0]);
  });

  it('keeps the text and image catalogs separate', () => {
    expect(isTextModel('gpt-image-2')).toBe(false);
    expect(isImageModel('gpt-5.5')).toBe(false);
  });

  it('rejects a model outside the catalog', () => {
    expect(isTextModel('gpt-4o')).toBe(false);
    expect(isImageModel('dall-e-3')).toBe(false);
  });
});
