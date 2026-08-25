export interface NoteTag {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  /**
   * The note's workspace-relative file path, which is also its identity.
   *
   * Notes are Markdown files, so the file is the note. A path is unique within
   * a workspace by definition, so nothing has to invent an id or write one
   * into the user's frontmatter. Moving or renaming a note changes its id, and
   * every place holding one refreshes from the value the write returns.
   */
  id: string;
  /** The same value as `id`, named for what it is when the path is the point. */
  path: string;
  /**
   * The file's revision when Notara last read or wrote it.
   *
   * Sent with the next save so an edit that landed underneath Notara is
   * refused rather than overwritten. Null for a note not yet on disk.
   */
  revision: string | null;
  /** Taken from the file name. Renaming the title renames the file. */
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: NoteTag[];
  /**
   * Pinned notes sit in their own section at the top of the notes bar. The
   * count is capped, because a pinned section that holds everything is just
   * the list again.
   */
  isPinned: boolean;
  /**
   * Starred notes are a filter over the whole list, with no cap. Starring is
   * how you mark a note important; pinning is how you keep it in reach.
   */
  isStarred: boolean;
}

export interface VisionBoardItem {
  id: string;
  type: 'image' | 'text';
  content: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  accentColor?: string;
}

export interface VisionBoard {
  id: string;
  name: string;
  items: VisionBoardItem[];
}

export interface TodoItem {
  id: string;
  content: string;
  checked: boolean;
  time: string;      // HH:mm format
  subItems?: TodoItem[];
}

export interface TodoList {
  id: string;
  title: string;
  date: string;   // ISO date string (yyyy-MM-dd)
  time: string;   // HH:mm format
  items: TodoItem[];
}

