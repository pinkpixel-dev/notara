import type { Note, TodoList } from '@/types';
import type { UpdateCalendarEntryProposal, UpdateTodoListProposal } from './proposals';
import { localDate } from './current-view';

export const calendarPosition = (note: Note): { date: string; time: string } => {
  const date = new Date(note.createdAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${note.path} has an unreadable calendar date.`);
  }

  return {
    date: localDate(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
};

export const assertCalendarPosition = (
  note: Note,
  proposal: UpdateCalendarEntryProposal
): void => {
  const current = calendarPosition(note);
  if (current.date !== proposal.fromDate || current.time !== proposal.fromTime) {
    throw new Error(
      `${note.path} moved after this change was proposed. Ask again before moving it.`
    );
  }
};

export const assertTodoTargets = (list: TodoList, proposal: UpdateTodoListProposal): void => {
  for (const change of proposal.setChecked ?? []) {
    const matches = list.items.filter((item) => item.content === change.content);

    if (matches.length === 0) {
      throw new Error(`The list "${list.title}" no longer has an item that reads "${change.content}".`);
    }
    if (matches.length > 1) {
      throw new Error(
        `The list "${list.title}" now has more than one item that reads "${change.content}". Rename one before changing it.`
      );
    }
  }
};
