---
title: Product Overview
description: What Notara is, who it is for, and how the major features fit together.
---

## What Notara is

Notara is a local-first personal workspace built with React, TypeScript, Vite, and Tauri 2. The app
runs as a desktop application on Linux and Windows, as well as in modern web browsers. Its center
of gravity is Markdown notes stored in real folders on your computer, paired with task planning,
vision boards, calendar organization, and an AI assistant.

Notara is built on three core principles:

1. **Keep data in open formats.** Notes are normal Markdown files with standard YAML frontmatter in
   your own folders, not records locked in a proprietary database.
2. **Bring planning tools together.** Notes, dated tasks, vision boards, and calendar views work
   in one workspace so you do not need four disconnected tools.
3. **Keep AI helpful and safe.** The assistant drafts, summarizes, and generates images using OpenAI,
   proposing changes as visual diffs for you to approve before modifying any file.

## Core areas of the app

**Notes and Directory Trees**

Create and edit Markdown notes inside nested folders. Features include live preview, a formatting
toolbar, syntax-highlighted code blocks, table editing, pinned note hoisting, starred filters,
and single-lane Auto Save.

**Tasks and Due-Linked Reminders**

Build dated to-do lists with nested sub-items and scheduled times. Enable reminders to receive
native desktop notifications managed by Rust and kept active via the system tray.

**Vision Boards**

Organize image and text cards with drag-and-drop placement, resizing, inline editing, color
accents, and board filters.

**Calendar**

Review upcoming tasks and events, jump to today, and view selected-day notes and items in a
clean split layout.

**AI Assistant**

Chat with OpenAI models to brainstorm, draft, and summarize. When the assistant proposes note
or task edits, you review the diff before applying it.

**Settings and Customization**

Choose between Midnight and Light themes, switch interface fonts, configure your OpenAI key,
and toggle Auto Save.

## Design language

Notara uses a clean, flat design system built around semantic surface tokens:

- **Midnight theme:** Dark charcoal background (`hsl(240, 5%, 8%)`), flat elevated panels, and crisp text.
- **Light theme:** Clean, high-contrast light surfaces for daytime work.
- **Accent choices:** Crisp pink, blue, orange, purple, or green accents for active states and highlights.
- **Focused UI:** No gradients, no glass blur, no glow halos, and no fake depth.

## Local-first architecture

Notara does not require user accounts or cloud servers:

- **Desktop builds:** Rust handles folder creation, atomic file replacements, revision checks, and backup snapshots.
- **Web builds:** Connect to local folders using the File System Access API in supported browsers.
- **Metadata sidecar:** Pins, stars, to-dos, vision boards, and reminder queues live in `.notara/` inside your workspace.

## Technology snapshot

| Layer | Details |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Routing | React Router 7 |
| Styling | TailwindCSS, Radix UI primitives, semantic tokens |
| Desktop Runtime | Tauri 2 with Rust file engine and notification system |
| AI Integration | OpenAI API (text generation, diff proposals, and image models) |
| Storage | Local Markdown files and `.notara/` sidecar storage |

## Recent updates

Notara 2.5.0 introduces:

- Native due-linked task reminders with background system tray support
- Startup reconciliation for overdue tasks
- Real nested directory organization and folder navigation
- Pinned note hoisting (up to five pins) and dedicated starred filtering
- Single-lane serialized Auto Save with conflict review
- OpenAI assistant with structured diff proposals

For complete release history, see [Release Notes](/reference/releases).
