import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Type as TypeIcon,
  Underline,
  Code as InlineCode,
  CodeSquare,
  Palette,
} from 'lucide-react';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  setContent: (value: string) => void;
}

const colorOptions = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#facc15' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#64748b' },
];

const highlightOptions = [
  { name: 'Lemon', value: '#fef08a' },
  { name: 'Mint', value: '#bbf7d0' },
  { name: 'Sky', value: '#bae6fd' },
  { name: 'Lavender', value: '#ddd6fe' },
  { name: 'Rose', value: '#fecdd3' },
];

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ textareaRef, content, setContent }) => {
  const getSelectionRange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return { selectionStart: 0, selectionEnd: 0 };
    }
    return {
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
    };
  }, [textareaRef]);

  const updateContent = useCallback(
    (nextContent: string, selectionStart?: number, selectionEnd?: number) => {
      setContent(nextContent);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        if (selectionStart !== undefined && selectionEnd !== undefined) {
          textarea.setSelectionRange(selectionStart, selectionEnd);
        }
      });
    },
    [setContent, textareaRef],
  );

  const surroundSelection = useCallback(
    (prefix: string, suffix: string = prefix, placeholder = 'text') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = getSelectionRange();
      const selected = content.slice(selectionStart, selectionEnd) || placeholder;
      const before = content.slice(0, selectionStart);
      const after = content.slice(selectionEnd);

      const newText = `${before}${prefix}${selected}${suffix}${after}`;
      const cursorStart = selectionStart + prefix.length;
      const cursorEnd = cursorStart + selected.length;

      updateContent(newText, cursorStart, cursorEnd);
    },
    [content, getSelectionRange, textareaRef, updateContent],
  );

  const getLineBoundaries = useCallback(
    (start: number, end: number) => {
      const lineStart = content.lastIndexOf('\n', start - 1);
      const lineEnd = content.indexOf('\n', end);
      return {
        start: lineStart === -1 ? 0 : lineStart + 1,
        end: lineEnd === -1 ? content.length : lineEnd,
      };
    },
    [content],
  );

  const applyToSelectedLines = useCallback(
    (transform: (line: string) => string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = getSelectionRange();
      const { start, end } = getLineBoundaries(selectionStart, selectionEnd);
      const before = content.slice(0, start);
      const selection = content.slice(start, end);
      const after = content.slice(end);

      const lines = selection.split('\n');
      const transformed = lines.map(transform).join('\n');

      const nextContent = `${before}${transformed}${after}`;
      const offsetStart = start;
      const offsetEnd = start + transformed.length;

      updateContent(nextContent, offsetStart, offsetEnd);
    },
    [content, getLineBoundaries, getSelectionRange, textareaRef, updateContent],
  );

  const clearLinePrefixes = useCallback((line: string) => {
    return line
      .replace(/^\s{0,3}(#{1,6})\s+/u, '')
      .replace(/^\s{0,3}([-*+]\s+)/u, '')
      .replace(/^\s*(\d+\.)\s+/u, '')
      .replace(/^\s{0,3}>\s?/u, '');
  }, []);

  const applyHeading = useCallback(
    (level: 1 | 2 | 3) => {
      applyToSelectedLines((line) => {
        const cleaned = clearLinePrefixes(line);
        if (!cleaned.trim()) return cleaned;
        return `${'#'.repeat(level)} ${cleaned.trimStart()}`;
      });
    },
    [applyToSelectedLines, clearLinePrefixes],
  );

  const applyParagraph = useCallback(() => {
    applyToSelectedLines((line) => clearLinePrefixes(line).trimStart());
  }, [applyToSelectedLines, clearLinePrefixes]);

  const applyBulletedList = useCallback(() => {
    applyToSelectedLines((line) => {
      const trimmed = clearLinePrefixes(line);
      if (!trimmed.trim()) return trimmed;
      return `- ${trimmed.trimStart()}`;
    });
  }, [applyToSelectedLines, clearLinePrefixes]);

  const applyOrderedList = useCallback(() => {
    let index = 1;
    applyToSelectedLines((line) => {
      const trimmed = clearLinePrefixes(line);
      if (!trimmed.trim()) return trimmed;
      const withNumber = `${index}. ${trimmed.trimStart()}`;
      index += 1;
      return withNumber;
    });
  }, [applyToSelectedLines, clearLinePrefixes]);

  const applyBlockQuote = useCallback(() => {
    applyToSelectedLines((line) => {
      const trimmed = line.trimStart();
      if (!trimmed) return trimmed;
      return `> ${trimmed.replace(/^>\s?/, '')}`;
    });
  }, [applyToSelectedLines]);

  const applyCodeBlock = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = getSelectionRange();
    const before = content.slice(0, selectionStart);
    const selected = content.slice(selectionStart, selectionEnd) || 'code snippet';
    const after = content.slice(selectionEnd);

    const language = window.prompt('Enter language for syntax highlighting (optional)')?.trim();
    const langLabel = language ? language : '';
    const prefix = `\n\n\`\`\`${langLabel}\n`;
    const suffix = '\n```\n\n';
    const newText = `${before}${prefix}${selected}${suffix}${after}`;
    const startPosition = selectionStart + prefix.length;
    const endPosition = startPosition + selected.length;
    updateContent(newText, startPosition, endPosition);
  }, [content, getSelectionRange, textareaRef, updateContent]);

  const handleInsertLink = useCallback(() => {
    const url = window.prompt('Enter the link URL');
    if (!url) return;
    surroundSelection('[', `](${url})`, 'link text');
  }, [surroundSelection]);

  const handleInsertImage = useCallback(() => {
    const imageUrl = window.prompt('Enter the image URL');
    if (!imageUrl) return;
    const alt = window.prompt('Enter alt text (optional)') || 'image';
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = getSelectionRange();
    const before = content.slice(0, selectionStart);
    const after = content.slice(selectionEnd);
    const markdown = `![${alt}](${imageUrl})`;

    const nextContent = `${before}${markdown}${after}`;
    const cursor = selectionStart + markdown.length;
    updateContent(nextContent, cursor, cursor);
  }, [content, getSelectionRange, surroundSelection, textareaRef, updateContent]);

  const applyInlineCode = useCallback(() => {
    surroundSelection('`', '`', 'code');
  }, [surroundSelection]);

  const applyTextColor = useCallback(
    (color: string) => {
      surroundSelection(`<span style="color: ${color}">`, '</span>', 'colored text');
    },
    [surroundSelection],
  );

  const applyHighlightColor = useCallback(
    (color: string) => {
      surroundSelection(`<mark style="background-color: ${color}">`, '</mark>', 'highlight');
    },
    [surroundSelection],
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border border-border/40 rounded-md bg-secondary/30 px-2 py-2 mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="gap-2">
            <TypeIcon className="h-4 w-4" />
            Style
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <DropdownMenuLabel>Block style</DropdownMenuLabel>
          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); applyParagraph(); }}>
            Paragraph
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); applyHeading(1); }}>
            <div className="flex items-center gap-2">
              <Heading1 className="h-4 w-4" />
              Heading 1
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); applyHeading(2); }}>
            <div className="flex items-center gap-2">
              <Heading2 className="h-4 w-4" />
              Heading 2
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); applyHeading(3); }}>
            <div className="flex items-center gap-2">
              <Heading3 className="h-4 w-4" />
              Heading 3
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); applyBulletedList(); }}>
            <div className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Bulleted list
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); applyOrderedList(); }}>
            <div className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4" />
              Numbered list
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); applyBlockQuote(); }}>
            <div className="flex items-center gap-2">
              <Quote className="h-4 w-4" />
              Quote
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); applyCodeBlock(); }}>
            <div className="flex items-center gap-2">
              <CodeSquare className="h-4 w-4" />
              Code block
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={() => surroundSelection('**', '**', 'bold text')} aria-label="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => surroundSelection('*', '*', 'italic text')} aria-label="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => surroundSelection('<u>', '</u>', 'underlined text')} aria-label="Underline">
          <Underline className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => surroundSelection('~~', '~~', 'strikethrough')} aria-label="Strikethrough">
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={applyInlineCode} aria-label="Inline code">
          <InlineCode className="h-4 w-4" />
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Text color">
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40">
          <DropdownMenuLabel>Text color</DropdownMenuLabel>
          {colorOptions.map((color) => (
            <DropdownMenuItem
              key={color.value}
              onSelect={(event) => {
                event.preventDefault();
                applyTextColor(color.value);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: color.value }}
                />
                {color.name}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Highlight color">
            <Highlighter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40">
          <DropdownMenuLabel>Highlight</DropdownMenuLabel>
          {highlightOptions.map((highlight) => (
            <DropdownMenuItem
              key={highlight.value}
              onSelect={(event) => {
                event.preventDefault();
                applyHighlightColor(highlight.value);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded-sm border border-border"
                  style={{ backgroundColor: highlight.value }}
                />
                {highlight.name}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={handleInsertLink} aria-label="Insert link">
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={handleInsertImage} aria-label="Insert image">
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MarkdownToolbar;
