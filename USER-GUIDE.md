# Notara user guide

Status: Version 2.0.0 development branch

This guide describes the current application. Planned file, OpenAI, and reminder features are not available yet.

## Notes

Open Notes from the sidebar. Select a note from the list or create a new note.

The editor has source and preview views. It also has a Full Preview dialog. Split view is planned but not implemented.

Save writes the internal note bundle. In desktop builds, data goes to the Notara app-data workspace. It does not save an opened external file back to its source path.

## Open Markdown

File > Open Markdown works in browsers that support the file picker. It reads one Markdown or text file and creates a new internal note.

This action is an import in practice. It does not keep the source path. Desktop support, multi-file import, Save As, and external-change detection are planned.

## Tasks and calendar

Task lists have dates and times. Individual items can also have times.

The current version does not send reminder notifications. The calendar also uses note timestamps as event values instead of a separate event model.

## Vision board

Vision boards can contain image and text items. Items can move, resize, and use color groups. Generated images can be saved to local media and added to a board when Pollinations is configured.

The vision board is called the pinboard in the overhaul documents. It is the only surface that will keep a background texture.

## AI assistant

Current AI uses Pollinations. The assistant is a separate page and supports text and image requests.

The overhaul will replace Pollinations with OpenAI and move the assistant into a panel. OpenAI is not implemented yet.

## Local data

Desktop data normally lives at:

```text
~/.local/share/dev.pinkpixel.notara/workspace/
```

The exact base directory can change when `XDG_DATA_HOME` is set.

Browser builds can also use browser storage or a selected folder. The current app can keep duplicate copies in browser storage and the file workspace.

## Accounts

Notara has no account system. Notes, tasks, boards, and application settings remain local to the selected runtime storage.
