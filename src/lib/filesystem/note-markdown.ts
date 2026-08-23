/**
 * The Markdown mirror written beside the notes JSON.
 *
 * This is still a one-way mirror: Notara writes it and never reads it back.
 * Stage 2 of the Markdown workspace work replaces it with real files that are
 * the source of truth, at which point this module goes away.
 */
import type { Note, NoteTag } from '@/types';

export const noteMarkdownFileName = (note: Note): string => `note-${note.id}.md`;

const escapeYamlValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const formatTagList = (tags: NoteTag[]): string => {
  if (!tags.length) {
    return '[]';
  }
  const rendered = tags.map((tag) => `"${escapeYamlValue(tag.name)}"`).join(', ');
  return `[${rendered}]`;
};

export const buildNoteMarkdown = (note: Note): string => {
  const metadata = [
    '---',
    `id: ${note.id}`,
    `title: "${escapeYamlValue(note.title || 'Untitled')}"`,
    `createdAt: ${note.createdAt}`,
    `updatedAt: ${note.updatedAt}`,
    `isPinned: ${note.isPinned}`,
    `tags: ${formatTagList(note.tags)}`,
    '---',
    '',
  ];

  return [...metadata, note.content || ''].join('\n');
};
