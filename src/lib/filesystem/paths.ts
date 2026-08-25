/**
 * Storage paths inside a workspace.
 *
 * Notara's own files live in `.notara`, which keeps the user's folder down to
 * their Markdown and one dot directory. The `data/` paths below are what
 * earlier versions wrote. Notara no longer writes notes there, but it still
 * reads them, because the one-time migration needs the old bundle to move
 * those notes into the workspace as real files.
 */

export const DATA_DIRECTORY = 'data';

export const NOTES_JSON_PATH = [DATA_DIRECTORY, 'notes', 'notes.json'];
export const TAGS_JSON_PATH = [DATA_DIRECTORY, 'notes', 'tags.json'];
export const LEGACY_NOTES_BUNDLE_PATH = [DATA_DIRECTORY, 'notes-bundle.json'];

/** Paths Notara no longer writes to, kept so existing data still loads. */
export const LEGACY_VISION_BOARDS_PATH = [DATA_DIRECTORY, 'vision-boards', 'vision-boards.json'];
export const LEGACY_TODOS_PATH = [DATA_DIRECTORY, 'todos', 'todos.json'];

/**
 * Directories created when a workspace is prepared.
 *
 * Todos, vision boards, media, AI conversations, and the old `notes/markdown`
 * mirror are absent on purpose. Those either moved into `.notara` or are no
 * longer written at all, and recreating their old homes would put empty folders
 * back beside the user's notes every time the app started.
 */
export const REQUIRED_DIRECTORIES: string[][] = [
  [DATA_DIRECTORY],
  [DATA_DIRECTORY, 'notes'],
  [DATA_DIRECTORY, 'settings'],
];

export const inferFileExtension = (mimeType?: string): string => {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'png';
  }
};

export const sanitizeFileSegment = (value: string): string => {
  const sanitized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'image';
};
