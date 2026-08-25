import { describe, expect, it } from 'vitest';
import { buildDiffRows, collapseContext, previewRows, summarizeDiff } from '../diff';

describe('buildDiffRows', () => {
  it('marks added, removed, and unchanged lines', () => {
    const rows = buildDiffRows('one\ntwo\nthree', 'one\ntwo changed\nthree');

    expect(rows.map((row) => `${row.type}:${row.text}`)).toEqual([
      'context:one',
      'removed:two',
      'added:two changed',
      'context:three',
    ]);
  });

  it('numbers lines on the side each one exists', () => {
    const rows = buildDiffRows('a\nb', 'a\nc');

    expect(rows[0]).toMatchObject({ beforeLine: 1, afterLine: 1 });
    expect(rows[1]).toMatchObject({ type: 'removed', beforeLine: 2 });
    expect(rows[1].afterLine).toBeUndefined();
    expect(rows[2]).toMatchObject({ type: 'added', afterLine: 2 });
    expect(rows[2].beforeLine).toBeUndefined();
  });

  it('treats writing a new file as all additions', () => {
    const rows = buildDiffRows('', 'first\nsecond');

    expect(summarizeDiff(rows)).toEqual({ added: 2, removed: 0 });
  });

  it('does not invent a line from a trailing newline', () => {
    const rows = buildDiffRows('a\n', 'a\nb\n');

    expect(summarizeDiff(rows)).toEqual({ added: 1, removed: 0 });
  });

  it('finds nothing to show when the text is the same', () => {
    expect(summarizeDiff(buildDiffRows('same\ntext', 'same\ntext'))).toEqual({
      added: 0,
      removed: 0,
    });
  });
});

describe('collapseContext', () => {
  const long = Array.from({ length: 30 }, (_, index) => `line ${index}`).join('\n');
  const changed = long.replace('line 15', 'line fifteen');

  it('keeps context around a change and collapses the rest', () => {
    const rows = collapseContext(buildDiffRows(long, changed), 2);
    const gaps = rows.filter((row) => row.type === 'gap');

    expect(gaps).toHaveLength(2);
    expect(gaps[0].text).toBe('13 unchanged lines');
    expect(rows.filter((row) => row.type === 'added')).toHaveLength(1);
  });

  it('says how many lines one hidden line stands for', () => {
    const rows = collapseContext(buildDiffRows('a\nb\nc', 'a\nb\nchanged'), 1);

    expect(rows.find((row) => row.type === 'gap')?.text).toBe('1 unchanged line');
  });

  it('leaves a short diff alone', () => {
    const rows = buildDiffRows('a\nb', 'a\nc');

    expect(collapseContext(rows, 3)).toEqual(rows);
  });
});

describe('previewRows', () => {
  it('takes only changed lines, up to the limit', () => {
    const before = Array.from({ length: 20 }, (_, index) => `line ${index}`).join('\n');
    const after = before.replace(/line/g, 'row');

    const preview = previewRows(buildDiffRows(before, after), 4);

    expect(preview.rows).toHaveLength(4);
    expect(preview.rows.every((row) => row.type === 'added' || row.type === 'removed')).toBe(true);
    expect(preview.hidden).toBe(36);
  });

  it('reports nothing hidden for a small change', () => {
    const preview = previewRows(buildDiffRows('a', 'b'), 6);

    expect(preview.hidden).toBe(0);
  });
});
