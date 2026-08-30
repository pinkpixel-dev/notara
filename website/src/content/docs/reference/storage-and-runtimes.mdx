---
title: Storage & Runtime Targets
description: Reference documentation for file paths, security boundaries, and runtime targets in Notara.
---

## Runtime targets

Notara runs in two main environments:

| Target | Runtime | Key Features |
| --- | --- | --- |
| Desktop App | Tauri 2 (Linux & Windows) | Full filesystem access, atomic writes, system tray background reminders, and native notifications. |
| Web Application | Modern Web Browser | Uses File System Access API to edit local folders without installation. |

## Desktop file engine & security

On desktop builds, all file operations run through a Rust backend engine designed with strict safety boundaries:

### Path traversal & symlink guards

- **Held root:** When a workspace folder is chosen, its canonical path is held in secure backend state.
- **Strict path verification:** All commands receive relative paths from the webview and verify that the target
  resolves inside the approved workspace root.
- **Symlink protection:** Operations canonicalize symlinks before execution and refuse any path that escapes
  the workspace root.

### Atomic write lifecycle

When saving a file:

1. A temporary file is written in the same directory (`.filename.tmp`).
2. Data is committed with `sync_all` to ensure physical disk persistence.
3. The previous file is copied to `.notara/backups/`.
4. The temporary file is atomically renamed over the target file.

## Task reminders and background delivery

Notara 2.5.0 includes a native background reminder system for scheduled tasks:

### Rust scheduler & ledger

- Reminder schedules and delivery state are tracked in `.notara/reminders.json`.
- The Rust runtime schedules precise OS timers for upcoming reminders.
- Completing or deleting a task immediately cancels its scheduled timer.
- Changing a task's due date or time automatically reschedules its timer.

### System tray minimization

- When you close the Notara desktop window, the app minimizes to the system tray rather than exiting.
- Background timers remain active to deliver scheduled notifications on time.
- To exit the app completely, choose **Quit Notara** from the system tray context menu.

### Startup reconciliation

If your computer was asleep or Notara was closed when a reminder was scheduled to fire:

- At next startup, Notara scans the reminder ledger for overdue items.
- It delivers a single overdue notice for missed tasks.
- It does not repeat or loop notifications.

## AI transport layer

- **Desktop runtime:** Uses Tauri's native HTTP client to communicate directly with `https://api.openai.com/v1/`.
- **Browser runtime:** Connects to OpenAI via standard `fetch` with browser-stored API credentials.
- **Zero intermediate servers:** Notara never routes prompts through external proxy servers.
