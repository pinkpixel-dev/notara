/** Shared shapes for workspace scanning and the directory tree. */

/** A Markdown file found by a workspace scan. */
export interface WorkspaceFile {
  /** Workspace-relative path with forward slashes, unique within a workspace. */
  path: string;
  /** File name including the extension. */
  name: string;
  /** File name without the Markdown extension, used as the display title. */
  title: string;
  /** Relative path of the directory holding the file. Empty for the root. */
  directory: string;
}

/** A directory in the workspace, with its files and child directories. */
export interface WorkspaceDirectory {
  /** Workspace-relative path with forward slashes. Empty string for the root. */
  path: string;
  /** Final path segment. The root uses the workspace folder name. */
  name: string;
  directories: WorkspaceDirectory[];
  files: WorkspaceFile[];
  /** Markdown files in this directory and everything beneath it. */
  totalFiles: number;
}

/** The result of scanning a workspace folder. */
export interface WorkspaceScan {
  root: WorkspaceDirectory;
  files: WorkspaceFile[];
  /** Directories reached before the depth limit stopped the walk. */
  truncated: boolean;
}

/** Notara's own state for a workspace, stored in `.notara/workspace.json`. */
export interface WorkspaceSidecarState {
  version: 1;
  /** Relative paths of directories the user has left open in the tree. */
  expandedDirectories: string[];
  /** Relative path of the last file the user opened, if any. */
  lastActiveFile: string | null;
}

export const emptySidecarState = (): WorkspaceSidecarState => ({
  version: 1,
  expandedDirectories: [],
  lastActiveFile: null,
});

/**
 * Directory names a scan never descends into, at any depth.
 *
 * Dot directories are handled separately by `isIgnoredDirectory`, so this only
 * needs the undotted names worth skipping wherever they appear.
 */
export const IGNORED_DIRECTORIES = new Set(['node_modules']);

/**
 * Directory names that are Notara's own storage rather than the user's notes.
 *
 * `data/` holds `notes.json`, the AI conversation history, the settings, and
 * the old `note-{uuid}.md` mirrors. It is skipped only at the workspace root,
 * because that is the one place Notara writes it. A folder the user happens to
 * name `data` further down is theirs and stays visible.
 */
export const APP_DIRECTORIES = new Set(['data']);

/**
 * Decides whether a scan should skip a directory.
 *
 * `parentPath` is the workspace-relative path of the directory holding this
 * entry, so the empty string means the entry sits at the workspace root.
 */
export const isIgnoredDirectory = (name: string, parentPath: string): boolean => {
  if (name.startsWith('.')) {
    return true;
  }
  if (IGNORED_DIRECTORIES.has(name)) {
    return true;
  }
  return parentPath === '' && APP_DIRECTORIES.has(name);
};

/** Extensions a scan treats as notes. */
export const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

export const isMarkdownFile = (name: string): boolean =>
  MARKDOWN_EXTENSIONS.some((extension) => name.toLowerCase().endsWith(extension));

export const markdownTitle = (name: string): string =>
  name.replace(/\.(md|markdown)$/i, '') || name;

/** Joins workspace-relative segments without leaving a leading slash. */
export const joinRelative = (...segments: string[]): string =>
  segments.filter((segment) => segment.length > 0).join('/');

/** Returns the parent directory path of a workspace-relative path. */
export const parentOf = (path: string): string => {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
};

/** Returns the final segment of a workspace-relative path. */
export const nameOf = (path: string): string => {
  const index = path.lastIndexOf('/');
  return index === -1 ? path : path.slice(index + 1);
};
