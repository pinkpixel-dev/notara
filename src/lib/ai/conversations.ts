/**
 * Conversation storage for the AI panel.
 *
 * Each note has its own conversation and each section has its own, so opening a
 * note brings back what was said about that note rather than a single running
 * chat that mixes everything together.
 *
 * A note's identity is its file path, which is also how a conversation is
 * keyed. That has a consequence: renaming or moving a note changes its
 * identity, so the conversation has to be moved with it, and deleting a note
 * takes its conversation with it. Both are handled here rather than left to
 * whoever happens to notice.
 *
 * Everything in this module is pure. The React side and the file writes live in
 * `src/components/ai/useAiConversations.ts`.
 */

export const NOTE_KEY_PREFIX = 'note:';
export const SECTION_KEY_PREFIX = 'section:';

/** The key for the conversation about one note. */
export const noteConversationKey = (path: string): string => `${NOTE_KEY_PREFIX}${path}`;

/** The key for the conversation about a section, used when no note is open. */
export const sectionConversationKey = (section: string): string =>
  `${SECTION_KEY_PREFIX}${section}`;

/**
 * Who a turn came from.
 *
 * `tool` is not a turn of conversation. It is the record of the assistant
 * looking something up, kept so the user can see what was read. It is stored
 * with the conversation but never sent back to the model, which asks again if
 * it needs the same thing later.
 */
export type StoredAiRole = 'user' | 'assistant' | 'tool';

export interface StoredAiMessage {
  id: string;
  role: StoredAiRole;
  content: string;
  createdAt: number;
  /** Set on a `tool` row: which tool ran. */
  toolName?: string;
  /** Set on a `tool` row: true when the tool could not run. */
  failed?: boolean;
}

export interface AiConversation {
  messages: StoredAiMessage[];
  /** Milliseconds since the epoch. Decides what survives trimming. */
  updatedAt: number;
}

export type AiConversations = Record<string, AiConversation>;

export interface StoredAiConversationsFile {
  version: 1;
  conversations: AiConversations;
}

/**
 * How many conversations are kept.
 *
 * A conversation per note in a large workspace would grow without limit, and
 * nobody returns to the chat about a note they last touched two hundred notes
 * ago. The newest survive; the rest are dropped when the file is written.
 */
export const MAX_CONVERSATIONS = 100;

/**
 * How many turns are kept in one conversation.
 *
 * This is a storage limit, not a context limit. It exists so one long chat
 * cannot make the file unreasonable to read back at startup.
 */
export const MAX_MESSAGES_PER_CONVERSATION = 200;

const isStoredRole = (value: unknown): value is StoredAiRole =>
  value === 'user' || value === 'assistant' || value === 'tool';

/**
 * Reads whatever is in the file, keeping only what is usable.
 *
 * Nothing here throws. This runs at startup against a file the user could have
 * edited, an older version could have written, or a half-finished write could
 * have left behind, and none of those should stop the panel from opening.
 */
export const parseStoredConversations = (raw: unknown): AiConversations => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const source = (raw as Partial<StoredAiConversationsFile>).conversations;
  if (!source || typeof source !== 'object') {
    return {};
  }

  const conversations: AiConversations = {};

  Object.entries(source as Record<string, unknown>).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') {
      return;
    }

    const candidate = value as Partial<AiConversation>;
    const messages = Array.isArray(candidate.messages) ? candidate.messages : [];

    const usable = messages.filter(
      (message): message is StoredAiMessage =>
        !!message &&
        typeof message === 'object' &&
        typeof (message as StoredAiMessage).id === 'string' &&
        typeof (message as StoredAiMessage).content === 'string' &&
        typeof (message as StoredAiMessage).createdAt === 'number' &&
        isStoredRole((message as StoredAiMessage).role)
    );

    if (usable.length === 0) {
      return;
    }

    conversations[key] = {
      messages: usable.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
        ...(typeof message.toolName === 'string' ? { toolName: message.toolName } : {}),
        ...(message.failed === true ? { failed: true } : {}),
      })),
      updatedAt:
        typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt)
          ? candidate.updatedAt
          : usable[usable.length - 1].createdAt,
    };
  });

  return conversations;
};

/** Drops empty conversations, old ones, and the front of very long ones. */
export const trimConversations = (conversations: AiConversations): AiConversations => {
  const entries = Object.entries(conversations)
    .filter(([, conversation]) => conversation.messages.length > 0)
    .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_CONVERSATIONS);

  const trimmed: AiConversations = {};

  entries.forEach(([key, conversation]) => {
    trimmed[key] = {
      updatedAt: conversation.updatedAt,
      // The oldest turns go first. The end of a conversation is the part still
      // being talked about.
      messages: conversation.messages.slice(-MAX_MESSAGES_PER_CONVERSATION),
    };
  });

  return trimmed;
};

export const serializeConversations = (
  conversations: AiConversations
): StoredAiConversationsFile => ({
  version: 1,
  conversations: trimConversations(conversations),
});

/** Replaces one conversation, stamping the time that decides what survives. */
export const setConversation = (
  conversations: AiConversations,
  key: string,
  messages: StoredAiMessage[],
  now: number = Date.now()
): AiConversations => {
  const next = { ...conversations };

  if (messages.length === 0) {
    delete next[key];
    return next;
  }

  next[key] = { messages, updatedAt: now };
  return next;
};

export const removeConversation = (
  conversations: AiConversations,
  key: string
): AiConversations => {
  if (!(key in conversations)) {
    return conversations;
  }

  const next = { ...conversations };
  delete next[key];
  return next;
};

/**
 * Follows a note to its new path.
 *
 * A rename and a move are the same thing to a note: the path changes. The
 * conversation goes with it, because it is about that note and not about that
 * file name. Anything already sitting at the destination key belonged to a note
 * that no longer exists there, so it is replaced rather than merged.
 */
export const moveNoteConversation = (
  conversations: AiConversations,
  fromPath: string,
  toPath: string
): AiConversations => {
  const fromKey = noteConversationKey(fromPath);
  const existing = conversations[fromKey];

  if (!existing || fromPath === toPath) {
    return conversations;
  }

  const next = { ...conversations };
  delete next[fromKey];
  next[noteConversationKey(toPath)] = existing;

  return next;
};

/** Deleting a note deletes what was said about it. */
export const deleteNoteConversation = (
  conversations: AiConversations,
  path: string
): AiConversations => removeConversation(conversations, noteConversationKey(path));
