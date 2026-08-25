/**
 * The shapes `useNoteFiles` works in.
 *
 * Split out of the hook so the file that does the work stays under the
 * repository's 500-line limit. Nothing here has behaviour; it is the input,
 * output, and result types for creating, saving, moving, and deleting a note.
 * `useNoteFiles` re-exports all of it, so callers can keep importing from
 * either place.
 */
import type { Note, NoteTag } from '@/types';
import type { NoteLoadFailure } from '@/lib/notes/load';
import type { MigrationResult, PendingMigration } from '@/lib/notes/migrate';

export type NoteFilesStatus = 'no-workspace' | 'loading' | 'ready' | 'error';

/** The fields a caller may set when creating or changing a note. */
export interface NoteInput {
  title?: string;
  content?: string;
  tags?: NoteTag[];
  isPinned?: boolean;
  isStarred?: boolean;
  createdAt?: string;
  /** Folder to create the note in. Defaults to the workspace root. */
  directory?: string;
  /** Refuse creation if the currently available path is not this exact path. */
  expectedPath?: string;
}

/** A note in a batch that could not be written. */
export interface NoteWriteFailure {
  title: string;
  message: string;
}

/** What a batch create managed, and what it did not. */
export interface CreateNotesResult {
  created: Note[];
  failures: NoteWriteFailure[];
}

/** Options for a save that is not a plain edit. */
export interface SaveOptions {
  /**
   * Write even though the file changed underneath Notara.
   *
   * Only set after the user has seen the conflict and chosen to keep their
   * version. The previous contents are still backed up before the overwrite.
   */
  force?: boolean;
}

export interface NoteFilesApi {
  notes: Note[];
  status: NoteFilesStatus;
  /** Files that could not be read, so the interface can name them. */
  failures: NoteLoadFailure[];
  lastError: string | null;
  /** Tags discovered inside note files, merged with the ones already known. */
  discoveredTags: NoteTag[];
  reload: () => Promise<void>;
  /** Old notes waiting to be imported, or null when there are none. */
  pendingMigration: PendingMigration | null;
  /** Imports those notes. Only called after the user has seen them. */
  runMigration: () => Promise<MigrationResult | null>;
  /** Puts the offer away for this session. */
  dismissMigration: () => void;
  createNote: (input: NoteInput) => Promise<Note>;
  /**
   * Creates several notes at once, allocating every file name before writing
   * any of them so a batch cannot collide with itself.
   */
  createNotes: (inputs: NoteInput[], directory?: string) => Promise<CreateNotesResult>;
  saveNote: (id: string, input: NoteInput, options?: SaveOptions) => Promise<Note | null>;
  /** Moves a note's file into another workspace folder. */
  moveNote: (id: string, directory: string) => Promise<Note | null>;
  /** Re-reads a note from disk, dropping any in-memory version. */
  reloadNote: (id: string) => Promise<Note | null>;
  removeNote: (id: string) => Promise<void>;
}
