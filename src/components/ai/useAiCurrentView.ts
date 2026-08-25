import { useMemo } from 'react';
import { useNotes } from '@/context/NotesContextTypes';
import { useTodo } from '@/context/TodoContextTypes';
import { useWorkspaceFocus } from '@/context/WorkspaceFocusContext';
import { buildCurrentViewContext, type CurrentViewContext } from '@/lib/ai/current-view';

export const useAiCurrentView = (): CurrentViewContext => {
  const focus = useWorkspaceFocus();
  const { notes, visionBoards } = useNotes();
  const { todoLists } = useTodo();

  return useMemo(
    () => buildCurrentViewContext({ focus, notes, todoLists, visionBoards }),
    [focus, notes, todoLists, visionBoards]
  );
};
