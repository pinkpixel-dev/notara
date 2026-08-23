import React, { createContext } from 'react';
import { Note, NoteTag, VisionBoard } from '../types';
import type { NotesBundle } from '@/lib/filesystem';

/**
 * How many notes may be pinned at once.
 *
 * The pinned section earns its place at the top of the notes bar only while it
 * stays short enough to scan without scrolling.
 */
export const PIN_LIMIT = 5;

/** The outcome of a pin attempt, so the caller can explain a refusal. */
export type PinResult = { ok: true } | { ok: false; reason: string };

export interface NotesContextType {
  notes: Note[];
  tags: NoteTag[];
  visionBoards: VisionBoard[];
  activeNote: Note | null;
  addNote: (note: Partial<Note>) => Note;
  updateNote: (id: string, note: Partial<Note>) => Note | null;
  deleteNote: (id: string) => void;
  /**
   * Pins or unpins a note. Pinning past `PIN_LIMIT` is refused rather than
   * silently dropping an older pin, because a pin the user chose should never
   * disappear without being told.
   */
  togglePin: (id: string) => PinResult;
  toggleStar: (id: string) => void;
  addTag: (tag: Partial<NoteTag>) => void;
  updateTag: (id: string, tag: Partial<NoteTag>) => void;
  deleteTag: (id: string) => void;
  setActiveNote: (note: Note | null) => void;
  addVisionBoard: (visionBoard: Partial<VisionBoard>) => VisionBoard;
  updateVisionBoard: (id: string, visionBoard: Partial<VisionBoard>) => void;
  deleteVisionBoard: (id: string) => void;
  getCurrentBundle: () => NotesBundle;
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
