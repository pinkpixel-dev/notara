import { useCallback, useState } from 'react';
import type { Proposal } from '@/lib/ai/proposals';
import type { StoredAiMessage } from '@/lib/ai/conversations';
import { useAiProposals } from './useAiProposals';

export interface ProposalDecisions {
  /** The proposal row currently being applied or undone, if any. */
  busyId: string | null;
  apply: (messageId: string, proposal: Proposal) => void;
  cancel: (messageId: string) => void;
  undo: (messageId: string) => void;
}

/**
 * Apply, Cancel, and Undo, recorded in the conversation.
 *
 * A decision is part of the transcript rather than something that happens to
 * it. The row stays where it was and changes state, so scrolling back shows
 * what was proposed, what was decided, and what the result was, in the order it
 * happened.
 *
 * A failure is recorded the same way. If a write is refused because the file
 * changed underneath, that sentence lands on the card, and nothing was written.
 */
export const useProposalDecisions = (
  messages: StoredAiMessage[],
  setMessages: (messages: StoredAiMessage[]) => void
): ProposalDecisions => {
  const applyProposal = useAiProposals();
  const [busyId, setBusyId] = useState<string | null>(null);

  const patch = useCallback(
    (messageId: string, changes: Partial<StoredAiMessage>) => {
      setMessages(
        messages.map((message) =>
          message.id === messageId ? { ...message, ...changes } : message
        )
      );
    },
    [messages, setMessages]
  );

  const run = useCallback(
    async (messageId: string, proposal: Proposal, undone: boolean) => {
      setBusyId(messageId);

      try {
        const result = await applyProposal(proposal);

        patch(messageId, {
          proposalStatus: undone ? 'undone' : 'applied',
          content: result.summary,
          // An undone change keeps no second undo. Redoing it is asking again,
          // which is a new proposal rather than a button that flips state.
          ...(undone ? { undo: undefined } : { proposal, undo: result.undo }),
        });
      } catch (error) {
        patch(messageId, {
          proposalStatus: 'failed',
          content: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setBusyId(null);
      }
    },
    [applyProposal, patch]
  );

  const apply = useCallback(
    (messageId: string, proposal: Proposal) => {
      void run(messageId, proposal, false);
    },
    [run]
  );

  const undo = useCallback(
    (messageId: string) => {
      const message = messages.find((entry) => entry.id === messageId);

      if (!message?.undo) {
        return;
      }

      void run(messageId, message.undo, true);
    },
    [messages, run]
  );

  const cancel = useCallback(
    (messageId: string) => {
      patch(messageId, {
        proposalStatus: 'cancelled',
        content: 'Cancelled. Nothing was changed.',
      });
    },
    [patch]
  );

  return { busyId, apply, cancel, undo };
};
