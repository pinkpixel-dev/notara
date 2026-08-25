import React, { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EditableField } from '@/lib/ai/proposal-edits';

interface AiProposalFormProps {
  fields: EditableField[];
  onChange: (values: Record<string, string>) => void;
}

const INPUT_TYPES: Record<string, string> = {
  text: 'text',
  date: 'date',
  time: 'time',
};

/**
 * Editing a proposal before approving it.
 *
 * Only the fields the proposal says are safe to change. Where the change lands
 * is deliberately not among them: moving a write to a different note is a
 * different proposal, and one the assistant should make so the card on screen
 * always describes what will happen.
 */
const AiProposalForm: React.FC<AiProposalFormProps> = ({ fields, onChange }) => {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, field.value]))
  );

  const update = useCallback(
    (key: string, value: string) => {
      setValues((current) => {
        const next = { ...current, [key]: value };
        onChange(next);
        return next;
      });
    },
    [onChange]
  );

  return (
    <div className="grid gap-3">
      {fields.map((field) => (
        <div key={field.key} className="grid gap-1.5">
          <Label htmlFor={`proposal-${field.key}`}>{field.label}</Label>
          {field.kind === 'textarea' ? (
            <Textarea
              id={`proposal-${field.key}`}
              value={values[field.key] ?? ''}
              rows={14}
              className="font-mono text-xs surface-input"
              onChange={(event) => update(field.key, event.target.value)}
            />
          ) : (
            <Input
              id={`proposal-${field.key}`}
              type={INPUT_TYPES[field.kind] ?? 'text'}
              value={values[field.key] ?? ''}
              className="surface-input"
              onChange={(event) => update(field.key, event.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default AiProposalForm;
