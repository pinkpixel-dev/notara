export interface NoteTag {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  id: string;
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

export interface AiMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  imageUrl?: string;
}

export interface AiConversationSnapshot {
  id: string;
  title: string;
  createdAt: string;
  messages: AiMessage[];
}
