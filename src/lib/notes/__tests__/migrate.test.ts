import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_NOTES_STORAGE_KEY, findLegacyNotes, legacyTitle } from '../migrate';
import { fileSystemHelpers, type RootDirectoryHandle } from '@/lib/filesystem';

/** A stand-in root. Nothing in these tests touches it beyond identity. */
const root = { kind: 'browser', name: 'workspace' } as unknown as RootDirectoryHandle;

/**
 * Stubs the two JSON reads `findLegacyNotes` makes, keyed by path.
 *
 * The marker read comes first and decides whether anything else runs, so both
 * have to be controllable independently.
 */
const stubReads = (values: { marker?: unknown; bundle?: unknown }) =>
  vi.spyOn(fileSystemHelpers, 'readJSON').mockImplementation(
    async (_root: RootDirectoryHandle, segments: string[]) => {
      const path = segments.join('/');
      if (path.endsWith('notes-migrated.json')) {
        return (values.marker ?? null) as never;
      }
      return (values.bundle ?? null) as never;
    }
  );

/**
 * A minimal `window.localStorage`.
 *
 * These tests run without a DOM, and the module under test reads browser
 * storage directly. A few lines of stub is cheaper than pulling a whole DOM
 * implementation in for one property.
 */
const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  // Every path that finds nothing records a marker, so this is stubbed for all
  // of them. Tests that care about it re-spy to assert on the calls.
  vi.spyOn(fileSystemHelpers, 'writeJSON').mockResolvedValue(undefined as never);
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };
});

const setBrowserNotes = (value: string | null) => {
  if (value === null) {
    store.delete(LEGACY_NOTES_STORAGE_KEY);
    return;
  }
  store.set(LEGACY_NOTES_STORAGE_KEY, value);
};

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as { window?: unknown }).window;
});

describe('legacyTitle', () => {
  it('uses the stored title', () => {
    expect(legacyTitle({ title: 'Groceries' })).toBe('Groceries');
  });

  it('trims surrounding space', () => {
    expect(legacyTitle({ title: '  Groceries  ' })).toBe('Groceries');
  });

  it('falls back when the title is missing or blank', () => {
    expect(legacyTitle({})).toBe('Untitled');
    expect(legacyTitle({ title: '   ' })).toBe('Untitled');
  });
});

describe('findLegacyNotes', () => {
  it('finds nothing once the migration has already run', async () => {
    // The marker short-circuits everything, even with notes still sitting in
    // browser storage, so an imported workspace is not offered them twice.
    stubReads({ marker: { version: 1, migratedAt: 'x', noteCount: 3 } });
    setBrowserNotes(JSON.stringify([{ title: 'Old' }]));

    expect(await findLegacyNotes(root)).toBeNull();
  });

  it('records a marker and finds nothing when there is no old data', async () => {
    const write = vi.spyOn(fileSystemHelpers, 'writeJSON').mockResolvedValue(undefined as never);
    stubReads({});

    expect(await findLegacyNotes(root)).toBeNull();
    // Recorded so a workspace that never had old data is not searched again.
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('finds notes in the workspace JSON bundle', async () => {
    stubReads({ bundle: { notes: [{ title: 'One' }, { title: 'Two' }] } });

    const pending = await findLegacyNotes(root);
    expect(pending?.total).toBe(2);
    expect(pending?.titles).toEqual(['One', 'Two']);
    expect(pending?.found.map((entry) => entry.source)).toEqual(['workspace-json']);
  });

  it('finds notes in browser storage', async () => {
    stubReads({});
    setBrowserNotes(JSON.stringify([{ title: 'From the browser' }]));

    const pending = await findLegacyNotes(root);
    expect(pending?.total).toBe(1);
    expect(pending?.found.map((entry) => entry.source)).toEqual(['browser-storage']);
  });

  it('reports both sources together', async () => {
    stubReads({ bundle: { notes: [{ title: 'In the folder' }] } });
    setBrowserNotes(JSON.stringify([{ title: 'In the browser' }]));

    const pending = await findLegacyNotes(root);
    expect(pending?.total).toBe(2);
    expect(pending?.titles).toEqual(['In the folder', 'In the browser']);
    expect(pending?.found.map((entry) => entry.source)).toEqual([
      'workspace-json',
      'browser-storage',
    ]);
  });

  it('does not write a marker when there is something to offer', async () => {
    // Nothing may be recorded before the user has actually said yes.
    const write = vi.spyOn(fileSystemHelpers, 'writeJSON').mockResolvedValue(undefined as never);
    stubReads({ bundle: { notes: [{ title: 'One' }] } });

    await findLegacyNotes(root);
    expect(write).not.toHaveBeenCalled();
  });

  it('treats unparseable browser storage as empty', async () => {
    stubReads({});
    setBrowserNotes('{not json');

    expect(await findLegacyNotes(root)).toBeNull();
  });

  it('ignores browser storage holding something that is not a list', async () => {
    stubReads({});
    setBrowserNotes(JSON.stringify({ notes: 'nope' }));

    expect(await findLegacyNotes(root)).toBeNull();
  });

  it('names untitled records so the preview is never blank', async () => {
    stubReads({ bundle: { notes: [{ content: 'body only' }] } });

    expect((await findLegacyNotes(root))?.titles).toEqual(['Untitled']);
  });
});
