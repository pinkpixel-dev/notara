/**
 * The shape the notes sidebar draws.
 *
 * This builds one tree out of two inputs: the notes, which know their own file
 * path, and the directory list from the workspace scan, which is what lets an
 * empty folder still appear. The result is deliberately not the raw filesystem
 * tree:
 *
 * - The workspace root is not a node. Its folders are the top level and its
 *   loose notes become an Uncategorized group at the bottom, so the sidebar
 *   opens showing the user's own structure rather than one folder to expand.
 * - Pinned notes are lifted out to the top and do not appear in their folder
 *   while pinned. Pinning does not move the file; this is only where the row is
 *   drawn.
 */
import type { Note } from '@/types';
import { nameOf, parentOf } from '@/lib/workspace/types';

export interface NoteTreeFolder {
  /** Workspace-relative path. Never empty, because the root is not a folder here. */
  path: string;
  name: string;
  folders: NoteTreeFolder[];
  notes: Note[];
  /**
   * Notes listed under this folder and everything below it.
   *
   * This counts rows the user can see, not files on disk, so a pinned note that
   * has been lifted to the top is not included. A count that disagreed with the
   * rows under it would just look like a bug.
   */
  noteCount: number;
}

export interface NoteTree {
  /** Pinned notes, newest first, drawn above everything else. */
  pinned: Note[];
  /** Top-level folders of the workspace. */
  folders: NoteTreeFolder[];
  /** Unpinned notes sitting loose at the workspace root. */
  uncategorized: Note[];
  /** Total rows in the tree, pinned included. */
  total: number;
}

/** Newest first, which is how a notes list is normally read. */
const byNewest = (left: Note, right: Note): number =>
  new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

/** Folder order, ignoring case, the way a file manager sorts. */
const byName = (left: { name: string }, right: { name: string }): number =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });

/**
 * Builds the sidebar tree.
 *
 * `directoryPaths` comes from the workspace scan rather than from the notes, so
 * a folder the user just created shows up before it holds anything.
 */
export const buildNoteTree = (notes: Note[], directoryPaths: string[]): NoteTree => {
  const folders = new Map<string, NoteTreeFolder>();

  /** Creates a folder and every folder above it, so a deep path is reachable. */
  const ensureFolder = (path: string): NoteTreeFolder | null => {
    if (path === '') {
      return null;
    }

    const existing = folders.get(path);
    if (existing) {
      return existing;
    }

    const folder: NoteTreeFolder = {
      path,
      name: nameOf(path),
      folders: [],
      notes: [],
      noteCount: 0,
    };
    folders.set(path, folder);

    const parent = ensureFolder(parentOf(path));
    if (parent) {
      parent.folders.push(folder);
    }

    return folder;
  };

  directoryPaths.forEach((path) => {
    ensureFolder(path);
  });

  const pinned: Note[] = [];
  const uncategorized: Note[] = [];

  notes.forEach((note) => {
    if (note.isPinned) {
      pinned.push(note);
      return;
    }

    const folder = ensureFolder(parentOf(note.path));
    if (folder) {
      folder.notes.push(note);
    } else {
      uncategorized.push(note);
    }
  });

  // Counts have to be finished from the bottom up, so a parent can add up
  // children that have already counted themselves.
  const settle = (folder: NoteTreeFolder): number => {
    folder.folders.sort(byName);
    folder.notes.sort(byNewest);
    folder.noteCount =
      folder.notes.length + folder.folders.reduce((total, child) => total + settle(child), 0);
    return folder.noteCount;
  };

  const topLevel = Array.from(folders.values()).filter(
    (folder) => parentOf(folder.path) === ''
  );
  topLevel.forEach(settle);
  topLevel.sort(byName);

  pinned.sort(byNewest);
  uncategorized.sort(byNewest);

  return {
    pinned,
    folders: topLevel,
    uncategorized,
    total: notes.length,
  };
};

/** Every folder path in the tree, so a caller can expand or collapse all of them. */
export const allFolderPaths = (folders: NoteTreeFolder[]): string[] =>
  folders.flatMap((folder) => [folder.path, ...allFolderPaths(folder.folders)]);
