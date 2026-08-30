import React, { useCallback, useEffect, useRef } from 'react';
import type { FindMatch } from '@/lib/notes/find-replace';
import { cn } from '@/lib/utils';
import type { EditorMode } from './NoteEditorHeader';

interface NoteHighlightedTextareaProps {
  content: string;
  setContent: (content: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  mode: EditorMode;
  matches: FindMatch[];
  currentIndex: number;
  isHighlighting: boolean;
}

const NoteHighlightedTextarea: React.FC<NoteHighlightedTextareaProps> = ({
  content,
  setContent,
  textareaRef,
  mode,
  matches,
  currentIndex,
  isHighlighting,
}) => {
  const highlightRef = useRef<HTMLDivElement>(null);

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) {
      return;
    }

    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  }, [textareaRef]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(syncScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [content, currentIndex, matches, syncScroll]);

  const highlightedContent = () => {
    const parts: React.ReactNode[] = [];
    let cursor = 0;

    matches.forEach((match, index) => {
      parts.push(content.slice(cursor, match.start));
      parts.push(
        <mark
          key={`${match.start}-${match.end}`}
          className={cn(
            'rounded-sm text-foreground',
            index === currentIndex
              ? 'bg-primary/50 ring-1 ring-inset ring-primary'
              : 'bg-primary/25'
          )}
        >
          {content.slice(match.start, match.end)}
        </mark>
      );
      cursor = match.end;
    });

    parts.push(content.slice(cursor));
    return parts;
  };

  return (
    <div
      className={cn(
        'relative min-h-0 flex-1',
        mode === 'split' && 'min-h-[40vh]'
      )}
    >
      {isHighlighting && (
        <div
          ref={highlightRef}
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words',
            'bg-transparent font-mono text-foreground'
          )}
        >
          {highlightedContent()}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        onScroll={syncScroll}
        placeholder="Start typing..."
        aria-label="Note content"
        className={cn(
          'absolute inset-0 z-10 h-full min-h-0 w-full resize-none overflow-auto bg-transparent font-mono',
          'border-none outline-none focus:ring-0',
          isHighlighting &&
            'text-transparent caret-foreground selection:bg-primary/30 selection:text-foreground'
        )}
      />
    </div>
  );
};

export default NoteHighlightedTextarea;
