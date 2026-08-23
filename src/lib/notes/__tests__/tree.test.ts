import { describe, expect, it } from 'vitest';
import type { Note } from '@/types';
import { allFolderPaths, buildNoteTree } from '../tree';

let clock = 0;

/** A note at `path`. Each one gets a later timestamp than the last. */
const note = (path: string, overrides: Partial<Note> = {}): Note => {
  clock += 1000;
  return {
    id: path,
    path,
    revision: null,
    title: path.split('/').pop()!.replace(/\.md$/, ''),
    content: '',
    createdAt: new Date(clock).toISOString(),
    updatedAt: new Date(clock).toISOString(),
    tags: [],
    isPinned: false,
    isStarred: false,
    ...overrides,
  };
};

describe('buildNoteTree', () => {
  it('makes top-level folders the top level, with no root wrapper', () => {
    const tree = buildNoteTree(
      [note('Guides/About.md'), note('Linux/NPM error.md')],
      ['Guides', 'Linux']
    );

    expect(tree.folders.map((folder) => folder.name)).toEqual(['Guides', 'Linux']);
    expect(tree.folders.map((folder) => folder.path)).toEqual(['Guides', 'Linux']);
  });

  it('puts loose notes at the root into uncategorized', () => {
    const tree = buildNoteTree([note('Scratch.md'), note('Guides/About.md')], ['Guides']);

    expect(tree.uncategorized.map((entry) => entry.path)).toEqual(['Scratch.md']);
    expect(tree.folders[0].notes.map((entry) => entry.path)).toEqual(['Guides/About.md']);
  });

  it('nests folders and reaches a deep path even when only the leaf is listed', () => {
    const tree = buildNoteTree([note('Pink Pixel/drop/Post.md')], ['Pink Pixel/drop']);

    expect(tree.folders).toHaveLength(1);
    expect(tree.folders[0].name).toBe('Pink Pixel');
    expect(tree.folders[0].folders[0].name).toBe('drop');
    expect(tree.folders[0].folders[0].notes).toHaveLength(1);
  });

  it('shows a folder the scan found even when it holds nothing', () => {
    const tree = buildNoteTree([], ['Empty']);

    expect(tree.folders.map((folder) => folder.name)).toEqual(['Empty']);
    expect(tree.folders[0].noteCount).toBe(0);
  });

  describe('pinned notes', () => {
    it('lifts a pinned note to the top', () => {
      const tree = buildNoteTree(
        [note('Guides/About.md', { isPinned: true })],
        ['Guides']
      );

      expect(tree.pinned.map((entry) => entry.path)).toEqual(['Guides/About.md']);
    });

    it('removes it from the folder it came from', () => {
      const tree = buildNoteTree(
        [note('Guides/About.md', { isPinned: true }), note('Guides/Using.md')],
        ['Guides']
      );

      expect(tree.folders[0].notes.map((entry) => entry.path)).toEqual(['Guides/Using.md']);
    });

    it('leaves the folder count matching the rows still under it', () => {
      const tree = buildNoteTree(
        [note('Guides/About.md', { isPinned: true }), note('Guides/Using.md')],
        ['Guides']
      );

      expect(tree.folders[0].noteCount).toBe(1);
    });

    it('lifts a pinned note out of uncategorized too', () => {
      const tree = buildNoteTree([note('Scratch.md', { isPinned: true })], []);

      expect(tree.pinned).toHaveLength(1);
      expect(tree.uncategorized).toEqual([]);
    });

    it('still counts a pinned note in the total', () => {
      const tree = buildNoteTree(
        [note('Guides/About.md', { isPinned: true }), note('Guides/Using.md')],
        ['Guides']
      );

      expect(tree.total).toBe(2);
    });
  });

  describe('counts', () => {
    it('includes notes in nested folders', () => {
      const tree = buildNoteTree(
        [note('Pink Pixel/One.md'), note('Pink Pixel/drop/Two.md'), note('Pink Pixel/drop/Three.md')],
        ['Pink Pixel', 'Pink Pixel/drop']
      );

      expect(tree.folders[0].noteCount).toBe(3);
      expect(tree.folders[0].folders[0].noteCount).toBe(2);
    });
  });

  describe('ordering', () => {
    it('sorts folders by name, ignoring case', () => {
      const tree = buildNoteTree([], ['zebra', 'Apple', 'banana']);

      expect(tree.folders.map((folder) => folder.name)).toEqual(['Apple', 'banana', 'zebra']);
    });

    it('sorts notes newest first', () => {
      const older = note('Guides/Older.md');
      const newer = note('Guides/Newer.md');
      const tree = buildNoteTree([older, newer], ['Guides']);

      expect(tree.folders[0].notes.map((entry) => entry.title)).toEqual(['Newer', 'Older']);
    });

    it('sorts pinned notes newest first as well', () => {
      const older = note('A.md', { isPinned: true });
      const newer = note('B.md', { isPinned: true });
      const tree = buildNoteTree([older, newer], []);

      expect(tree.pinned.map((entry) => entry.title)).toEqual(['B', 'A']);
    });
  });
});

describe('allFolderPaths', () => {
  it('lists every folder, nested ones included', () => {
    const tree = buildNoteTree(
      [note('Pink Pixel/drop/Post.md'), note('Guides/About.md')],
      ['Pink Pixel/drop', 'Guides']
    );

    expect(allFolderPaths(tree.folders).sort()).toEqual([
      'Guides',
      'Pink Pixel',
      'Pink Pixel/drop',
    ]);
  });
});
