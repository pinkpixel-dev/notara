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
  isPinned: boolean;
}

export interface VisionBoardItem {
  id: string;
  type: 'image' | 'text';
  content: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
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
