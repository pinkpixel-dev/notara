/**
 * Typed wrappers around the Rust workspace commands.
 *
 * Anything that can lose data lives in Rust: directory creation, renames,
 * moves, and deletes. The backend holds the approved workspace root and only
 * ever accepts relative paths from here, so a bad value cannot redirect an
 * operation at a folder outside the workspace.
 */
import { invoke } from '@tauri-apps/api/core';

export interface ApprovedWorkspaceInfo {
  /** Absolute, symlink-resolved path to the workspace root. */
  path: string;
  /** Final path segment, used as the display name. */
  name: string;
  /** Absolute path to the `.notara` sidecar directory. */
  sidecarPath: string;
}

export interface DeletionPreview {
  isDirectory: boolean;
  fileCount: number;
  directoryCount: number;
}

/**
 * Approves a folder as the workspace root.
 *
 * This widens the desktop filesystem scope to cover the folder and creates
 * `.notara` with its `backups` and `media` subdirectories. It is safe to call
 * again with the same path, which is how the app reconnects after a restart.
 */
export const approveWorkspace = (path: string): Promise<ApprovedWorkspaceInfo> =>
  invoke<ApprovedWorkspaceInfo>('approve_workspace', { path });

export const forgetWorkspace = (): Promise<void> => invoke<void>('forget_workspace');

export const createWorkspaceDirectory = (relativePath: string): Promise<string> =>
  invoke<string>('create_workspace_directory', { relativePath });

export const renameWorkspaceEntry = (relativePath: string, newName: string): Promise<string> =>
  invoke<string>('rename_workspace_entry', { relativePath, newName });

export const moveWorkspaceEntry = (
  relativePath: string,
  destinationDirectory: string
): Promise<string> =>
  invoke<string>('move_workspace_entry', { relativePath, destinationDirectory });

export const deleteWorkspaceEntry = (relativePath: string): Promise<void> =>
  invoke<void>('delete_workspace_entry', { relativePath });

export const previewWorkspaceDeletion = (relativePath: string): Promise<DeletionPreview> =>
  invoke<DeletionPreview>('preview_workspace_deletion', { relativePath });
