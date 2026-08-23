import { describe, expect, it } from 'vitest';
import {
  FALLBACK_TITLE,
  fileNameToTitle,
  MAX_TITLE_LENGTH,
  titleToFileName,
  uniqueNotePath,
} from '../naming';

describe('titleToFileName', () => {
  it('keeps an ordinary title exactly as typed', () => {
    expect(titleToFileName('About Notara')).toBe('About Notara');
    expect(titleToFileName('Crochet an i-cord')).toBe('Crochet an i-cord');
  });

  it('keeps spaces, hyphens, and punctuation a filesystem allows', () => {
    expect(titleToFileName("Mum's recipes (2026) #1 & co.")).toBe(
      "Mum's recipes (2026) #1 & co"
    );
  });

  it('replaces characters no filesystem accepts', () => {
    expect(titleToFileName('1:1 vs 2:1')).toBe('1 1 vs 2 1');
    expect(titleToFileName('src/lib vs src\\lib')).toBe('src lib vs src lib');
    expect(titleToFileName('what? "really" <yes>')).toBe('what really yes');
  });

  it('strips control characters', () => {
    const control = [0, 31, 127].map((code) => String.fromCharCode(code));
    expect(titleToFileName(`Bad${control[0]} title${control[1]} here${control[2]}`)).toBe(
      'Bad title here'
    );
  });

  it('drops trailing dots and spaces, which Windows removes silently', () => {
    expect(titleToFileName('Notes...')).toBe('Notes');
    expect(titleToFileName('Notes   ')).toBe('Notes');
  });

  it('drops a leading dot so the note is not hidden from the scan', () => {
    expect(titleToFileName('.hidden')).toBe('hidden');
  });

  it('falls back when a title sanitizes down to nothing', () => {
    expect(titleToFileName('')).toBe(FALLBACK_TITLE);
    expect(titleToFileName('   ')).toBe(FALLBACK_TITLE);
    expect(titleToFileName('///')).toBe(FALLBACK_TITLE);
  });

  it('sidesteps the names Windows reserves for devices', () => {
    expect(titleToFileName('CON')).toBe('CON note');
    expect(titleToFileName('nul')).toBe('nul note');
    expect(titleToFileName('Contact')).toBe('Contact');
  });

  it('caps a very long title without leaving a trailing space', () => {
    const name = titleToFileName('word '.repeat(60));

    expect(name.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(name).not.toMatch(/[. ]$/);
  });
});

describe('fileNameToTitle', () => {
  it('removes the Markdown extension', () => {
    expect(fileNameToTitle('About Notara.md')).toBe('About Notara');
    expect(fileNameToTitle('Notes.markdown')).toBe('Notes');
  });

  it('takes the last segment of a path', () => {
    expect(fileNameToTitle('Guides/Linux/NPM error.md')).toBe('NPM error');
  });

  it('leaves a name with no extension alone', () => {
    expect(fileNameToTitle('README')).toBe('README');
  });

  it('keeps dots that are part of the name', () => {
    expect(fileNameToTitle('v1.2.3 release.md')).toBe('v1.2.3 release');
  });
});

describe('uniqueNotePath', () => {
  it('uses the plain name when nothing is in the way', () => {
    expect(uniqueNotePath('Guides', 'About Notara', [])).toBe('Guides/About Notara.md');
  });

  it('places a note at the workspace root with no leading slash', () => {
    expect(uniqueNotePath('', 'Scratch', [])).toBe('Scratch.md');
  });

  it('counts up past a name already taken', () => {
    const taken = ['Guides/Ideas.md', 'Guides/Ideas 2.md'];

    expect(uniqueNotePath('Guides', 'Ideas', taken)).toBe('Guides/Ideas 3.md');
  });

  it('treats names as the filesystem does, ignoring case', () => {
    expect(uniqueNotePath('Guides', 'Ideas', ['guides/IDEAS.md'])).toBe('Guides/Ideas 2.md');
  });

  it('does not collide with the same name in another folder', () => {
    expect(uniqueNotePath('Linux', 'Ideas', ['Guides/Ideas.md'])).toBe('Linux/Ideas.md');
  });

  it('sanitizes the title before looking for a collision', () => {
    expect(uniqueNotePath('', '1:1 ratios', ['1 1 ratios.md'])).toBe('1 1 ratios 2.md');
  });
});
