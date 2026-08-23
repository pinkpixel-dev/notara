/**
 * Reading and writing note files in the workspace.
 *
 * Both runtimes are handled here so callers never branch on which build they
 * are in. The two are not equivalent and the difference is worth knowing:
 *
 * - Desktop writes go through the Rust command, which writes to a temporary
 *   sibling and renames it over the target. An interrupted save cannot leave a
 *   truncated note.
 * - Browser writes go through the File System Access API, which has no atomic
 *   replace. A save that dies midway can leave a partial file. Nothing in the
 *   web platform fixes this, so the hosted build accepts it rather than
 *   pretending otherwise.
 *
 * Both carry the same revision guard, so an edit that landed underneath Notara
 * is refused on either runtime instead of being overwritten.
 */
import { readTextFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { fileSystemHelpers, type RootDirectoryHandle } from '@/lib/filesystem';

/** A note file's contents plus the revision it was read at. */
export interface NoteFileRead {
  contents: string;
  revision: string;
}

export interface NoteFileWrite {
  /** Workspace-relative path actually written. */
  path: string;
  revision: string;
}

/** Raised when a file changed between the read and the write. */
export class NoteConflictError extends Error {
  constructor(public readonly path: string) {
    super(`${path} changed outside Notara since it was opened.`);
    this.name = 'NoteConflictError';
  }
}

/** Wording the Rust side uses for a refused write, matched to raise the right error. */
const CONFLICT_MARKER = 'changed outside Notara';

const segmentsOf = (relativePath: string): string[] =>
  relativePath.split('/').filter((segment) => segment.length > 0);

/**
 * Builds a revision string for the browser runtime.
 *
 * The shape matches what Rust produces, modified time in nanoseconds and byte
 * length, so the two are at least comparable at a glance in a log. A revision
 * is only ever compared against one produced by the same runtime, so the fact
 * that the browser's clock resolution is coarser does not cause false
 * conflicts.
 */
const browserRevision = (file: File): string =>
  `${file.lastModified * 1_000_000}-${file.size}`;

const browserFileHandle = async (
  root: FileSystemDirectoryHandle,
  relativePath: string,
  create: boolean
): Promise<FileSystemFileHandle> => {
  const segments = segmentsOf(relativePath);
  const fileName = segments.pop();
  if (!fileName) {
    throw new Error('A note path cannot be empty.');
  }

  let directory = root;
  for (const segment of segments) {
    directory = await directory.getDirectoryHandle(segment, { create });
  }

  return directory.getFileHandle(fileName, { create });
};

/** Reads a note file and the revision it was read at. */
export const readNoteFile = async (
  root: RootDirectoryHandle,
  relativePath: string
): Promise<NoteFileRead> => {
  if (root.kind === 'tauri') {
    const absolute = await join(root.path, ...segmentsOf(relativePath));
    const contents = await readTextFile(absolute);
    const revision = await invoke<string | null>('workspace_note_revision', { relativePath });

    return { contents, revision: revision ?? '' };
  }

  const handle = await browserFileHandle(root.handle, relativePath, false);
  const file = await handle.getFile();

  return { contents: await file.text(), revision: browserRevision(file) };
};

/**
 * Reads the revision of a note file without reading the note.
 *
 * Returns null when the file is gone, which is how a caller tells "deleted"
 * apart from "changed".
 */
export const readNoteRevision = async (
  root: RootDirectoryHandle,
  relativePath: string
): Promise<string | null> => {
  if (root.kind === 'tauri') {
    return invoke<string | null>('workspace_note_revision', { relativePath });
  }

  try {
    const handle = await browserFileHandle(root.handle, relativePath, false);
    return browserRevision(await handle.getFile());
  } catch (error) {
    if ((error as DOMException)?.name === 'NotFoundError') {
      return null;
    }
    throw error;
  }
};

/**
 * Writes a note file.
 *
 * `expectedRevision` is the revision the caller last read. Pass null for a new
 * note, which accepts whatever is on disk. Passing a revision that no longer
 * matches raises `NoteConflictError` rather than overwriting, so the interface
 * can ask the user instead of choosing for them.
 */
export const writeNoteFile = async (
  root: RootDirectoryHandle,
  relativePath: string,
  contents: string,
  expectedRevision: string | null
): Promise<NoteFileWrite> => {
  if (root.kind === 'tauri') {
    try {
      return await invoke<NoteFileWrite>('write_workspace_note', {
        relativePath,
        contents,
        expectedRevision,
      });
    } catch (error) {
      const message = typeof error === 'string' ? error : String(error);
      if (message.includes(CONFLICT_MARKER)) {
        throw new NoteConflictError(relativePath);
      }
      throw new Error(message);
    }
  }

  // The check and the write are two separate steps here, so a change landing
  // between them is not caught. The File System Access API offers nothing
  // better, and the alternative is no check at all.
  if (expectedRevision !== null) {
    const current = await readNoteRevision(root, relativePath);
    if (current !== null && current !== expectedRevision) {
      throw new NoteConflictError(relativePath);
    }
  }

  const handle = await browserFileHandle(root.handle, relativePath, true);
  const writable = await handle.createWritable();
  await writable.write(contents);
  await writable.close();

  return { path: relativePath, revision: browserRevision(await handle.getFile()) };
};

/** Removes a note file. A path that is already gone is not an error. */
export const deleteNoteFile = async (
  root: RootDirectoryHandle,
  relativePath: string
): Promise<void> => {
  await fileSystemHelpers.deleteEntry(root, segmentsOf(relativePath));
};

/**
 * Moves a note to a new path, which is how a title change reaches the disk.
 *
 * The new file is written before the old one is removed. Doing it the other way
 * round means a failure between the two steps loses the note, while this order
 * means a failure leaves a duplicate. A duplicate is annoying and fixable; a
 * missing note is neither.
 */
export const moveNoteFile = async (
  root: RootDirectoryHandle,
  fromPath: string,
  toPath: string,
  contents: string,
  expectedRevision: string | null
): Promise<NoteFileWrite> => {
  if (fromPath === toPath) {
    return writeNoteFile(root, toPath, contents, expectedRevision);
  }

  // The guard belongs on the file being replaced, so it is checked against the
  // original path here and the new path is written fresh.
  if (expectedRevision !== null) {
    const current = await readNoteRevision(root, fromPath);
    if (current !== null && current !== expectedRevision) {
      throw new NoteConflictError(fromPath);
    }
  }

  const written = await writeNoteFile(root, toPath, contents, null);
  await deleteNoteFile(root, fromPath);

  return written;
};
