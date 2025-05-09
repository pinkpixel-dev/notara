import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Note, NoteTag, MoodBoard } from '../types';
import { NotesContext } from './NotesContextTypes';

const defaultTags: NoteTag[] = [
  { id: '1', name: 'Personal', color: '#9b87f5' },
  { id: '2', name: 'Work', color: '#0EA5E9' },
  { id: '3', name: 'Ideas', color: '#10B981' },
  { id: '4', name: 'Important', color: '#F97316' },
];

const defaultNotes: Note[] = [
  {
    id: '1',
    title: 'Welcome to Notara',
    content: `# Welcome to Notara!

Notara is a beautiful note-taking app with a cosmic theme and powerful features.

## Features
- Write in Markdown
- Organize with tags
- Visualize connections with Constellation View
- Create mood boards
- Use AI assistance

Get started by creating your first note!`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [defaultTags[0], defaultTags[2]],
    isPinned: true
  },
  {
    id: '2',
    title: 'Markdown Cheat Sheet',
    content: `# Markdown Cheat Sheet

## Headers
# H1
## H2
### H3

## Emphasis
*italic*
**bold**
~~strikethrough~~

## Lists
- Item 1
- Item 2
  - Subitem

1. Item 1
2. Item 2

## Links & Images
[Link](https://example.com)
![Image Alt](https://example.com/image.jpg)

## Code
\`inline code\`

\`\`\`
// code block
function hello() {
  console.log("Hello Notara!");
}
\`\`\`

## Blockquotes
> This is a blockquote

## Tables
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [defaultTags[2]],
    isPinned: false
  }
];

const defaultMoodBoards: MoodBoard[] = [
  {
    id: '1',
    name: 'Project Inspiration',
    items: [
      {
        id: '1',
        type: 'image',
        content: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
        position: { x: 50, y: 50 },
        size: { width: 200, height: 150 }
      },
      {
        id: '2',
        type: 'text',
        content: 'Key project goals for Q3',
        position: { x: 300, y: 100 }
      }
    ]
  }
];

export const NotesProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>(
    JSON.parse(localStorage.getItem('notara-notes') || JSON.stringify(defaultNotes))
  );
  const [tags, setTags] = useState<NoteTag[]>(
    JSON.parse(localStorage.getItem('notara-tags') || JSON.stringify(defaultTags))
  );
  const [moodBoards, setMoodBoards] = useState<MoodBoard[]>(
    JSON.parse(localStorage.getItem('notara-moodboards') || JSON.stringify(defaultMoodBoards))
  );
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  // Sync to localStorage when data changes
  useEffect(() => {
    localStorage.setItem('notara-notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('notara-tags', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem('notara-moodboards', JSON.stringify(moodBoards));
  }, [moodBoards]);

  const addNote = (note: Partial<Note>) => {
    // Allow overriding createdAt if provided, otherwise use current time
    const now = new Date().toISOString();
    const newNote: Note = {
      id: uuidv4(),
      title: note.title || 'Untitled',
      content: note.content || '',
      createdAt: note.createdAt || now,
      updatedAt: now,
      tags: note.tags || [],
      isPinned: note.isPinned || false
    };
    setNotes([...notes, newNote]);
    return newNote;
  };

  const updateNote = (id: string, note: Partial<Note>) => {
    setNotes(notes.map(n => {
      if (n.id === id) {
        return {
          ...n,
          ...note,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    }));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    if (activeNote?.id === id) {
      setActiveNote(null);
    }
  };

  const addTag = (tag: Partial<NoteTag>) => {
    const newTag: NoteTag = {
      id: uuidv4(),
      name: tag.name || 'New Tag',
      color: tag.color || '#9b87f5'
    };
    setTags([...tags, newTag]);
  };

  const updateTag = (id: string, tag: Partial<NoteTag>) => {
    setTags(tags.map(t => {
      if (t.id === id) {
        return { ...t, ...tag };
      }
      return t;
    }));
  };

  const deleteTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
    // Remove the tag from all notes
    setNotes(notes.map(note => ({
      ...note,
      tags: note.tags.filter(t => t.id !== id)
    })));
  };

  const addMoodBoard = (moodBoard: Partial<MoodBoard>) => {
    const newMoodBoard: MoodBoard = {
      id: uuidv4(),
      name: moodBoard.name || 'New Mood Board',
      items: moodBoard.items || []
    };
    setMoodBoards([...moodBoards, newMoodBoard]);
    return newMoodBoard;
  };

  const updateMoodBoard = (id: string, moodBoard: Partial<MoodBoard>) => {
    setMoodBoards(moodBoards.map(mb => {
      if (mb.id === id) {
        return { ...mb, ...moodBoard };
      }
      return mb;
    }));
  };

  const deleteMoodBoard = (id: string) => {
    setMoodBoards(moodBoards.filter(mb => mb.id !== id));
  };

  return (
    <NotesContext.Provider value={{
      notes,
      tags,
      moodBoards,
      activeNote,
      addNote,
      updateNote,
      deleteNote,
      addTag,
      updateTag,
      deleteTag,
      setActiveNote,
      addMoodBoard,
      updateMoodBoard,
      deleteMoodBoard,
    }}>
      {children}
    </NotesContext.Provider>
  );
};
