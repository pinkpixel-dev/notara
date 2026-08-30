---
title: Release Notes
description: Release history and version highlights for Notara.
---

## Current release: Notara 2.5.0

**Released August 30, 2026.**

Notara 2.5.0 introduces native due-linked task reminders and system tray integration for desktop builds,
alongside a finalized flat surface design system.

### 2.5.0 highlights

#### Task reminders and background delivery

- Enable due-linked reminders on top-level tasks.
- Keep task reminders aligned with the parent list date and task time.
- Deliver native desktop notifications through the Rust backend.
- Close the window to hide Notara in the system tray while timers stay active.
- Quit Notara cleanly from the system tray menu.
- Reconcile missed reminders at startup with a single overdue alert.
- Automatically cancel reminders when a task is completed or deleted.
- Automatically reschedule reminders when the list date or task time changes.

#### Local-first Markdown workspace

- Real nested directory organization and folder navigation.
- Preserved YAML frontmatter and atomic file replacement in Rust.
- Pinned note hoisting (up to five notes) and dedicated starred filtering.
- Single-lane Auto Save queue with external edit conflict detection.

#### AI Assistant

- OpenAI text and image generation using your own API key.
- Safe execution loop where the assistant produces visual diff proposals for user review before saving.

#### Design system

- Minimalist Midnight theme (`hsl(240, 5%, 8%)`) with flat elevated surfaces and crisp typography.
- Complete removal of legacy glassmorphism, background gradients, and glow halos.

## Download links

- [Notara_2.5.0_amd64.deb](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara_2.5.0_amd64.deb)
- [Notara-2.5.0-1.x86_64.rpm](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara-2.5.0-1.x86_64.rpm)
- [Notara_2.5.0_amd64.AppImage](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara_2.5.0_amd64.AppImage)
- [Notara_2.5.0_x64-setup.exe](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara_2.5.0_x64-setup.exe)

## Package checksums

```text
c5ae61127ad26965fb086b47a91047e47af6cec7fb94e420f20a28c0a62d297f  Notara_2.5.0_amd64.AppImage
8ebadec4533f9db1a3f30965e378777797c54f4247ea23a49bf4f7cb90030778  Notara_2.5.0_amd64.deb
3cda6349af874dd460682f356d1fcb2e392bd9b621c85b79db6b03e791fe40fa  Notara-2.5.0-1.x86_64.rpm
```
