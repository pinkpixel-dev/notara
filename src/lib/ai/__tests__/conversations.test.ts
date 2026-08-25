import { describe, expect, it } from 'vitest';
import {
  deleteNoteConversation,
  MAX_CONVERSATIONS,
  MAX_MESSAGES_PER_CONVERSATION,
  moveNoteConversation,
  noteConversationKey,
  parseStoredConversations,
  removeConversation,
  sectionConversationKey,
  serializeConversations,
  setConversation,
  trimConversations,
  type AiConversations,
  type StoredAiMessage,
} from '../conversations';

const message = (overrides: Partial<StoredAiMessage> = {}): StoredAiMessage => ({
  id: 'm1',
  role: 'user',
  content: 'hello',
  createdAt: 1000,
  ...overrides,
});

const conversationsWith = (key: string, messages: StoredAiMessage[]): AiConversations => ({
  [key]: { messages, updatedAt: 1000 },
});

describe('conversation keys', () => {
  it('keys a note by its path and a section by its name', () => {
    expect(noteConversationKey('Ideas/plan.md')).toBe('note:Ideas/plan.md');
    expect(sectionConversationKey('todos')).toBe('section:todos');
  });
});

describe('reading the stored file', () => {
  it('returns nothing for anything that is not a conversations file', () => {
    expect(parseStoredConversations(null)).toEqual({});
    expect(parseStoredConversations('broken')).toEqual({});
    expect(parseStoredConversations({})).toEqual({});
    expect(parseStoredConversations({ conversations: 4 })).toEqual({});
  });

  it('keeps usable turns and drops the rest', () => {
    const parsed = parseStoredConversations({
      version: 1,
      conversations: {
        'note:a.md': {
          updatedAt: 20,
          messages: [
            message({ id: 'good' }),
            { id: 'bad-role', role: 'system', content: 'x', createdAt: 1 },
            { id: 'no-content', role: 'user', createdAt: 1 },
          ],
        },
      },
    });

    expect(parsed['note:a.md'].messages.map((entry) => entry.id)).toEqual(['good']);
    expect(parsed['note:a.md'].updatedAt).toBe(20);
  });

  it('drops a conversation with no usable turns left', () => {
    const parsed = parseStoredConversations({
      version: 1,
      conversations: { 'note:a.md': { updatedAt: 1, messages: [{ nonsense: true }] } },
    });

    expect(parsed).toEqual({});
  });

  it('falls back to the last turn when the timestamp is missing', () => {
    const parsed = parseStoredConversations({
      version: 1,
      conversations: {
        'note:a.md': { messages: [message({ createdAt: 5 }), message({ id: 'm2', createdAt: 9 })] },
      },
    });

    expect(parsed['note:a.md'].updatedAt).toBe(9);
  });

  it('drops malformed proposals and removes malformed undo data', () => {
    const parsed = parseStoredConversations({
      version: 1,
      conversations: {
        'note:a.md': {
          messages: [
            message({
              id: 'bad',
              role: 'proposal',
              proposal: { kind: 'delete_note', path: '' } as never,
            }),
            message({
              id: 'good',
              role: 'proposal',
              proposal: { kind: 'edit_note', path: 'a.md', before: 'a', after: 'b' },
              proposalStatus: 'unknown' as never,
              undo: { kind: 'delete_note', path: '' },
            }),
          ],
        },
      },
    });

    expect(parsed['note:a.md'].messages.map((entry) => entry.id)).toEqual(['good']);
    expect(parsed['note:a.md'].messages[0].proposalStatus).toBeUndefined();
    expect(parsed['note:a.md'].messages[0].undo).toBeUndefined();
  });
});

describe('trimming', () => {
  it('keeps the newest conversations and drops empty ones', () => {
    const conversations: AiConversations = {};
    for (let index = 0; index < MAX_CONVERSATIONS + 10; index += 1) {
      conversations[`note:${index}.md`] = { messages: [message()], updatedAt: index };
    }
    conversations['note:empty.md'] = { messages: [], updatedAt: 99999 };

    const trimmed = trimConversations(conversations);

    expect(Object.keys(trimmed)).toHaveLength(MAX_CONVERSATIONS);
    expect(trimmed['note:empty.md']).toBeUndefined();
    expect(trimmed['note:0.md']).toBeUndefined();
    expect(trimmed[`note:${MAX_CONVERSATIONS + 9}.md`]).toBeDefined();
  });

  it('keeps the end of a very long conversation, not the start', () => {
    const messages = Array.from({ length: MAX_MESSAGES_PER_CONVERSATION + 5 }, (_, index) =>
      message({ id: `m${index}`, createdAt: index })
    );

    const trimmed = trimConversations(conversationsWith('note:a.md', messages));
    const kept = trimmed['note:a.md'].messages;

    expect(kept).toHaveLength(MAX_MESSAGES_PER_CONVERSATION);
    expect(kept[kept.length - 1].id).toBe(`m${MAX_MESSAGES_PER_CONVERSATION + 4}`);
  });

  it('writes a versioned file', () => {
    expect(serializeConversations(conversationsWith('note:a.md', [message()]))).toEqual({
      version: 1,
      conversations: { 'note:a.md': { messages: [message()], updatedAt: 1000 } },
    });
  });
});

describe('changing a conversation', () => {
  it('stamps the time when turns are set', () => {
    const next = setConversation({}, 'note:a.md', [message()], 4242);

    expect(next['note:a.md'].updatedAt).toBe(4242);
  });

  it('removes the conversation when it is emptied', () => {
    const next = setConversation(conversationsWith('note:a.md', [message()]), 'note:a.md', []);

    expect(next).toEqual({});
  });

  it('leaves other conversations alone', () => {
    const start: AiConversations = {
      ...conversationsWith('note:a.md', [message()]),
      ...conversationsWith('section:todos', [message({ id: 'other' })]),
    };

    const next = setConversation(start, 'note:a.md', []);

    expect(next['section:todos'].messages[0].id).toBe('other');
  });

  it('returns the same object when removing a key that is not there', () => {
    const start = conversationsWith('note:a.md', [message()]);

    expect(removeConversation(start, 'note:missing.md')).toBe(start);
  });
});

describe('following a note', () => {
  it('moves the conversation to the new path', () => {
    const start = conversationsWith('note:old.md', [message()]);

    const next = moveNoteConversation(start, 'old.md', 'Ideas/new.md');

    expect(next['note:old.md']).toBeUndefined();
    expect(next['note:Ideas/new.md'].messages).toHaveLength(1);
  });

  it('does nothing when the note had no conversation', () => {
    const start = conversationsWith('note:a.md', [message()]);

    expect(moveNoteConversation(start, 'b.md', 'c.md')).toBe(start);
  });

  it('does nothing when the path did not really change', () => {
    const start = conversationsWith('note:a.md', [message()]);

    expect(moveNoteConversation(start, 'a.md', 'a.md')).toBe(start);
  });

  it('deleting a note deletes what was said about it', () => {
    const start = {
      ...conversationsWith('note:a.md', [message()]),
      ...conversationsWith('section:notes', [message({ id: 'section' })]),
    };

    const next = deleteNoteConversation(start, 'a.md');

    expect(next['note:a.md']).toBeUndefined();
    expect(next['section:notes']).toBeDefined();
  });
});
