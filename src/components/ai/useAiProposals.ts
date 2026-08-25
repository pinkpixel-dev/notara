import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNotes } from '@/context/NotesContextTypes';
import { useTodo } from '@/context/TodoContextTypes';
import { useFileSystem } from '@/context/FileSystemContext';
import { generateOpenAiImage, openAiImageToBlob } from '@/lib/openai/client';
import type { ImageModel } from '@/lib/openai/models';
import type { Proposal, TodoListSnapshot } from '@/lib/ai/proposals';
import type { TodoItem, VisionBoardItem } from '@/types';
import { isProposal } from '@/lib/ai/proposal-validation';
import { assertCalendarPosition, assertTodoTargets } from '@/lib/ai/proposal-safety';
import { useWorkspaceFocus, useWorkspaceFocusActions } from '@/context/WorkspaceFocusContext';

/** What applying a proposal produced, so the panel can offer Undo. */
export interface ApplyResult {
  /** The change that puts things back, when there is one. */
  undo?: Proposal;
  /** One line for the record, saying what actually happened. */
  summary: string;
}

const isoFrom = (date: string, time: string): string => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const value = new Date(0);
  value.setFullYear(year, month - 1, day);
  value.setHours(hours, minutes, 0, 0);

  return value.toISOString();
};

const snapshotOf = (list: {
  title: string;
  date: string;
  time: string;
  items: TodoItem[];
}): TodoListSnapshot => ({
  title: list.title,
  date: list.date,
  time: list.time,
  items: list.items.map((item) => ({
    id: item.id,
    content: item.content,
    checked: item.checked,
    time: item.time,
  })),
});

/**
 * Applying an approved proposal.
 *
 * Every write here goes through the same commands the interface uses. The
 * assistant has no private path to the file engine, which is what makes an
 * approved edit exactly as safe as one typed by hand: the same atomic write,
 * the same backup, the same revision check.
 *
 * Undo is not a separate mechanism. Applying returns the proposal that puts
 * things back, and undoing runs it through this same function.
 */
export const useAiProposals = (): ((proposal: Proposal) => Promise<ApplyResult>) => {
  const { notes, visionBoards, addNote, updateNote, deleteNote, updateVisionBoard } = useNotes();
  const { todoLists, addTodoList, updateTodoList, deleteTodoList } = useTodo();
  const { saveGeneratedImage } = useFileSystem();
  const focus = useWorkspaceFocus();
  const { replaceOpenNoteContent } = useWorkspaceFocusActions();

  return useCallback(
    async (proposal: Proposal): Promise<ApplyResult> => {
      if (!isProposal(proposal)) {
        throw new Error('This saved proposal is invalid and was not applied.');
      }

      switch (proposal.kind) {
        case 'edit_note': {
          const note = notes.find((entry) => entry.path === proposal.path);

          if (!note) {
            throw new Error(`${proposal.path} is no longer in the workspace.`);
          }

          if (
            focus.target?.kind === 'note' &&
            focus.target.path === proposal.path &&
            focus.target.isDirty
          ) {
            throw new Error(
              `Save ${proposal.path} before applying this edit. The proposal was built from unsaved text.`
            );
          }

          // The note may have been edited between the proposal and the Apply.
          // Writing anyway would silently throw that edit away, so the refusal
          // is the point rather than an inconvenience.
          if (note.content !== proposal.before) {
            throw new Error(
              `${proposal.path} has changed since this was proposed. Ask again so the change is built on what the file says now.`
            );
          }

          const saved = await updateNote(note.id, { content: proposal.after });

          if (!saved) {
            throw new Error(`${proposal.path} could not be saved.`);
          }

          replaceOpenNoteContent(saved.path, proposal.before, proposal.after);

          return {
            summary: `Applied the edit to ${saved.path}`,
            undo: {
              kind: 'edit_note',
              path: saved.path,
              before: proposal.after,
              after: proposal.before,
            },
          };
        }

        case 'create_note': {
          const created = await addNote({
            title: proposal.title,
            content: proposal.content,
            directory: proposal.folder,
            expectedPath: proposal.path,
          });

          return {
            summary: `Created ${created.path}`,
            undo: { kind: 'delete_note', path: created.path },
          };
        }

        case 'create_calendar_entry': {
          const created = await addNote({
            title: proposal.title,
            content: proposal.content,
            directory: proposal.folder,
            createdAt: isoFrom(proposal.date, proposal.time),
            expectedPath: proposal.path,
          });

          return {
            summary: `Added ${created.path} on ${proposal.date}`,
            undo: { kind: 'delete_note', path: created.path },
          };
        }

        case 'update_calendar_entry': {
          const note = notes.find((entry) => entry.path === proposal.path);

          if (!note) {
            throw new Error(`${proposal.path} is no longer in the workspace.`);
          }

          assertCalendarPosition(note, proposal);

          const saved = await updateNote(note.id, {
            createdAt: isoFrom(proposal.date, proposal.time),
          });
          if (!saved) {
            throw new Error(`${proposal.path} could not be saved.`);
          }

          return {
            summary: `Moved ${saved.path} to ${proposal.date} at ${proposal.time}`,
            undo: {
              kind: 'update_calendar_entry',
              path: saved.path,
              fromDate: proposal.date,
              fromTime: proposal.time,
              date: proposal.fromDate,
              time: proposal.fromTime,
            },
          };
        }

        case 'delete_note': {
          const note = notes.find((entry) => entry.path === proposal.path);

          if (!note) {
            throw new Error(`${proposal.path} is no longer in the workspace.`);
          }

          await deleteNote(note.id);

          return { summary: `Deleted ${proposal.path}` };
        }

        case 'create_todo_list': {
          const created = addTodoList({
            title: proposal.title,
            date: proposal.date,
            time: proposal.time,
            items: proposal.items.map((item) => ({
              id: uuidv4(),
              content: item.content,
              checked: item.checked,
              time: item.time,
            })),
          });

          return {
            summary: `Created the list "${created.title}"`,
            undo: { kind: 'delete_todo_list', listId: created.id, listTitle: created.title },
          };
        }

        case 'update_todo_list': {
          const list = todoLists.find((entry) => entry.id === proposal.listId);

          if (!list) {
            throw new Error(`The list "${proposal.listTitle}" is no longer there.`);
          }

          assertTodoTargets(list, proposal);

          const checkedByContent = new Map(
            (proposal.setChecked ?? []).map((entry) => [entry.content, entry.checked])
          );

          const items: TodoItem[] = [
            ...list.items.map((item) =>
              checkedByContent.has(item.content)
                ? { ...item, checked: checkedByContent.get(item.content) as boolean }
                : item
            ),
            ...(proposal.addItems ?? []).map((item) => ({
              id: uuidv4(),
              content: item.content,
              checked: item.checked,
              time: item.time,
            })),
          ];

          updateTodoList(list.id, {
            ...(proposal.title ? { title: proposal.title } : {}),
            ...(proposal.date ? { date: proposal.date } : {}),
            ...(proposal.time ? { time: proposal.time } : {}),
            items,
          });

          return {
            summary: `Changed the list "${list.title}"`,
            undo: {
              kind: 'restore_todo_list',
              listId: list.id,
              listTitle: list.title,
              snapshot: snapshotOf(list),
            },
          };
        }

        case 'restore_todo_list': {
          updateTodoList(proposal.listId, {
            title: proposal.snapshot.title,
            date: proposal.snapshot.date,
            time: proposal.snapshot.time,
            items: proposal.snapshot.items.map((item) => ({ ...item })),
          });

          return { summary: `Put "${proposal.snapshot.title}" back` };
        }

        case 'delete_todo_list': {
          deleteTodoList(proposal.listId);

          return { summary: `Deleted the list "${proposal.listTitle}"` };
        }

        case 'place_board_image': {
          const board = visionBoards.find((entry) => entry.id === proposal.boardId);

          if (!board) {
            throw new Error(`The board "${proposal.boardName}" is no longer there.`);
          }

          // Approval is what pays for this. The generation happens here, after
          // the user has seen the prompt, the model, and the size.
          const image = await generateOpenAiImage({
            model: proposal.model as ImageModel,
            prompt: proposal.prompt,
            size: proposal.size,
          });

          const blob = openAiImageToBlob(image);
          await saveGeneratedImage(blob, { fileNamePrefix: 'assistant-image', mimeType: image.mimeType });

          const item: VisionBoardItem = {
            id: uuidv4(),
            type: 'image',
            content: `data:${image.mimeType};base64,${image.base64}`,
            position: { x: 200, y: 100 },
            size: { width: 250, height: 150 },
          };

          updateVisionBoard(board.id, { items: [...board.items, item] });

          return {
            summary: `Added an image to "${board.name}"`,
            undo: {
              kind: 'remove_board_item',
              boardId: board.id,
              boardName: board.name,
              itemId: item.id,
            },
          };
        }

        case 'remove_board_item': {
          const board = visionBoards.find((entry) => entry.id === proposal.boardId);

          if (!board) {
            throw new Error(`The board "${proposal.boardName}" is no longer there.`);
          }

          updateVisionBoard(board.id, {
            items: board.items.filter((item) => item.id !== proposal.itemId),
          });

          return { summary: `Removed the image from "${board.name}"` };
        }
      }
    },
    [
      addNote,
      addTodoList,
      deleteNote,
      deleteTodoList,
      focus,
      notes,
      replaceOpenNoteContent,
      saveGeneratedImage,
      todoLists,
      updateNote,
      updateTodoList,
      updateVisionBoard,
      visionBoards,
    ]
  );
};
