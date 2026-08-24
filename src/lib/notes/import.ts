/**
 * Importing Markdown files into the workspace.
 *
 * Importing copies a file's text into a new note. It never links back to the
 * original, so editing the imported note does not touch the file it came from.
 * That is what separates Import from Open, which is not built yet.
 *
 * Both runtimes pick files differently and the difference is not cosmetic. The
 * desktop build has no File System Access API at all, because the webview it
 * runs in does not implement it, so it goes through the Tauri dialog plugin.
 */
import { open as openSystemDialog } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { fileSystemHelpers } from '@/lib/filesystem';
import { nameOf } from '@/lib/workspace/types';
import { fileNameToTitle } from './naming';

/** Extensions offered in the file dialog. */
const IMPORT_EXTENSIONS = ['md', 'markdown', 'txt'];

/** A file the user chose, already read. */
export interface ImportSource {
  /** File name including the extension, used to derive the note's title. */
  name: string;
  text: string;
}

/** A file that could not be read, kept so the user is told rather than not. */
export interface ImportFailure {
  name: string;
  message: string;
}

export interface ImportSelection {
  sources: ImportSource[];
  failures: ImportFailure[];
}

/** Reads the files the user picked in the desktop dialog. */
const pickTauriFiles = async (): Promise<ImportSelection | null> => {
  const selected = await openSystemDialog({
    multiple: true,
    directory: false,
    title: 'Choose Markdown files to import',
    filters: [{ name: 'Markdown', extensions: IMPORT_EXTENSIONS }],
  });

  // The plugin returns a single value when one file is picked and null when the
  // dialog is dismissed.
  const paths = Array.isArray(selected) ? selected : selected ? [selected] : [];
  if (paths.length === 0) {
    return null;
  }

  const sources: ImportSource[] = [];
  const failures: ImportFailure[] = [];

  for (const path of paths) {
    const name = nameOf(path.replace(/\\/g, '/'));
    try {
      sources.push({ name, text: await readTextFile(path) });
    } catch (error) {
      failures.push({
        name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { sources, failures };
};

/** The picker the browser build uses, where it is available. */
type OpenFilePicker = (options: {
  multiple: boolean;
  types: Array<{ description: string; accept: Record<string, string[]> }>;
}) => Promise<FileSystemFileHandle[]>;

const pickBrowserFiles = async (): Promise<ImportSelection | null> => {
  const picker = (window as unknown as { showOpenFilePicker?: OpenFilePicker })
    .showOpenFilePicker;
  if (!picker) {
    throw new Error('This browser cannot open local files.');
  }

  let handles: FileSystemFileHandle[];
  try {
    handles = await picker({
      multiple: true,
      types: [
        {
          description: 'Markdown Files',
          accept: {
            'text/markdown': ['.md', '.markdown'],
            'text/plain': ['.txt'],
          },
        },
      ],
    });
  } catch (error) {
    // Dismissing the picker is not a failure worth reporting.
    if ((error as DOMException)?.name === 'AbortError') {
      return null;
    }
    throw error;
  }

  const sources: ImportSource[] = [];
  const failures: ImportFailure[] = [];

  for (const handle of handles) {
    try {
      const file = await handle.getFile();
      sources.push({ name: file.name, text: await file.text() });
    } catch (error) {
      failures.push({
        name: handle.name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { sources, failures };
};

/**
 * Asks the user for Markdown files and reads them.
 *
 * Returns null when the dialog was dismissed, which is not an error and should
 * not be reported as one.
 */
export const pickMarkdownFiles = async (): Promise<ImportSelection | null> =>
  fileSystemHelpers.isTauriEnvironment() ? pickTauriFiles() : pickBrowserFiles();
