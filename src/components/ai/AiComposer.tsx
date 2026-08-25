import React, { useCallback, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface AiComposerProps {
  onSend: (text: string) => void;
  onCancel: () => void;
  isSending: boolean;
  disabled: boolean;
  /** Shown in the empty field, so it can explain why typing is pointless. */
  placeholder: string;
}

const MAX_ROWS_HEIGHT = 180;

/**
 * The message box.
 *
 * Enter sends and Shift+Enter adds a line, which is what a chat box is expected
 * to do. The send button is always present rather than appearing on focus, so
 * touch users have a target and keyboard users have a stop on the way out of the
 * field.
 *
 * While a request is in flight the same button becomes Stop. One control in one
 * place is easier to hit than two that swap positions, and it means the action
 * available at that moment is always the one under the cursor.
 */
const AiComposer: React.FC<AiComposerProps> = ({
  onSend,
  onCancel,
  isSending,
  disabled,
  placeholder,
}) => {
  const [value, setValue] = useState('');
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  // The field grows with the text up to a ceiling, then scrolls. Height is set
  // directly rather than animated: this runs on every keystroke, and animating
  // a layout property here would fight the caret.
  const resize = useCallback(() => {
    const field = fieldRef.current;
    if (!field) {
      return;
    }

    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, MAX_ROWS_HEIGHT)}px`;
  }, []);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isSending) {
      return;
    }

    onSend(trimmed);
    setValue('');

    window.requestAnimationFrame(() => {
      resize();
      fieldRef.current?.focus();
    });
  }, [disabled, isSending, onSend, resize, value]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey) {
        return;
      }

      // A composition is a half-typed character in an IME. Enter commits it,
      // and sending there would cut the word in half.
      if (event.nativeEvent.isComposing) {
        return;
      }

      event.preventDefault();
      submit();
    },
    [submit]
  );

  return (
    <form
      className="flex items-end gap-2 border-t border-border p-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Textarea
        ref={fieldRef}
        value={value}
        rows={1}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Message the assistant"
        aria-keyshortcuts="Enter"
        className="max-h-[180px] min-h-[2.75rem] resize-none surface-input"
        onChange={(event) => {
          setValue(event.target.value);
          resize();
        }}
        onKeyDown={handleKeyDown}
      />

      {isSending ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="shrink-0"
          aria-label="Stop waiting for the reply"
          onClick={onCancel}
        >
          <Square className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : (
        <Button
          type="submit"
          size="icon"
          className="shrink-0"
          aria-label="Send message"
          disabled={disabled || value.trim().length === 0}
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </form>
  );
};

export default AiComposer;
