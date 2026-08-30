---
title: Workspace & Content Model
description: How notes, directory trees, frontmatter metadata, and the .notara sidecar work together.
---

## The local-first workspace

Notara operates directly on a folder on your computer. When you choose or open a workspace, Notara
treats the folder as the single source of truth for your notes.

Unlike applications that hide your content in an internal SQLite database or bundle notes into large
JSON files, Notara writes standard Markdown files (`.md`) directly into your directories.

```text
my-workspace/
  ├── Projects/
  │   ├── Roadmap.md
  │   └── Design Notes.md
  ├── Daily/
  │   └── 2026-08-30.md
  ├── Ideas.md
  └── .notara/
      ├── workspace.json
      ├── todos.json
      ├── reminders.json
      ├── vision-boards.json
      ├── media/
      └── backups/
```

## How files and metadata are stored

### Markdown notes

- **File-based identity:** A note's identity is its relative path in the workspace (such as `Projects/Roadmap.md`).
- **File renaming:** Changing a note's title renames the file on disk.
- **Preserved frontmatter:** If your note has YAML frontmatter, Notara preserves any custom keys, comments,
  and formatting. The app only updates the standard metadata keys it manages (`created`, `updated`).

### The `.notara` sidecar folder

To keep your Markdown documents clean and prevent unnecessary file rewrites, workspace-specific state
lives in a hidden `.notara/` directory at the root of your workspace:

| File | Purpose |
| --- | --- |
| `workspace.json` | Stores expanded folder state, pinned note paths, and starred note paths. |
| `todos.json` | Stores your to-do lists, task items, sub-items, and due times. |
| `reminders.json` | Persistent ledger for scheduled reminders and delivery tracking. |
| `vision-boards.json` | Layout, card positions, text content, and color settings for vision boards. |
| `media/` | Local storage for images added to vision boards or notes. |
| `backups/` | Automatic backup snapshot created whenever a note is overwritten. |

## File operations and safety

Notara is built to prevent data loss when editing notes:

### Atomic writes in Rust

On desktop, saving a note does not write directly into the existing file. Instead, the Rust backend
writes the content to a temporary sibling file, flushes data to disk with `sync_all`, and performs an
atomic rename over the target file.

### Revision guarding and conflict detection

Every time a note is read from disk, Notara records a revision stamp based on modified timestamp and file
size. When saving:

1. The backend verifies that the file on disk still matches the expected revision.
2. If another application (like VS Code or Obsidian) modified the file in the meantime, Notara detects
   the mismatch and prompts you with a conflict resolution dialog.
3. You can review both versions and choose whether to keep your changes or reload the disk version.

### Auto Save

Auto Save can be toggled in **Settings**. When enabled, edits queue a background save after 1.5 seconds
of inactivity. All saves run through a single serialized write lane so rapid edits cannot interleave or
corrupt file states.

## Directory organization

- **Nested folders:** Create, rename, move, and delete folders directly inside Notara's sidebar tree.
- **Hoisted pins:** Pin up to five notes to keep them visible at the top of the sidebar without
  altering their location on disk.
- **Starred filter:** Star any note to quickly locate it using the Starred toggle in the sidebar.
