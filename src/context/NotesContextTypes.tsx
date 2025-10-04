import React, { createContext } from 'react';
import { Note, NoteTag, VisionBoard } from '../types';
import type { NotesBundle } from '@/lib/filesystem';

export interface NotesContextType {
  notes: Note[];
  tags: NoteTag[];
  visionBoards: VisionBoard[];
  activeNote: Note | null;
  addNote: (note: Partial<Note>) => Note;
  updateNote: (id: string, note: Partial<Note>) => Note | null;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
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
