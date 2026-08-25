import { describe, expect, it } from 'vitest';
import type { Note, TodoList, VisionBoard } from '@/types';
import { buildProposal, type ProposalContext } from '../build-proposals';

const note = (overrides: Partial<Note>): Note => ({
  id: overrides.path ?? 'a.md',
  path: overrides.path ?? 'a.md',
  revision: null,
  title: 'A note',
  content: 'body',
  createdAt: '2026-08-20T14:30:00.000Z',
  updatedAt: '2026-08-20T14:30:00.000Z',
  tags: [],
  isPinned: false,
  isStarred: false,
  ...overrides,
});

const list = (overrides: Partial<TodoList>): TodoList => ({
  id: 'list-1',
  title: 'Today',
  date: '2026-08-25',
  time: '09:00',
  items: [{ id: 'i1', content: 'buy milk', checked: false, time: '10:00' }],
  ...overrides,
});

const board = (overrides: Partial<VisionBoard>): VisionBoard => ({
  id: 'board-1',
  name: 'Home',
  items: [],
  ...overrides,
});

const context = (overrides: Partial<ProposalContext> = {}): ProposalContext => ({
  notes: [note({ path: 'Ideas/plan.md', content: 'old text' })],
  activeNote: null,
  todoLists: [list({})],
  boards: [board({})],
  imageModel: 'gpt-image-2',
  imageSize: '1024x1024',
  today: new Date('2026-08-25T12:00:00'),
  ...overrides,
});

describe('propose_note_edit', () => {
  it('carries the note as it stands as the before side', () => {
    const proposal = buildProposal(
      'propose_note_edit',
      { path: 'Ideas/plan.md', content: 'new text' },
      context()
    );

    expect(proposal).toEqual({
      kind: 'edit_note',
      path: 'Ideas/plan.md',
      before: 'old text',
      after: 'new text',
    });
  });

  it('falls back to the open note when no path is given', () => {
    const open = note({ path: 'open.md', content: 'here' });

    const proposal = buildProposal(
      'propose_note_edit',
      { content: 'there' },
      context({ notes: [open], activeNote: open })
    );

    expect(proposal).toMatchObject({ path: 'open.md', before: 'here' });
  });

  it('refuses a note that is not there', () => {
    expect(() =>
      buildProposal('propose_note_edit', { path: 'gone.md', content: 'x' }, context())
    ).toThrow('There is no note at gone.md.');
  });

  it('refuses when nothing is open and no path was given', () => {
    expect(() => buildProposal('propose_note_edit', { content: 'x' }, context())).toThrow(
      'No note is open'
    );
  });

  it('refuses a change that changes nothing', () => {
    expect(() =>
      buildProposal(
        'propose_note_edit',
        { path: 'Ideas/plan.md', content: 'old text' },
        context()
      )
    ).toThrow('identical');
  });
});

describe('propose_new_note', () => {
  it('cleans the folder and keeps the content', () => {
    expect(
      buildProposal('propose_new_note', { title: 'Plan', folder: '/Ideas/', content: '# Plan' }, context())
    ).toEqual({
      kind: 'create_note',
      path: 'Ideas/Plan 2.md',
      title: 'Plan',
      folder: 'Ideas',
      content: '# Plan',
    });
  });

  it('needs a title', () => {
    expect(() => buildProposal('propose_new_note', { content: 'x' }, context())).toThrow(
      'needs a title'
    );
  });

  it('shows the sanitized, collision-free file path', () => {
    const proposal = buildProposal(
      'propose_new_note',
      { title: 'Plan: next', folder: 'Ideas', content: '' },
      context({ notes: [note({ path: 'Ideas/Plan next.md' })] })
    );

    expect(proposal).toMatchObject({ path: 'Ideas/Plan next 2.md' });
  });
});

describe('propose_todo_list', () => {
  it('defaults the date to today and the time to noon', () => {
    const proposal = buildProposal(
      'propose_todo_list',
      { title: 'Errands', items: [{ content: 'post office' }] },
      context()
    );

    expect(proposal).toEqual({
      kind: 'create_todo_list',
      title: 'Errands',
      date: '2026-08-25',
      time: '12:00',
      items: [{ content: 'post office', checked: false, time: '12:00' }],
    });
  });

  it('refuses a date that is not a date', () => {
    expect(() =>
      buildProposal('propose_todo_list', { title: 'x', items: [], date: 'tomorrow' }, context())
    ).toThrow('is not a date');
  });

  it('refuses impossible dates', () => {
    expect(() =>
      buildProposal('propose_todo_list', { title: 'x', items: [], date: '2026-02-30' }, context())
    ).toThrow('is not a date');
  });

  it('accepts a real leap day', () => {
    expect(
      buildProposal('propose_todo_list', { title: 'x', items: [], date: '2028-02-29' }, context())
    ).toMatchObject({ date: '2028-02-29' });
  });

  it('refuses a time that is not a time', () => {
    expect(() =>
      buildProposal('propose_todo_list', { title: 'x', items: [], time: '25:00' }, context())
    ).toThrow('is not a time');
  });
});

describe('propose_todo_list_change', () => {
  it('resolves the list by title', () => {
    const proposal = buildProposal(
      'propose_todo_list_change',
      { list: 'today', addItems: [{ content: 'call the bank' }] },
      context()
    );

    expect(proposal).toMatchObject({
      kind: 'update_todo_list',
      listId: 'list-1',
      listTitle: 'Today',
      addItems: [{ content: 'call the bank', checked: false, time: '12:00' }],
    });
  });

  it('refuses a list that does not exist', () => {
    expect(() =>
      buildProposal('propose_todo_list_change', { list: 'Nope', title: 'x' }, context())
    ).toThrow('no to-do list called "Nope"');
  });

  it('refuses when two lists share a title', () => {
    expect(() =>
      buildProposal(
        'propose_todo_list_change',
        { list: 'Today', title: 'x' },
        context({ todoLists: [list({}), list({ id: 'list-2' })] })
      )
    ).toThrow('more than one');
  });

  it('refuses to tick an item the list does not have', () => {
    expect(() =>
      buildProposal(
        'propose_todo_list_change',
        { list: 'Today', setChecked: [{ content: 'walk the dog', checked: true }] },
        context()
      )
    ).toThrow('no item that reads');
  });

  it('refuses an ambiguous item label', () => {
    expect(() =>
      buildProposal(
        'propose_todo_list_change',
        { list: 'Today', setChecked: [{ content: 'buy milk', checked: true }] },
        context({
          todoLists: [
            list({
              items: [
                { id: 'a', content: 'buy milk', checked: false, time: '10:00' },
                { id: 'b', content: 'buy milk', checked: false, time: '11:00' },
              ],
            }),
          ],
        })
      )
    ).toThrow('more than one item');
  });

  it('refuses the same item twice in one change', () => {
    expect(() =>
      buildProposal(
        'propose_todo_list_change',
        {
          list: 'Today',
          setChecked: [
            { content: 'buy milk', checked: true },
            { content: 'buy milk', checked: false },
          ],
        },
        context()
      )
    ).toThrow('more than once');
  });

  it('refuses a change that would alter nothing', () => {
    expect(() => buildProposal('propose_todo_list_change', { list: 'Today' }, context())).toThrow(
      'would not alter'
    );
  });
});

describe('calendar proposals', () => {
  it('creates an entry with its date and time', () => {
    expect(
      buildProposal('propose_calendar_entry', { title: 'Dentist', date: '2026-09-01' }, context())
    ).toEqual({
      kind: 'create_calendar_entry',
      path: 'Dentist.md',
      title: 'Dentist',
      date: '2026-09-01',
      time: '12:00',
      content: '',
      folder: '',
    });
  });

  it('reports where an entry is moving from', () => {
    const entry = note({ path: 'Dentist.md', createdAt: '2026-08-20T14:30:00' });

    const proposal = buildProposal(
      'propose_calendar_entry_change',
      { path: 'Dentist.md', date: '2026-08-27' },
      context({ notes: [entry] })
    );

    expect(proposal).toMatchObject({
      kind: 'update_calendar_entry',
      path: 'Dentist.md',
      fromDate: '2026-08-20',
      fromTime: '14:30',
      date: '2026-08-27',
      time: '14:30',
    });
  });

  it('refuses a move to where it already is', () => {
    const entry = note({ path: 'Dentist.md', createdAt: '2026-08-20T14:30:00' });

    expect(() =>
      buildProposal(
        'propose_calendar_entry_change',
        { path: 'Dentist.md', date: '2026-08-20', time: '14:30' },
        context({ notes: [entry] })
      )
    ).toThrow('already at that date');
  });
});

describe('propose_board_image', () => {
  it('uses the only board when none is named', () => {
    expect(buildProposal('propose_board_image', { prompt: 'a quiet room' }, context())).toEqual({
      kind: 'place_board_image',
      boardId: 'board-1',
      boardName: 'Home',
      prompt: 'a quiet room',
      model: 'gpt-image-2',
      size: '1024x1024',
    });
  });

  it('asks which board when there is more than one', () => {
    expect(() =>
      buildProposal(
        'propose_board_image',
        { prompt: 'x' },
        context({ boards: [board({}), board({ id: 'b2', name: 'Work' })] })
      )
    ).toThrow('more than one board');
  });

  it('refuses when there are no boards at all', () => {
    expect(() =>
      buildProposal('propose_board_image', { prompt: 'x' }, context({ boards: [] }))
    ).toThrow('no vision boards');
  });
});

describe('unknown tools', () => {
  it('are refused by name', () => {
    expect(() => buildProposal('propose_anything', {}, context())).toThrow(
      'no tool called propose_anything'
    );
  });
});
