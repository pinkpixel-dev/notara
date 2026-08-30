import { describe, expect, it } from 'vitest';
import {
  findLiteralMatches,
  matchIndexAtOrAfter,
  replaceAllLiteralMatches,
  replaceLiteralMatch,
  stepMatchIndex,
} from '../find-replace';

describe('findLiteralMatches', () => {
  it('finds case variants and preserves textarea offsets', () => {
    expect(findLiteralMatches('Cat cat CAT', 'cat')).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
      { start: 8, end: 11 },
    ]);
  });

  it('treats regular expression syntax as literal text', () => {
    expect(findLiteralMatches('before [a].* after', '[a].*')).toEqual([{ start: 7, end: 12 }]);
  });

  it('reports offsets across lines', () => {
    expect(findLiteralMatches('one\ntwo\none', 'one')).toEqual([
      { start: 0, end: 3 },
      { start: 8, end: 11 },
    ]);
  });

  it('returns no matches for an empty query', () => {
    expect(findLiteralMatches('anything', '')).toEqual([]);
  });

  it('uses non-overlapping matches', () => {
    expect(findLiteralMatches('aaa', 'aa')).toEqual([{ start: 0, end: 2 }]);
    expect(findLiteralMatches('aaaa', 'aa')).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });
});

describe('match navigation', () => {
  const matches = [
    { start: 2, end: 5 },
    { start: 9, end: 12 },
  ];

  it('starts and wraps in either direction', () => {
    expect(stepMatchIndex(-1, 2, 1)).toBe(0);
    expect(stepMatchIndex(-1, 2, -1)).toBe(1);
    expect(stepMatchIndex(1, 2, 1)).toBe(0);
    expect(stepMatchIndex(0, 2, -1)).toBe(1);
    expect(stepMatchIndex(0, 0, 1)).toBe(-1);
  });

  it('uses a containing match, then the next match, then wraps', () => {
    expect(matchIndexAtOrAfter(matches, 3)).toBe(0);
    expect(matchIndexAtOrAfter(matches, 5)).toBe(1);
    expect(matchIndexAtOrAfter(matches, 7)).toBe(1);
    expect(matchIndexAtOrAfter(matches, 20)).toBe(0);
    expect(matchIndexAtOrAfter([], 0)).toBe(-1);
  });
});

describe('replacement', () => {
  it('replaces one exact match and returns the next search offset', () => {
    expect(replaceLiteralMatch('Cat cat', { start: 4, end: 7 }, 'dog')).toEqual({
      content: 'Cat dog',
      replacement: { start: 4, end: 7 },
      nextSearchFrom: 7,
    });
  });

  it('can delete a match and keeps replacement tokens literal', () => {
    expect(replaceLiteralMatch('one two', { start: 3, end: 7 }, '').content).toBe('one');
    expect(replaceLiteralMatch('one', { start: 0, end: 3 }, '$& $1').content).toBe('$& $1');
  });

  it('replaces every supplied match in one pass', () => {
    const content = 'Cat cat CAT';
    const matches = findLiteralMatches(content, 'cat');
    expect(replaceAllLiteralMatches(content, matches, 'dog')).toEqual({
      content: 'dog dog dog',
      count: 3,
    });
  });

  it('supports deletion, adjacent matches, and no matches', () => {
    expect(replaceAllLiteralMatches('aaaa', findLiteralMatches('aaaa', 'aa'), '')).toEqual({
      content: '',
      count: 2,
    });
    expect(replaceAllLiteralMatches('same', [], 'new')).toEqual({ content: 'same', count: 0 });
  });
});
