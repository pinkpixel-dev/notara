import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buildDiffRows, collapseContext, summarizeDiff } from '@/lib/ai/diff';
import {
  hasDiff,
  proposalFields,
  proposalTarget,
  proposalTitle,
  type Proposal,
} from '@/lib/ai/proposals';
import { applyProposalEdits, canEdit, editableFields } from '@/lib/ai/proposal-edits';
import type { DiffRow } from '@/lib/ai/diff';
import AiDiffView from './AiDiffView';
import AiProposalForm from './AiProposalForm';

interface AiProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal;
  /** Rows for the proposal as it arrived, reused from the card. */
  diff: DiffRow[];
  /** True once the proposal has been decided, so it is a record rather than a choice. */
  readOnly: boolean;
  busy: boolean;
  onApply: (proposal: Proposal) => void;
  onCancel: () => void;
}

/**
 * The whole change, with room to read it.
 *
 * Wider than the panel because that is the point: a diff read three words at a
 * time is not a review. Editing happens here too, so the version being approved
 * is the version on screen.
 */
const AiProposalDialog: React.FC<AiProposalDialogProps> = ({
  open,
  onOpenChange,
  proposal,
  diff,
  readOnly,
  busy,
  onApply,
  onCancel,
}) => {
  const [draft, setDraft] = useState<Proposal>(proposal);
  const [isEditing, setIsEditing] = useState(false);

  // Reopening shows the proposal as it stands, not an abandoned edit from last
  // time the dialog was open.
  useEffect(() => {
    if (open) {
      setDraft(proposal);
      setIsEditing(false);
    }
  }, [open, proposal]);

  const edited = draft !== proposal;

  const rows = useMemo(() => {
    if (!hasDiff(draft)) {
      return [];
    }

    const source = edited
      ? buildDiffRows(
          draft.kind === 'edit_note' ? draft.before : '',
          draft.kind === 'edit_note' ? draft.after : draft.content
        )
      : diff;

    return collapseContext(source);
  }, [diff, draft, edited]);

  const summary = useMemo(() => summarizeDiff(rows), [rows]);
  const fields = useMemo(() => (hasDiff(draft) ? [] : proposalFields(draft)), [draft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(56rem,95vw)] max-w-none flex-col gap-3">
        <DialogHeader>
          <DialogTitle>{proposalTitle(draft)}</DialogTitle>
          <DialogDescription className="break-words font-mono text-xs">
            {proposalTarget(draft)}
          </DialogDescription>
        </DialogHeader>

        {hasDiff(draft) && (
          <p className="text-xs text-muted-foreground">
            {summary.added} added, {summary.removed} removed
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isEditing ? (
            <AiProposalForm
              fields={editableFields(draft)}
              onChange={(values) => setDraft(applyProposalEdits(proposal, values))}
            />
          ) : (
            <>
              {rows.length > 0 && <AiDiffView rows={rows} />}

              {fields.length > 0 && (
                <dl className="grid gap-2 text-sm">
                  {fields.map((field) => (
                    <div key={field.label} className="grid gap-0.5">
                      <dt className="text-xs text-muted-foreground">{field.label}</dt>
                      <dd className="whitespace-pre-wrap break-words">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {readOnly ? (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <div className="flex gap-2">
                <Button variant="ghost" disabled={busy} onClick={onCancel}>
                  <X className="mr-2 h-4 w-4" aria-hidden="true" />
                  Cancel
                </Button>
                {canEdit(draft) && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    aria-pressed={isEditing}
                    onClick={() => setIsEditing((current) => !current)}
                  >
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    {isEditing ? 'Back to the diff' : 'Edit proposal'}
                  </Button>
                )}
              </div>

              <Button disabled={busy} onClick={() => onApply(draft)}>
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {edited ? 'Apply my version' : 'Apply'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AiProposalDialog;
