/**
 * Line diffs for the review screen.
 *
 * The panel's promise is that nothing is written without the user seeing what
 * changes, so this is the part of the feature that has to be exactly right.
 * `diff` does the comparison; everything here is about presenting it: line
 * numbers on both sides, unchanged runs collapsed so a two-line change in a
 * long note does not arrive as a long note.
 */
import { diffLines } from 'diff';

export type DiffRowType = 'context' | 'added' | 'removed' | 'gap';

export interface DiffRow {
  type: DiffRowType;
  text: string;
  /** Line number in the original, when the row exists there. */
  beforeLine?: number;
  /** Line number in the new version, when the row exists there. */
  afterLine?: number;
}

export interface DiffSummary {
  added: number;
  removed: number;
}

/** How many unchanged lines to keep either side of a change. */
const CONTEXT_LINES = 3;

const splitLines = (value: string): string[] => {
  const lines = value.split('\n');

  // A trailing newline produces an empty last element that is not a line.
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines;
};

/**
 * Builds every row of the diff, unchanged lines included.
 *
 * Collapsing happens afterwards, in `collapseContext`, so the caller can ask
 * for the whole thing when there is room to show it.
 */
export const buildDiffRows = (before: string, after: string): DiffRow[] => {
  const rows: DiffRow[] = [];
  let beforeLine = 0;
  let afterLine = 0;

  for (const part of diffLines(before, after)) {
    for (const text of splitLines(part.value)) {
      if (part.added) {
        afterLine += 1;
        rows.push({ type: 'added', text, afterLine });
      } else if (part.removed) {
        beforeLine += 1;
        rows.push({ type: 'removed', text, beforeLine });
      } else {
        beforeLine += 1;
        afterLine += 1;
        rows.push({ type: 'context', text, beforeLine, afterLine });
      }
    }
  }

  return rows;
};

/**
 * Replaces long runs of unchanged lines with a single gap row.
 *
 * The gap says how many lines it stands for, because "12 unchanged lines" is
 * information and an unexplained break is not.
 */
export const collapseContext = (rows: DiffRow[], contextLines = CONTEXT_LINES): DiffRow[] => {
  const isChange = (row: DiffRow) => row.type === 'added' || row.type === 'removed';

  const keep = rows.map((row, index) => {
    if (isChange(row)) {
      return true;
    }

    return rows.some(
      (other, otherIndex) => isChange(other) && Math.abs(otherIndex - index) <= contextLines
    );
  });

  const collapsed: DiffRow[] = [];
  let hidden = 0;

  rows.forEach((row, index) => {
    if (keep[index]) {
      if (hidden > 0) {
        collapsed.push({
          type: 'gap',
          text: `${hidden} unchanged line${hidden === 1 ? '' : 's'}`,
        });
        hidden = 0;
      }
      collapsed.push(row);
      return;
    }

    hidden += 1;
  });

  if (hidden > 0) {
    collapsed.push({
      type: 'gap',
      text: `${hidden} unchanged line${hidden === 1 ? '' : 's'}`,
    });
  }

  return collapsed;
};

export const summarizeDiff = (rows: DiffRow[]): DiffSummary => ({
  added: rows.filter((row) => row.type === 'added').length,
  removed: rows.filter((row) => row.type === 'removed').length,
});

/**
 * The first few changed lines, for the card in the panel.
 *
 * Changes only, with no context. The card is a summary that says what kind of
 * change this is; the dialog is where it is actually read.
 */
export const previewRows = (rows: DiffRow[], limit = 6): { rows: DiffRow[]; hidden: number } => {
  const changes = rows.filter((row) => row.type === 'added' || row.type === 'removed');

  return {
    rows: changes.slice(0, limit),
    hidden: Math.max(0, changes.length - limit),
  };
};
