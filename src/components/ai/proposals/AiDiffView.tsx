import React from 'react';
import { cn } from '@/lib/utils';
import type { DiffRow } from '@/lib/ai/diff';

interface AiDiffViewProps {
  rows: DiffRow[];
  /** Leaves out line numbers, for the narrow card in the panel. */
  compact?: boolean;
  className?: string;
}

const ROW_STYLES: Record<DiffRow['type'], string> = {
  added: 'bg-emerald-500/10 text-foreground',
  removed: 'bg-destructive/10 text-foreground',
  context: 'text-muted-foreground',
  gap: 'text-muted-foreground/70 italic',
};

const MARKERS: Record<DiffRow['type'], string> = {
  added: '+',
  removed: '-',
  context: ' ',
  gap: ' ',
};

/**
 * The change, line by line.
 *
 * A marker character carries the meaning, not the colour: `+` and `-` are the
 * signal and the tint is support for it, so the diff still reads in a
 * high-contrast theme or to anyone who does not separate red from green.
 *
 * Long lines scroll sideways inside the view rather than wrapping. A wrapped
 * line in a diff makes one changed line look like several.
 */
const AiDiffView: React.FC<AiDiffViewProps> = ({ rows, compact = false, className }) => (
  <div className={cn('overflow-x-auto rounded-md border border-border', className)}>
    <table className="w-full border-collapse font-mono text-xs">
      <caption className="sr-only">
        The proposed change, with removed lines marked minus and added lines marked plus
      </caption>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.type}-${index}`} className={ROW_STYLES[row.type]}>
            {!compact && (
              <>
                <td className="select-none px-2 py-0.5 text-right align-top text-muted-foreground/60">
                  {row.beforeLine ?? ''}
                </td>
                <td className="select-none px-2 py-0.5 text-right align-top text-muted-foreground/60">
                  {row.afterLine ?? ''}
                </td>
              </>
            )}
            <td className="select-none py-0.5 pl-2 align-top" aria-hidden="true">
              {MARKERS[row.type]}
            </td>
            {/* Takes the leftover width so the line numbers hug the left edge
                rather than being spread across the table. */}
            <td className="w-full whitespace-pre py-0.5 pr-2 align-top">
              {row.type === 'gap' ? row.text : row.text || ' '}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default AiDiffView;
