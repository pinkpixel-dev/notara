/**
 * Turning a note's title into a file name, and back.
 *
 * A note's title is its file name, so this module decides what a title is
 * allowed to be. The rules are the strictest of every platform Notara runs on
 * rather than the platform it happens to be running on, because a workspace
 * gets synced, zipped, and opened elsewhere. A note that saves on Linux and
 * then cannot be checked out on Windows is a broken note.
 */
import { joinRelative, MARKDOWN_EXTENSIONS, nameOf } from '@/lib/workspace/types';

/** The extension Notara gives a note it creates. */
export const NOTE_EXTENSION = '.md';

/** Used when a title sanitizes down to nothing at all. */
export const FALLBACK_TITLE = 'Untitled';

/**
 * How long a file name may get, in characters.
 *
 * Most filesystems cap a single path segment at 255 bytes. A multi-byte title
 * reaches that well before 255 characters, and the numeric suffix that resolves
 * a collision needs room too, so this leaves generous headroom rather than
 * calculating the exact byte cost of every title.
 */
export const MAX_TITLE_LENGTH = 120;

/**
 * Characters no file name may contain.
 *
 * Windows forbids all of these. Slashes would change the note's folder, and a
 * colon breaks on macOS as well as Windows. Control characters are stripped
 * because they are invisible in the interface and confusing in a terminal.
 */
// eslint-disable-next-line no-control-regex
const ILLEGAL_CHARACTERS = /[\\/:*?"<>|\x00-\x1f\x7f]/g;

/**
 * Names Windows reserves for devices, which cannot be used as a file name even
 * with an extension added.
 */
const RESERVED_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/**
 * Reduces a title to something usable as a file name.
 *
 * This is deliberately lossy and the interface should show the result, so a
 * user who types a colon sees immediately that it did not survive rather than
 * discovering it later in their folder.
 */
export const titleToFileName = (title: string): string => {
  let name = title
    .replace(ILLEGAL_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Windows drops trailing dots and spaces silently, which turns "Notes." into
  // "Notes" and makes a later lookup by the original name miss.
  name = name.replace(/[. ]+$/, '');

  // A leading dot would hide the note from the workspace scan, which skips dot
  // entries as Notara's own or the system's.
  name = name.replace(/^\.+/, '').trim();

  if (name.length > MAX_TITLE_LENGTH) {
    name = name.slice(0, MAX_TITLE_LENGTH).trim().replace(/[. ]+$/, '');
  }

  if (name === '' || RESERVED_NAMES.has(name.toLowerCase())) {
    return name === '' ? FALLBACK_TITLE : `${name} note`;
  }

  return name;
};

/** Reads a note's title back out of its file name. */
export const fileNameToTitle = (fileName: string): string => {
  const base = nameOf(fileName);
  const match = MARKDOWN_EXTENSIONS.find((extension) =>
    base.toLowerCase().endsWith(extension)
  );
  return (match ? base.slice(0, -match.length) : base) || base;
};

/**
 * Picks a file name in `directory` that nothing is using yet.
 *
 * `taken` holds the workspace-relative paths already in use, compared without
 * case because Windows and macOS treat `Notes.md` and `notes.md` as one file.
 * A collision gets a counter rather than a random suffix, so the second note
 * called Ideas becomes "Ideas 2" instead of something nobody would name a file.
 */
export const uniqueNotePath = (
  directory: string,
  title: string,
  taken: Iterable<string>
): string => {
  const claimed = new Set<string>();
  for (const path of taken) {
    claimed.add(path.toLowerCase());
  }

  const base = titleToFileName(title);
  const candidate = (suffix: number): string =>
    joinRelative(directory, `${base}${suffix > 1 ? ` ${suffix}` : ''}${NOTE_EXTENSION}`);

  let suffix = 1;
  while (claimed.has(candidate(suffix).toLowerCase())) {
    suffix += 1;
  }

  return candidate(suffix);
};
