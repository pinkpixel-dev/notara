import { describe, expect, it } from 'vitest';
import { applyProposalEdits, canEdit, editableFields } from '../proposal-edits';
import type { Proposal } from '../proposals';

const edit: Proposal = { kind: 'edit_note', path: 'a.md', before: 'old', after: 'new' };

describe('which fields may be edited', () => {
  it('offers the content of a note edit and nothing else', () => {
    expect(editableFields(edit).map((field) => field.key)).toEqual(['after']);
  });

  it('never offers the path a change lands on', () => {
    const keys = editableFields(edit).map((field) => field.key);

    expect(keys).not.toContain('path');
  });

  it('offers nothing for a change with no safe fields', () => {
    const remove: Proposal = {
      kind: 'remove_board_item',
      boardId: 'b',
      boardName: 'Home',
      itemId: 'i',
    };

    expect(canEdit(remove)).toBe(false);
  });
});

describe('applying edits', () => {
  it('replaces the content of a note edit', () => {
    expect(applyProposalEdits(edit, { after: 'mine' })).toEqual({ ...edit, after: 'mine' });
  });

  it('ignores a key that was not offered', () => {
    expect(applyProposalEdits(edit, { path: 'elsewhere.md' })).toEqual(edit);
  });

  it('keeps the approved title, folder, and path fixed', () => {
    const create: Proposal = {
      kind: 'create_note',
      path: 'Plan.md',
      title: 'Plan',
      folder: '',
      content: 'x',
    };

    expect(
      applyProposalEdits(create, {
        path: 'Elsewhere.md',
        title: 'Elsewhere',
        folder: '/Ideas/',
      })
    ).toEqual(create);
  });

  it('lets a note edit be emptied, because that is a real change', () => {
    expect(applyProposalEdits(edit, { after: '' })).toMatchObject({ after: '' });
  });

  it('drops a to-do rename when the new title is cleared', () => {
    const update: Proposal = {
      kind: 'update_todo_list',
      listId: 'l',
      listTitle: 'Today',
      title: 'Tomorrow',
    };

    expect(applyProposalEdits(update, { title: '' })).toMatchObject({ title: undefined });
  });
});
