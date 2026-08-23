/**
 * Turns a flat scan result into the nested directory model the notes bar draws.
 */
import {
  joinRelative,
  nameOf,
  parentOf,
  type WorkspaceDirectory,
  type WorkspaceFile,
} from './types';

/** Sorts directories and files by name, ignoring case, the way a file manager does. */
const byName = (left: { name: string }, right: { name: string }): number =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });

/**
 * Builds the tree.
 *
 * Directories come from the scan rather than from file paths so that empty
 * folders still appear. Any directory implied by a file path but missing from
 * the list is filled in, which keeps the tree complete even if a scan is
 * partial.
 */
export const buildDirectoryTree = (
  rootName: string,
  files: WorkspaceFile[],
  directories: string[] = []
): WorkspaceDirectory => {
  const nodes = new Map<string, WorkspaceDirectory>();

  const ensureDirectory = (path: string): WorkspaceDirectory => {
    const existing = nodes.get(path);
    if (existing) {
      return existing;
    }

    const node: WorkspaceDirectory = {
      path,
      name: path === '' ? rootName : nameOf(path),
      directories: [],
      files: [],
      totalFiles: 0,
    };
    nodes.set(path, node);

    if (path !== '') {
      ensureDirectory(parentOf(path)).directories.push(node);
    }

    return node;
  };

  const root = ensureDirectory('');

  directories.forEach((path) => {
    if (path) {
      ensureDirectory(path);
    }
  });

  files.forEach((file) => {
    ensureDirectory(file.directory).files.push(file);
  });

  // A directory's count includes everything beneath it, so the walk has to
  // finish the children before the parent can add them up.
  const countFiles = (node: WorkspaceDirectory): number => {
    node.directories.sort(byName);
    node.files.sort(byName);
    node.totalFiles =
      node.files.length +
      node.directories.reduce((total, child) => total + countFiles(child), 0);
    return node.totalFiles;
  };

  countFiles(root);
  return root;
};

/** Collects every directory path in the tree, root first, depth first. */
export const flattenDirectories = (root: WorkspaceDirectory): WorkspaceDirectory[] => {
  const collected: WorkspaceDirectory[] = [root];
  root.directories.forEach((child) => {
    collected.push(...flattenDirectories(child));
  });
  return collected;
};

/**
 * Returns the ancestor paths of a directory, so revealing a node can open all
 * of the groups above it in one step.
 */
export const ancestorsOf = (path: string): string[] => {
  const ancestors: string[] = [''];
  const segments = path.split('/').filter(Boolean);
  let current = '';
  segments.slice(0, -1).forEach((segment) => {
    current = joinRelative(current, segment);
    ancestors.push(current);
  });
  return ancestors;
};
