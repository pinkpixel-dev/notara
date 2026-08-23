/**
 * Recursive Markdown scan for a workspace folder.
 *
 * Reading and scanning stay in TypeScript, which is the read half of the hybrid
 * file engine described in `DOCS/PHASE-3-PLAN.md`. Both builds are handled here
 * so callers do not need to know which one they are running in.
 */
import { readDir } from '@tauri-apps/plugin-fs';
import type { RootDirectoryHandle } from '@/lib/filesystem';
import {
  IGNORED_DIRECTORIES,
  isMarkdownFile,
  joinRelative,
  markdownTitle,
  type WorkspaceFile,
  type WorkspaceScan,
} from './types';
import { buildDirectoryTree } from './tree';

/**
 * Depth ceiling for a scan.
 *
 * A workspace is a folder the user picked, so it can contain anything. Without
 * a ceiling, a deep or circular structure would hang the scan. Twelve levels is
 * far past what note folders use in practice, and hitting it is reported rather
 * than hidden.
 */
const MAX_DEPTH = 12;

/**
 * The async iterator over a directory's children.
 *
 * TypeScript's DOM library does not describe `entries()` yet, so it is declared
 * here rather than casting at each call site.
 */
type DirectoryEntries = AsyncIterable<[string, FileSystemHandle]>;

const entriesOf = (handle: FileSystemDirectoryHandle): DirectoryEntries =>
  (handle as unknown as { entries: () => DirectoryEntries }).entries();

interface ScanState {
  files: WorkspaceFile[];
  /**
   * Every directory the walk entered, including ones holding no Markdown.
   *
   * The tree is built from this list rather than from file paths, because a
   * folder the user just created is empty and still has to appear.
   */
  directories: string[];
  truncated: boolean;
}

const recordFile = (state: ScanState, directory: string, name: string): void => {
  state.files.push({
    path: joinRelative(directory, name),
    name,
    title: markdownTitle(name),
    directory,
  });
};

const scanTauriDirectory = async (
  absoluteRoot: string,
  directory: string,
  depth: number,
  state: ScanState
): Promise<void> => {
  if (depth > MAX_DEPTH) {
    state.truncated = true;
    return;
  }

  if (directory) {
    state.directories.push(directory);
  }

  const absolutePath = directory ? `${absoluteRoot}/${directory}` : absoluteRoot;
  const entries = await readDir(absolutePath);

  for (const entry of entries) {
    if (!entry.name) {
      continue;
    }
    if (entry.isDirectory) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      await scanTauriDirectory(absoluteRoot, joinRelative(directory, entry.name), depth + 1, state);
      continue;
    }
    if (entry.isFile && isMarkdownFile(entry.name)) {
      recordFile(state, directory, entry.name);
    }
  }
};

const scanBrowserDirectory = async (
  handle: FileSystemDirectoryHandle,
  directory: string,
  depth: number,
  state: ScanState
): Promise<void> => {
  if (depth > MAX_DEPTH) {
    state.truncated = true;
    return;
  }

  if (directory) {
    state.directories.push(directory);
  }

  for await (const [name, entry] of entriesOf(handle)) {
    if (entry.kind === 'directory') {
      if (IGNORED_DIRECTORIES.has(name)) {
        continue;
      }
      await scanBrowserDirectory(
        entry as FileSystemDirectoryHandle,
        joinRelative(directory, name),
        depth + 1,
        state
      );
      continue;
    }
    if (isMarkdownFile(name)) {
      recordFile(state, directory, name);
    }
  }
};

/**
 * Walks a workspace and returns its Markdown files plus a directory tree.
 *
 * The walk only reads. Nothing is created, touched, or modified, which is what
 * lets browsing a folder leave every file's modified time alone.
 */
export const scanWorkspace = async (root: RootDirectoryHandle): Promise<WorkspaceScan> => {
  const state: ScanState = { files: [], directories: [], truncated: false };

  if (root.kind === 'tauri') {
    await scanTauriDirectory(root.path, '', 0, state);
  } else {
    await scanBrowserDirectory(root.handle, '', 0, state);
  }

  state.files.sort((left, right) => left.path.localeCompare(right.path));
  state.directories.sort((left, right) => left.localeCompare(right));

  return {
    root: buildDirectoryTree(root.name, state.files, state.directories),
    files: state.files,
    truncated: state.truncated,
  };
};
