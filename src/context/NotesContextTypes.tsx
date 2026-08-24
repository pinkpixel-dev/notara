import React, { createContext } from 'react';
import { Note, NoteTag, VisionBoard } from '../types';
import type { NotesBundle } from '@/lib/filesystem';
import type { CreateNotesResult, NoteFilesStatus, SaveOptions } from './notes/useNoteFiles';
import type { MigrationResult, PendingMigration } from '@/lib/notes/migrate';
import type { NoteLoadFailure } from '@/lib/notes/load';

/**
 * How many notes may be pinned at once.
 *
 * The pinned section earns its place at the top of the notes bar only while it
 * stays short enough to scan without scrolling.
 */
export const PIN_LIMIT = 5;

/**
 * The outcome of a pin attempt, so the caller can explain a refusal.
 *
 * The success case declares `reason` as always absent rather than leaving it
 * off. This project compiles with `strictNullChecks` disabled, and without it a
 * boolean discriminant does not narrow a union, so `result.reason` after an
 * `ok` check was a type error at every call site.
 */
export type PinResult = { ok: true; reason?: undefined } | { ok: false; reason: string };

export interface NotesContextType {
  notes: Note[];
  tags: NoteTag[];
  visionBoards: VisionBoard[];
  activeNote: Note | null;
  /**
   * Where the workspace load has got to.
   *
   * Notes are files, so there is a real state between "no folder chosen" and
   * "here are your notes" that the interface has to be able to show.
   */
  notesStatus: NoteFilesStatus;
  /** Message from the last failed load or save, if any. */
  notesError: string | null;
  /** Files that could not be read, so the interface can name them. */
  noteFailures: NoteLoadFailure[];
  /** Rescans the workspace folder and reloads every note from disk. */
  reloadNotes: () => Promise<void>;
  /**
   * Creates a note as a new Markdown file and returns it.
   *
   * Async because the file has to be written before the note exists. The
   * returned note carries the path that was actually used, which can differ
   * from the requested title when the filesystem would not accept it.
   */
  /** Notes still in the old storage, waiting for the user to say yes. */
  pendingMigration: PendingMigration | null;
  /** Imports them. Nothing is removed from the old storage. */
  runMigration: () => Promise<MigrationResult | null>;
  /** Puts the offer away for this session. */
  dismissMigration: () => void;
  addNote: (
    note: Partial<Note> & {
      /** Folder to create the note in. Empty or absent is the workspace root. */
      directory?: string;
    }
  ) => Promise<Note>;
  /**
   * Creates several notes at once, for importing.
   *
   * Every file name is allocated before anything is written, so importing two
   * files with the same name produces two notes rather than one overwriting
   * the other. A file that fails does not stop the rest; it comes back in
   * `failures` instead.
   */
  addNotes: (
    notes: Array<Partial<Note>>,
    directory?: string
  ) => Promise<CreateNotesResult>;
  /**
   * Writes changes to a note's file.
   *
   * Changing the title renames the file, so the returned note may have a
   * different `id` and `path` than the one passed in.
   */
  updateNote: (
    id: string,
    note: Partial<Note>,
    options?: SaveOptions
  ) => Promise<Note | null>;
  /**
   * Moves a note's Markdown file into another workspace folder.
   *
   * Pinning and starring are unaffected, and the note keeps its title. Only the
   * file's directory changes.
   */
  moveNote: (id: string, directory: string) => Promise<Note | null>;
  /**
   * Re-reads a note from disk and drops the in-memory version.
   *
   * This is how a conflict is resolved in favour of whatever is on disk.
   */
  reloadNote: (id: string) => Promise<Note | null>;
  deleteNote: (id: string) => Promise<void>;
  /**
   * Pins or unpins a note. Pinning past `PIN_LIMIT` is refused rather than
   * silently dropping an older pin, because a pin the user chose should never
   * disappear without being told.
   */
  togglePin: (id: string) => Promise<PinResult>;
  toggleStar: (id: string) => Promise<void>;
  addTag: (tag: Partial<NoteTag>) => void;
  updateTag: (id: string, tag: Partial<NoteTag>) => void;
  /** Removes a tag and rewrites every note file that carried it. */
  deleteTag: (id: string) => Promise<void>;
  setActiveNote: (note: Note | null) => void;
  addVisionBoard: (visionBoard: Partial<VisionBoard>) => VisionBoard;
  updateVisionBoard: (id: string, visionBoard: Partial<VisionBoard>) => void;
  deleteVisionBoard: (id: string) => void;
  getCurrentBundle: () => NotesBundle;
  /** Writes tags and vision boards. Notes save themselves, one file at a time. */
  persistBundle: (bundle?: NotesBundle) => Promise<void>;
}

export const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const useNotes = (): NotesContextType => {
  const context = React.useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};
