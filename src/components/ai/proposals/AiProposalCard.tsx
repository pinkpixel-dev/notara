import React, { useMemo, useState } from 'react';
import { Check, FileDiff, Loader2, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildDiffRows, previewRows } from '@/lib/ai/diff';
import {
  hasDiff,
  proposalFields,
  proposalTarget,
  proposalTitle,
  type Proposal,
  type ProposalStatus,
} from '@/lib/ai/proposals';
import AiDiffView from './AiDiffView';
import AiProposalDialog from './AiProposalDialog';

interface AiProposalCardProps {
  proposal: Proposal;
  status: ProposalStatus;
  /** Present once applied, when the change can be put back. */
  undo?: Proposal;
  /** The line recorded after the decision, such as what was written. */
  outcome: string;
  busy: boolean;
  onApply: (proposal: Proposal) => void;
  onCancel: () => void;
  onUndo: () => void;
}

const STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: 'Waiting for you',
  applied: 'Applied',
  cancelled: 'Cancelled',
  failed: 'Did not go through',
  undone: 'Undone',
};

/**
 * A change the assistant is asking to make.
 *
 * The card answers three questions without being opened: what kind of change,
 * exactly what it lands on, and roughly what it does. The full diff is one
 * press away, because a 380 pixel column is not where a long document change
 * should be read.
 *
 * Nothing here is reversible by accident. Apply is a deliberate press, Cancel
 * changes nothing at all, and an applied change keeps its Undo.
 */
const AiProposalCard: React.FC<AiProposalCardProps> = ({
  proposal,
  status,
  undo,
  outcome,
  busy,
  onApply,
  onCancel,
  onUndo,
}) => {
  const [isReviewing, setIsReviewing] = useState(false);

  const diff = useMemo(
    () =>
      hasDiff(proposal)
        ? buildDiffRows(
            proposal.kind === 'edit_note' ? proposal.before : '',
            proposal.kind === 'edit_note' ? proposal.after : proposal.content
          )
        : [],
    [proposal]
  );

  const preview = useMemo(() => previewRows(diff), [diff]);
  const fields = useMemo(() => (hasDiff(proposal) ? [] : proposalFields(proposal)), [proposal]);
  const isPending = status === 'pending';

  return (
    <section
      aria-label={`${proposalTitle(proposal)}: ${proposalTarget(proposal)}`}
      className={cn(
        'rounded-lg border p-3 text-sm',
        isPending ? 'border-primary/50 surface-elevated' : 'border-border surface-elevated'
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-medium">{proposalTitle(proposal)}</h3>
          <p className="break-words font-mono text-xs text-muted-foreground">
            {proposalTarget(proposal)}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2 py-0.5 text-xs',
            status === 'applied' && 'border-emerald-500/40 text-emerald-500',
            status === 'failed' && 'border-destructive/40 text-destructive',
            (status === 'cancelled' || status === 'undone') && 'border-border text-muted-foreground',
            isPending && 'border-primary/40 text-primary'
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </header>

      {preview.rows.length > 0 && (
        <div className="mt-2">
          <AiDiffView rows={preview.rows} compact />
          {preview.hidden > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              and {preview.hidden} more changed {preview.hidden === 1 ? 'line' : 'lines'}
            </p>
          )}
        </div>
      )}

      {fields.length > 0 && (
        <dl className="mt-2 grid gap-1">
          {fields.slice(0, 3).map((field) => (
            <div key={field.label} className="flex gap-2 text-xs">
              <dt className="shrink-0 text-muted-foreground">{field.label}</dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {outcome && <p className="mt-2 text-xs text-muted-foreground">{outcome}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {isPending ? (
          <>
            <Button size="sm" disabled={busy} onClick={() => onApply(proposal)}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Apply
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setIsReviewing(true)}
            >
              <FileDiff className="mr-2 h-4 w-4" aria-hidden="true" />
              Review
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
              <X className="mr-2 h-4 w-4" aria-hidden="true" />
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={() => setIsReviewing(true)}>
              <FileDiff className="mr-2 h-4 w-4" aria-hidden="true" />
              See the change
            </Button>
            {status === 'applied' && undo && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={onUndo}>
                <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Undo
              </Button>
            )}
          </>
        )}
      </div>

      <AiProposalDialog
        open={isReviewing}
        onOpenChange={setIsReviewing}
        proposal={proposal}
        diff={diff}
        readOnly={!isPending}
        busy={busy}
        onApply={(edited) => {
          setIsReviewing(false);
          onApply(edited);
        }}
        onCancel={() => {
          setIsReviewing(false);
          onCancel();
        }}
      />
    </section>
  );
};

export default AiProposalCard;
