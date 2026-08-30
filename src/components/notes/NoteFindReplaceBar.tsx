import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import {
  findLiteralMatches,
  matchIndexAtOrAfter,
  replaceAllLiteralMatches,
  replaceLiteralMatch,
  stepMatchIndex,
} from '@/lib/notes/find-replace';
import type { FindMatch } from '@/lib/notes/find-replace';
import type { EditorMode } from './NoteEditorHeader';

export const FIND_IN_NOTE_EVENT = 'notara:find-in-note';
export const FIND_REPLACE_IN_NOTE_EVENT = 'notara:find-replace-in-note';

export interface NoteFindHighlightState {
  isOpen: boolean;
  matches: FindMatch[];
  currentIndex: number;
}

interface NoteFindReplaceBarProps {
  content: string;
  setContent: (content: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onHighlightChange?: (state: NoteFindHighlightState) => void;
}

const NoteFindReplaceBar: React.FC<NoteFindReplaceBarProps> = ({
  content,
  setContent,
  textareaRef,
  mode,
  onModeChange,
  onHighlightChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState('');
  const findInputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => findLiteralMatches(content, query), [content, query]);

  useEffect(() => {
    onHighlightChange?.({ isOpen, matches, currentIndex });
  }, [currentIndex, isOpen, matches, onHighlightChange]);

  const focusFindInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    });
  }, []);

  const open = useCallback(
    (withReplace: boolean) => {
      if (mode === 'preview') {
        onModeChange('edit');
      }
      setIsOpen(true);
      setShowReplace(withReplace);
      setAnnouncement('');
      focusFindInput();
    },
    [focusFindInput, mode, onModeChange]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }, [textareaRef]);

  useEffect(() => {
    const openFind = (event: Event) => {
      event.preventDefault();
      open(false);
    };
    const openFindReplace = (event: Event) => {
      event.preventDefault();
      open(true);
    };

    window.addEventListener(FIND_IN_NOTE_EVENT, openFind);
    window.addEventListener(FIND_REPLACE_IN_NOTE_EVENT, openFindReplace);
    return () => {
      window.removeEventListener(FIND_IN_NOTE_EVENT, openFind);
      window.removeEventListener(FIND_REPLACE_IN_NOTE_EVENT, openFindReplace);
    };
  }, [open]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const hasOpenDialog =
        activeElement instanceof HTMLElement && activeElement.closest('[role="dialog"]');
      if (hasOpenDialog) {
        return;
      }

      if (isOpen && event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      const hasModifier = event.ctrlKey || event.metaKey;
      if (!hasModifier || event.altKey || event.shiftKey) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'f' || key === 'h') {
        event.preventDefault();
        open(key === 'h');
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [close, isOpen, open]);

  useEffect(() => {
    setCurrentIndex((index) => {
      if (matches.length === 0) {
        return -1;
      }
      if (index >= 0 && index < matches.length) {
        return index;
      }
      return matchIndexAtOrAfter(matches, textareaRef.current?.selectionStart ?? 0);
    });
  }, [matches, textareaRef]);

  useEffect(() => {
    if (!isOpen || currentIndex < 0 || currentIndex >= matches.length) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement === textarea) {
        return;
      }
      const match = matches[currentIndex];
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(match.start, match.end);
      activeElement?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentIndex, isOpen, matches, textareaRef]);

  const move = useCallback(
    (direction: 1 | -1) => {
      setCurrentIndex((index) => stepMatchIndex(index, matches.length, direction));
    },
    [matches.length]
  );

  const handleQueryChange = (value: string) => {
    const nextMatches = findLiteralMatches(content, value);
    setQuery(value);
    setCurrentIndex(
      matchIndexAtOrAfter(nextMatches, textareaRef.current?.selectionStart ?? 0)
    );
    setAnnouncement('');
  };

  const replaceCurrent = () => {
    const match = matches[currentIndex];
    if (!match) {
      return;
    }

    const result = replaceLiteralMatch(content, match, replacement);
    const nextMatches = findLiteralMatches(result.content, query);
    setContent(result.content);
    setCurrentIndex(matchIndexAtOrAfter(nextMatches, result.nextSearchFrom));
    setAnnouncement('Replaced one match.');
  };

  const replaceAll = () => {
    const result = replaceAllLiteralMatches(content, matches, replacement);
    if (result.count === 0) {
      return;
    }

    const nextMatches = findLiteralMatches(result.content, query);
    setContent(result.content);
    setCurrentIndex(matchIndexAtOrAfter(nextMatches, 0));
    const message = `Replaced ${result.count} match${result.count === 1 ? '' : 'es'}.`;
    setAnnouncement(message);
    toast({ title: message });
  };

  if (!isOpen) {
    return null;
  }

  const matchStatus = !query
    ? 'No search'
    : matches.length === 0
      ? 'No matches'
      : `${currentIndex + 1} of ${matches.length}`;
  const hasMatch = currentIndex >= 0 && currentIndex < matches.length;

  return (
    <div
      role="search"
      aria-label="Find in note"
      className="mb-2 shrink-0 rounded-md border border-border surface-elevated p-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={findInputRef}
          type="search"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              move(event.shiftKey ? -1 : 1);
            }
          }}
          aria-label="Find text"
          aria-keyshortcuts="Control+F Meta+F"
          placeholder="Find in note"
          className="h-11 min-w-0 flex-[1_1_12rem] md:h-9"
        />
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="min-w-[4.5rem] text-center text-xs text-muted-foreground">
            {matchStatus}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 w-11 px-0 md:h-9 md:w-9"
            onClick={() => move(-1)}
            disabled={!hasMatch}
            aria-label="Previous match"
            title="Previous match"
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 w-11 px-0 md:h-9 md:w-9"
            onClick={() => move(1)}
            disabled={!hasMatch}
            aria-label="Next match"
            title="Next match"
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 w-11 px-0 md:h-9 md:w-9"
            onClick={close}
            aria-label="Close find and replace"
            title="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {showReplace && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            aria-label="Replace with"
            aria-keyshortcuts="Control+H Meta+H"
            placeholder="Replace with"
            className="h-11 min-w-0 flex-[1_1_12rem] md:h-9"
          />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 md:h-9"
              onClick={replaceCurrent}
              disabled={!hasMatch}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 md:h-9"
              onClick={replaceAll}
              disabled={!hasMatch}
            >
              Replace all
            </Button>
          </div>
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {announcement || matchStatus}
      </span>
    </div>
  );
};

export default NoteFindReplaceBar;
