import { describe, expect, it } from 'vitest';
import type { WorkspaceFocus } from '@/context/WorkspaceFocusContext';
import { sectionFromPathname, targetMatchesSection } from '@/context/WorkspaceFocusContext';
import type { Note, TodoList, VisionBoard } from '@/types';
import {
  buildCurrentViewContext,
  currentViewInput,
  localDate,
  shouldAttachVisibleContent,
} from '../current-view';

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 'saved.md',
  path: 'saved.md',
  revision: null,
  title: 'Saved',
  content: 'disk text',
  createdAt: '2026-08-25T10:00:00.000Z',
  updatedAt: '2026-08-25T10:00:00.000Z',
  tags: [],
  isPinned: false,
  isStarred: false,
  ...overrides,
});

const data = (focus: WorkspaceFocus, overrides: Partial<{
  notes: Note[];
  todoLists: TodoList[];
  visionBoards: VisionBoard[];
}> = {}) => ({ focus, notes: [], todoLists: [], visionBoards: [], ...overrides });

describe('route focus', () => {
  it('maps note routes and app sections', () => {
    expect(sectionFromPathname('/')).toBe('notes');
    expect(sectionFromPathname('/note/Ideas%2Fplan.md')).toBe('notes');
    expect(sectionFromPathname('/todos')).toBe('todos');
    expect(sectionFromPathname('/calendar')).toBe('calendar');
  });

  it('hides a target left over from another section', () => {
    expect(
      targetMatchesSection('todos', {
        kind: 'note',
        path: 'a.md',
        title: 'A',
        content: 'x',
        isDirty: false,
        isNew: false,
        directory: '',
      })
    ).toBe(false);
  });
});

describe('current view context', () => {
  it('uses the live note draft and marks unsaved text', () => {
    const view = buildCurrentViewContext(
      data({
        section: 'notes',
        target: {
          kind: 'note',
          path: 'saved.md',
          title: 'Live title',
          content: 'unsaved editor text',
          isDirty: true,
          isNew: false,
          directory: '',
        },
      }, { notes: [note()] })
    );

    expect(view.label).toContain('unsaved changes');
    expect(view.visibleContent).toMatchObject({
      title: 'Live title',
      content: 'unsaved editor text',
    });
  });

  it('includes only the selected to-do list', () => {
    const lists: TodoList[] = [
      { id: 'a', title: 'A', date: '2026-08-25', time: '09:00', items: [] },
      {
        id: 'b',
        title: 'B',
        date: '2026-08-26',
        time: '10:00',
        items: [{ id: 'i', content: 'Call', checked: false, time: '10:30' }],
      },
    ];
    const view = buildCurrentViewContext(
      data({ section: 'todos', target: { kind: 'todo-list', listId: 'b' } }, { todoLists: lists })
    );

    expect(view.visibleContent).toMatchObject({ id: 'b', title: 'B' });
    expect(JSON.stringify(view.visibleContent)).not.toContain('"title":"A"');
  });

  it('includes entries on the selected calendar date', () => {
    const view = buildCurrentViewContext(
      data(
        {
          section: 'calendar',
          target: { kind: 'calendar', date: '2026-08-25', eventPath: null },
        },
        { notes: [note({ path: 'event.md', title: 'Event' })] }
      )
    );

    expect(view.visibleContent).toMatchObject({ selectedDate: '2026-08-25' });
    expect(JSON.stringify(view.visibleContent)).toContain('event.md');
  });

  it('sends full content for a current-item question, but not unrelated chat', () => {
    const view = buildCurrentViewContext(
      data({
        section: 'notes',
        target: {
          kind: 'note',
          path: 'a.md',
          title: 'A',
          content: 'private body',
          isDirty: false,
          isNew: false,
          directory: '',
        },
      })
    );

    expect(shouldAttachVisibleContent('summarize this', view)).toBe(true);
    expect(shouldAttachVisibleContent('hello', view)).toBe(false);
    expect(shouldAttachVisibleContent('search notes for invoices', view)).toBe(false);
    expect(currentViewInput('summarize this', view).content).toContain('private body');
    expect(currentViewInput('hello', view).content).not.toContain('private body');
  });

  it('formats local dates without UTC conversion', () => {
    expect(localDate(new Date(2026, 7, 25, 23, 30))).toBe('2026-08-25');
  });
});
