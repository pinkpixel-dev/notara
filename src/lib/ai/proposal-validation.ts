import type { Proposal, ProposalStatus, TodoItemDraft } from './proposals';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isText = (value: unknown): value is string => typeof value === 'string';
const isNonEmptyText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isRelativePath = (value: unknown, allowEmpty = false): value is string => {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) {
    return false;
  }
  if (value.startsWith('/') || value.includes('\\')) {
    return false;
  }
  return !value.split('/').some((segment) => segment === '.' || segment === '..');
};

export const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

export const isClockTime = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const isTodoItemDraft = (value: unknown): value is TodoItemDraft =>
  isRecord(value) &&
  isNonEmptyText(value.content) &&
  isBoolean(value.checked) &&
  isClockTime(value.time);

const isTodoSnapshotItem = (value: unknown): boolean =>
  isRecord(value) &&
  isNonEmptyText(value.id) &&
  isNonEmptyText(value.content) &&
  isBoolean(value.checked) &&
  isClockTime(value.time);

const isCheckedChange = (value: unknown): boolean =>
  isRecord(value) && isNonEmptyText(value.content) && isBoolean(value.checked);

const optional = (
  value: Record<string, unknown>,
  key: string,
  predicate: (entry: unknown) => boolean
): boolean => value[key] === undefined || predicate(value[key]);

export const isProposalStatus = (value: unknown): value is ProposalStatus =>
  value === 'pending' ||
  value === 'applied' ||
  value === 'cancelled' ||
  value === 'failed' ||
  value === 'undone';

export const isProposal = (value: unknown): value is Proposal => {
  if (!isRecord(value) || !isNonEmptyText(value.kind)) {
    return false;
  }

  switch (value.kind) {
    case 'edit_note':
      return isRelativePath(value.path) && isText(value.before) && isText(value.after);
    case 'create_note':
      return (
        isRelativePath(value.path) &&
        isNonEmptyText(value.title) &&
        isRelativePath(value.folder, true) &&
        isText(value.content)
      );
    case 'delete_note':
      return isRelativePath(value.path);
    case 'create_todo_list':
      return (
        isNonEmptyText(value.title) &&
        isCalendarDate(value.date) &&
        isClockTime(value.time) &&
        Array.isArray(value.items) &&
        value.items.every(isTodoItemDraft)
      );
    case 'update_todo_list':
      return (
        isNonEmptyText(value.listId) &&
        isNonEmptyText(value.listTitle) &&
        optional(value, 'title', isNonEmptyText) &&
        optional(value, 'date', isCalendarDate) &&
        optional(value, 'time', isClockTime) &&
        optional(
          value,
          'addItems',
          (items) => Array.isArray(items) && items.every(isTodoItemDraft)
        ) &&
        optional(
          value,
          'setChecked',
          (items) => Array.isArray(items) && items.every(isCheckedChange)
        )
      );
    case 'delete_todo_list':
      return isNonEmptyText(value.listId) && isNonEmptyText(value.listTitle);
    case 'restore_todo_list':
      return (
        isNonEmptyText(value.listId) &&
        isNonEmptyText(value.listTitle) &&
        isRecord(value.snapshot) &&
        isNonEmptyText(value.snapshot.title) &&
        isCalendarDate(value.snapshot.date) &&
        isClockTime(value.snapshot.time) &&
        Array.isArray(value.snapshot.items) &&
        value.snapshot.items.every(isTodoSnapshotItem)
      );
    case 'create_calendar_entry':
      return (
        isRelativePath(value.path) &&
        isNonEmptyText(value.title) &&
        isCalendarDate(value.date) &&
        isClockTime(value.time) &&
        isText(value.content) &&
        isRelativePath(value.folder, true)
      );
    case 'update_calendar_entry':
      return (
        isRelativePath(value.path) &&
        isCalendarDate(value.fromDate) &&
        isClockTime(value.fromTime) &&
        isCalendarDate(value.date) &&
        isClockTime(value.time)
      );
    case 'place_board_image':
      return (
        isNonEmptyText(value.boardId) &&
        isNonEmptyText(value.boardName) &&
        isNonEmptyText(value.prompt) &&
        isNonEmptyText(value.model) &&
        isNonEmptyText(value.size)
      );
    case 'remove_board_item':
      return (
        isNonEmptyText(value.boardId) &&
        isNonEmptyText(value.boardName) &&
        isNonEmptyText(value.itemId)
      );
    default:
      return false;
  }
};
