import { createContext, useContext } from 'react';
import type { DeletionPreview } from '@/lib/workspace/commands';
import type { WorkspaceScan } from '@/lib/workspace/types';

export type WorkspaceScanStatus = 'idle' | 'scanning' | 'ready' | 'error';

export interface WorkspaceContextValue {
  scanStatus: WorkspaceScanStatus;
  /** The last completed scan, or null before the first one finishes. */
  scan: WorkspaceScan | null;
  /** Message from the last failed scan or directory action. */
  lastError: string | null;
  /** Relative paths of directories the user has open. The root is `''`. */
  expandedDirectories: ReadonlySet<string>;
  /**
   * Whether directory actions are available.
   *
   * Creating, renaming, moving, and deleting run through the Rust file engine,
   * so they are desktop only. The browser build gets a read-only tree.
   */
  canManageDirectories: boolean;
  refresh: () => Promise<void>;
  toggleDirectory: (path: string) => void;
  setDirectoryExpanded: (path: string, expanded: boolean) => void;
  /** Opens every group above a path so the entry becomes visible. */
  revealPath: (path: string) => void;
  createDirectory: (parentPath: string, name: string) => Promise<string | null>;
  renameEntry: (path: string, newName: string) => Promise<string | null>;
  moveEntry: (path: string, destinationDirectory: string) => Promise<string | null>;
  deleteEntry: (path: string) => Promise<boolean>;
  previewDeletion: (path: string) => Promise<DeletionPreview | null>;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const useWorkspace = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
