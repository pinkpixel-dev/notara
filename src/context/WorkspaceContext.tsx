import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFileSystem } from './FileSystemContext';
import {
  createWorkspaceDirectory,
  deleteWorkspaceEntry,
  moveWorkspaceEntry,
  previewWorkspaceDeletion,
  renameWorkspaceEntry,
  type DeletionPreview,
} from '@/lib/workspace/commands';
import { scanWorkspace } from '@/lib/workspace/scan';
import { readSidecarState, writeSidecarState } from '@/lib/workspace/sidecar';
import { ancestorsOf } from '@/lib/workspace/tree';
import { joinRelative, type WorkspaceScan } from '@/lib/workspace/types';
import {
  WorkspaceContext,
  type WorkspaceContextValue,
  type WorkspaceScanStatus,
} from './WorkspaceContextTypes';

/**
 * Delay before open and closed groups are written to `.notara/workspace.json`.
 *
 * Expanding a few folders in a row is one gesture, not four, so the writes are
 * collapsed into a single one rather than touching the file on every click.
 */
const STATE_WRITE_DELAY_MS = 500;

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, rootHandle } = useFileSystem();

  const [scanStatus, setScanStatus] = useState<WorkspaceScanStatus>('idle');
  const [scan, setScan] = useState<WorkspaceScan | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [expandedDirectories, setExpandedDirectories] = useState<ReadonlySet<string>>(
    () => new Set([''])
  );

  // Writing the sidecar before the saved state has been read would overwrite
  // the user's open groups with an empty default on every start.
  const stateLoadedRef = useRef(false);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canManageDirectories =
    rootHandle?.kind === 'tauri' && rootHandle.source === 'workspace';

  /** Rescans the workspace. Returns what it found, or null if the scan failed. */
  const runScan = useCallback(async (): Promise<WorkspaceScan | null> => {
    if (!rootHandle || status !== 'ready') {
      return null;
    }

    setScanStatus('scanning');
    try {
      const result = await scanWorkspace(rootHandle);
      setScan(result);
      setScanStatus('ready');
      setLastError(
        result.truncated
          ? 'This folder nests deeper than Notara scans. Some directories were skipped.'
          : null
      );
      return result;
    } catch (error) {
      console.error('Failed to scan the workspace', error);
      setScan(null);
      setScanStatus('error');
      setLastError((error as Error)?.message ?? 'Unable to read the workspace folder.');
      return null;
    }
  }, [rootHandle, status]);

  // Load the saved open groups, then scan. Both depend on a ready workspace, so
  // a change of folder restarts the pair together.
  useEffect(() => {
    if (!rootHandle || status !== 'ready') {
      stateLoadedRef.current = false;
      setScan(null);
      setScanStatus('idle');
      return;
    }

    let cancelled = false;

    const load = async () => {
      stateLoadedRef.current = false;
      const saved = await readSidecarState(rootHandle);
      if (cancelled) {
        return;
      }

      // The root stays in the set for anything still keyed on it, but it is no
      // longer drawn as a node, so it can no longer be what makes the tree look
      // open.
      setExpandedDirectories(new Set(['', ...saved.expandedDirectories]));
      stateLoadedRef.current = true;

      const result = await runScan();

      // A workspace with nothing saved opens with its top-level folders already
      // expanded. Otherwise the first thing the user sees is a column of closed
      // folders rather than their notes.
      if (!cancelled && result && saved.expandedDirectories.length === 0) {
        setExpandedDirectories((current) => {
          const next = new Set(current);
          result.root.directories.forEach((directory) => next.add(directory.path));
          return next;
        });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [rootHandle, runScan, status]);

  useEffect(() => {
    if (!rootHandle || !stateLoadedRef.current) {
      return;
    }

    if (writeTimerRef.current) {
      clearTimeout(writeTimerRef.current);
    }

    writeTimerRef.current = setTimeout(() => {
      void writeSidecarState(rootHandle, {
        version: 1,
        expandedDirectories: Array.from(expandedDirectories).filter(Boolean).sort(),
        lastActiveFile: null,
      }).catch((error) => {
        console.error('Failed to save the open folders', error);
      });
    }, STATE_WRITE_DELAY_MS);

    return () => {
      if (writeTimerRef.current) {
        clearTimeout(writeTimerRef.current);
      }
    };
  }, [expandedDirectories, rootHandle]);

  const setDirectoryExpanded = useCallback((path: string, expanded: boolean) => {
    setExpandedDirectories((current) => {
      const next = new Set(current);
      if (expanded) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  }, []);

  const toggleDirectory = useCallback((path: string) => {
    setExpandedDirectories((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const revealPath = useCallback((path: string) => {
    setExpandedDirectories((current) => {
      const next = new Set(current);
      ancestorsOf(path).forEach((ancestor) => next.add(ancestor));
      return next;
    });
  }, []);

  /**
   * Runs a directory command and refreshes the tree from disk afterwards.
   *
   * The tree is rebuilt by rescanning rather than by patching state, so what
   * the notes bar shows is always what the folder actually contains.
   */
  const runDirectoryAction = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | null> => {
      if (!canManageDirectories) {
        setLastError('Folder actions are only available in the Notara desktop app.');
        return null;
      }

      try {
        const result = await action();
        setLastError(null);
        await runScan();
        return result;
      } catch (error) {
        const message =
          typeof error === 'string' ? error : (error as Error)?.message ?? 'That action failed.';
        console.error('Workspace directory action failed', error);
        setLastError(message);
        throw new Error(message);
      }
    },
    [canManageDirectories, runScan]
  );

  const createDirectory = useCallback(
    async (parentPath: string, name: string) => {
      const created = await runDirectoryAction(() =>
        createWorkspaceDirectory(joinRelative(parentPath, name.trim()))
      );
      if (created) {
        revealPath(created);
        setDirectoryExpanded(parentPath, true);
      }
      return created;
    },
    [revealPath, runDirectoryAction, setDirectoryExpanded]
  );

  const renameEntry = useCallback(
    (path: string, newName: string) => runDirectoryAction(() => renameWorkspaceEntry(path, newName)),
    [runDirectoryAction]
  );

  const moveEntry = useCallback(
    async (path: string, destinationDirectory: string) => {
      const moved = await runDirectoryAction(() => moveWorkspaceEntry(path, destinationDirectory));
      if (moved) {
        revealPath(moved);
      }
      return moved;
    },
    [revealPath, runDirectoryAction]
  );

  const deleteEntry = useCallback(
    async (path: string) => {
      await runDirectoryAction(() => deleteWorkspaceEntry(path));
      setDirectoryExpanded(path, false);
      return true;
    },
    [runDirectoryAction, setDirectoryExpanded]
  );

  const previewDeletion = useCallback(
    async (path: string): Promise<DeletionPreview | null> => {
      if (!canManageDirectories) {
        return null;
      }
      try {
        return await previewWorkspaceDeletion(path);
      } catch (error) {
        console.error('Failed to count what a delete would remove', error);
        return null;
      }
    },
    [canManageDirectories]
  );

  /**
   * The refresh the rest of the app gets.
   *
   * `runScan` returns its result, which only the loader below needs. This has to
   * be its own stable callback rather than an arrow inside the context value:
   * that value is rebuilt whenever a folder is expanded, and an identity that
   * changed with it would restart every effect depending on `refresh`, which
   * includes the one that reads every note in the workspace.
   */
  const refresh = useCallback(async (): Promise<void> => {
    await runScan();
  }, [runScan]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      scanStatus,
      scan,
      lastError,
      expandedDirectories,
      canManageDirectories,
      refresh,
      toggleDirectory,
      setDirectoryExpanded,
      revealPath,
      createDirectory,
      renameEntry,
      moveEntry,
      deleteEntry,
      previewDeletion,
    }),
    [
      canManageDirectories,
      createDirectory,
      deleteEntry,
      expandedDirectories,
      lastError,
      moveEntry,
      previewDeletion,
      renameEntry,
      refresh,
      revealPath,
      scan,
      scanStatus,
      setDirectoryExpanded,
      toggleDirectory,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
