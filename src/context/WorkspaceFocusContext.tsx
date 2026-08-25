/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';

export type WorkspaceSection =
  | 'notes'
  | 'todos'
  | 'calendar'
  | 'vision-board'
  | 'constellations'
  | 'tags'
  | 'settings'
  | 'markdown-cheatsheet';

export interface NoteFocusTarget {
  kind: 'note';
  path: string | null;
  title: string;
  content: string;
  isDirty: boolean;
  isNew: boolean;
  directory: string;
}

export interface TodoFocusTarget {
  kind: 'todo-list';
  listId: string | null;
}

export interface CalendarFocusTarget {
  kind: 'calendar';
  date: string | null;
  eventPath: string | null;
}

export interface VisionBoardFocusTarget {
  kind: 'vision-board';
  boardId: string | null;
}

export type WorkspaceFocusTarget =
  | NoteFocusTarget
  | TodoFocusTarget
  | CalendarFocusTarget
  | VisionBoardFocusTarget;

export interface WorkspaceFocus {
  section: WorkspaceSection;
  target: WorkspaceFocusTarget | null;
}

interface PublishedTarget {
  owner: symbol;
  target: WorkspaceFocusTarget;
}

type ReplaceNoteContent = (content: string) => void;

interface FocusPublisher {
  publish: (
    owner: symbol,
    target: WorkspaceFocusTarget,
    replaceNoteContent?: ReplaceNoteContent
  ) => void;
  release: (owner: symbol) => void;
  replaceOpenNoteContent: (
    path: string,
    expectedContent: string,
    content: string
  ) => boolean;
}

const WorkspaceFocusReadContext = createContext<WorkspaceFocus | undefined>(undefined);
const WorkspaceFocusWriteContext = createContext<FocusPublisher | undefined>(undefined);

export const sectionFromPathname = (pathname: string): WorkspaceSection => {
  const segment = pathname.split('/').filter(Boolean)[0];

  if (!segment || segment === 'note') {
    return 'notes';
  }

  switch (segment) {
    case 'todos':
    case 'calendar':
    case 'vision-board':
    case 'constellations':
    case 'tags':
    case 'settings':
    case 'markdown-cheatsheet':
      return segment;
    default:
      return 'notes';
  }
};

export const targetMatchesSection = (
  section: WorkspaceSection,
  target: WorkspaceFocusTarget | null
): boolean => {
  if (!target) {
    return false;
  }

  switch (target.kind) {
    case 'note':
      return section === 'notes';
    case 'todo-list':
      return section === 'todos';
    case 'calendar':
      return section === 'calendar';
    case 'vision-board':
      return section === 'vision-board';
  }
};

export const WorkspaceFocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const section = sectionFromPathname(location.pathname);
  const [published, setPublished] = useState<PublishedTarget | null>(null);
  const publishedRef = useRef<PublishedTarget | null>(null);
  const noteReplacerRef = useRef<{ owner: symbol; replace: ReplaceNoteContent } | null>(null);

  publishedRef.current = published;

  const publish = useCallback<FocusPublisher['publish']>((owner, target, replaceNoteContent) => {
    setPublished((current) =>
      current?.owner === owner && current.target === target ? current : { owner, target }
    );

    if (target.kind === 'note' && replaceNoteContent) {
      noteReplacerRef.current = { owner, replace: replaceNoteContent };
    }
  }, []);

  const release = useCallback((owner: symbol) => {
    setPublished((current) => (current?.owner === owner ? null : current));
    if (noteReplacerRef.current?.owner === owner) {
      noteReplacerRef.current = null;
    }
  }, []);

  const replaceOpenNoteContent = useCallback<FocusPublisher['replaceOpenNoteContent']>(
    (path, expectedContent, content) => {
      const current = publishedRef.current;
      const replacer = noteReplacerRef.current;

      if (
        !current ||
        current.target.kind !== 'note' ||
        current.target.path !== path ||
        current.target.content !== expectedContent ||
        !replacer ||
        replacer.owner !== current.owner
      ) {
        return false;
      }

      replacer.replace(content);
      return true;
    },
    []
  );

  const target = targetMatchesSection(section, published?.target ?? null)
    ? published?.target ?? null
    : null;
  const focus = useMemo(() => ({ section, target }), [section, target]);
  const publisher = useMemo(
    () => ({ publish, release, replaceOpenNoteContent }),
    [publish, release, replaceOpenNoteContent]
  );

  return (
    <WorkspaceFocusWriteContext.Provider value={publisher}>
      <WorkspaceFocusReadContext.Provider value={focus}>
        {children}
      </WorkspaceFocusReadContext.Provider>
    </WorkspaceFocusWriteContext.Provider>
  );
};

export const useWorkspaceFocus = (): WorkspaceFocus => {
  const context = useContext(WorkspaceFocusReadContext);
  if (!context) {
    throw new Error('useWorkspaceFocus must be used within WorkspaceFocusProvider');
  }
  return context;
};

export const useWorkspaceFocusActions = (): Pick<FocusPublisher, 'replaceOpenNoteContent'> => {
  const context = useContext(WorkspaceFocusWriteContext);
  if (!context) {
    throw new Error('useWorkspaceFocusActions must be used within WorkspaceFocusProvider');
  }
  return { replaceOpenNoteContent: context.replaceOpenNoteContent };
};

export const usePublishWorkspaceFocus = (
  target: WorkspaceFocusTarget,
  replaceNoteContent?: ReplaceNoteContent
): void => {
  const context = useContext(WorkspaceFocusWriteContext);
  if (!context) {
    throw new Error('usePublishWorkspaceFocus must be used within WorkspaceFocusProvider');
  }

  const owner = useRef(Symbol('workspace-focus'));
  const { publish, release } = context;

  useEffect(() => {
    publish(owner.current, target, replaceNoteContent);
  }, [publish, replaceNoteContent, target]);

  useEffect(
    () => () => {
      release(owner.current);
    },
    [release]
  );
};
