# 📝 Changelog

All notable changes to the Notara project will be documented in this file.

## Unreleased

### 📐 Sidebar width

- The notes sidebar now opens level with the divider in the header, so the line
  between the File menu and the section tabs runs straight down the page.
- It opens narrower than before and keeps a fixed width as you resize the
  window, so a bigger screen gives the extra room to the editor instead of
  stretching a column of note titles. Drag the divider and your size sticks.
- Dragged narrow, the filter shortens from "All notes" to "All" so the row stays
  readable instead of clipping.

### 🧭 Navigation moved into the header

- Notes, To-Do, Calendar, Vision Board, and Constellations sit across the top
  now. The 256 pixel navigation column they used to live in is gone, so the
  whole left side belongs to your notes.
- Tab labels show from 1280 pixels up. Below that they are icons with tooltips,
  because five labels plus the File menu do not fit and navigation that wraps to
  two lines is not an option.
- Settings, the Markdown cheat sheet, the AI Assistant, and Documentation moved
  into a single overflow menu on the right of the header.
- On phones the header cannot hold the tabs, so the hamburger menu opens a
  drawer with everything in it. No extra bar was added at the bottom: the mobile
  layout already has a header and a pane switcher, and vertical space is
  scarcest exactly where it would have gone.
- The notes sidebar no longer gets squeezed on smaller screens. It keeps a real
  minimum width instead of a percentage, so at tablet sizes the search box is
  still a search box rather than a sliver reading "Searc".

### 🗂️ One notes sidebar

- The notes bar used to show a folder tree and then, underneath it, a separate
  flat list of the same notes. It is one list now. Notes sit inside the folder
  their file is in.
- Notes show as two lines, the title and when you last changed them, so a folder
  of twenty is still something you can scan. Folders show a count of the notes
  listed under them.
- The workspace folder is no longer a row you have to open first. Your own
  top-level folders are the top level, and notes sitting loose at the root are
  grouped under Uncategorized at the bottom.
- Folders you have not opened before start expanded, so you land on your notes
  instead of a column of closed folders. Notara still remembers what you open
  and close after that.
- The PINNED section and its cards are gone. A pinned note is lifted to the top
  of the sidebar with a pin icon you can click to unpin it. While it is pinned
  it is not repeated inside its folder, and unpinning drops it straight back
  where its file lives. Pinning still never moves the file.
- Searching or switching to Starred drops the folders and shows a flat list.
  Folders are for browsing; when you already know what you want, groups are just
  rows in the way.
- Deleting a note now asks first and shows you the file path it is about to
  remove. A note is a real file, and there is no undo for it.
- The editor no longer offers Create Note before you have chosen a folder. There
  was nowhere to save it, and you only found out after writing it.

### 📄 Markdown files are the notes now

- Your notes are plain Markdown files in the folder you picked. Opening a note
  reads that file, and saving writes it back. There is no separate copy of your
  notes hiding in a JSON file any more.
- A note's title is its file name. Renaming the title renames the file, so the
  folder always looks like what you see in Notara. Characters a filesystem will
  not accept, such as a slash or a colon, are swapped for spaces, and you can
  see the result straight away instead of finding out later.
- Tags, pins, stars, and dates live in the note's frontmatter. Any other
  frontmatter you or another app wrote is left exactly as it was, down to the
  byte, including comments, key order, and quoting style.
- A plain Markdown file with no frontmatter is a perfectly good note. Notara
  does not add metadata to a file until there is something worth recording.
- Notes you already had are moved out of the old storage into your workspace
  the first time you open it. This runs once and never deletes the original,
  so if anything looks wrong the old file is still sitting there.
- A brand new empty folder gets the Welcome and Markdown Cheat Sheet notes as
  real files you can edit or delete like any other note.

### 🛟 Saving is safer

- On the desktop, a save writes to a temporary file and then swaps it into
  place in one step. If Notara is killed mid-save, you get either the old note
  or the new one, never half of each.
- The previous contents of a note are copied into `.notara/backups` before it
  is replaced, so a save you regret is recoverable.
- If a note changed outside Notara since you opened it, the save is refused
  and says so instead of overwriting the other change.
- Notara no longer keeps a mirror folder of `note-{uuid}.md` files. That mirror
  deleted any Markdown file in its directory it had not written itself, which
  is not something that should ever run near your own notes.

### 🧹 A tidier notes bar

- The workspace tree only shows your notes. Notara's own `data` folder, which
  holds settings and the AI history, is hidden, along with any folder whose
  name starts with a dot and `node_modules`. A folder you happen to name `data`
  deeper inside your notes is yours and still shows.
- The notes bar now explains why it is empty. Choosing a folder, still loading,
  a folder Notara could not read, and a genuinely empty folder are four
  different messages instead of one unhelpful "No notes yet".
- Notes need a workspace folder now. Without one, Notara asks you to pick a
  folder rather than quietly keeping notes in browser storage where you cannot
  find them.

### ⭐ Pinned and starred notes

- Pinning and starring are two separate things now. They used to be one flag
  behind two different names, so the star button in the editor and the pinned
  section in the notes bar always moved together.
- Pin a note to keep it at the top of the notes bar. You can pin up to five
  notes. Notara refuses the sixth and tells you to unpin one first, rather than
  quietly dropping a pin you chose. Unpinning always works.
- Star a note to mark it important. There is no limit on starred notes.
- The notes bar has an All notes and Starred filter with a count on each. The
  separate Starred Notes page is gone, along with the star button in the header,
  because the filter does the same job in the place you are already looking.
- Note rows show a pin icon for a pinned note and a star icon for a starred one.

### 📁 Workspace

- Choose Workspace now opens a real folder picker on the desktop. Notara used to
  ignore your choice and always save to a fixed app-data folder, whatever the
  button said.
- Notara remembers the folder you picked and reconnects to it on the next start.
- Your notes bar now shows the real folder structure on disk as collapsible
  groups, with a file count on each group. Browsing never writes, so opening a
  group does not change any file or its modified time.
- Open and closed groups are saved and come back the way you left them.
- You can create, rename, move, and delete workspace folders from the tree. Each
  action asks first, and the delete confirmation counts the files and folders it
  is about to remove.
- Notara now keeps its own files in a `.notara` directory inside your workspace.
  Todos, vision boards, and generated images moved there, so your folder holds
  your Markdown and one dot directory instead of a `data` tree mixed in with
  your notes.
- Existing todos, vision boards, and images are copied into `.notara` the first
  time a workspace is prepared. The originals are left alone.
- The storage badge tooltip now shows the folder path Notara is writing to,
  rather than always claiming app storage.

### 🔒 Safety

- Folder actions run in the Tauri backend, which resolves symlinks and refuses
  any path that lands outside the workspace root. It also refuses to rename,
  move, or delete the workspace root and the `.notara` directory.
- The desktop file system scope now covers the folder you chose, and nothing
  wider.

### 🎨 Interface

- Rebuilt the styling on semantic surface tokens. Each theme now assigns one color per surface role (app, sidebar, toolbar, content, elevated, input, pinboard) instead of stacking translucent layers.
- Removed the glass surface system, including the app-wide blur overrides, the frosted panel classes, and the glow utilities.
- Removed every app gradient and the page background texture. The pinboard keeps its dot grid, which is there to help you place items.
- Fixed the collapsed sidebar, which used to sit on top of the main area and hide about 80 pixels of it. The shell is now a grid whose column width comes from the same token the sidebar renders at, so the two can no longer disagree.
- Icon buttons now hold a 44 pixel touch target, and every one has an accessible name.
- The Enable Animations switch now actually stops transitions and entrance animations. It previously set a variable nothing read.
- Notara now respects the operating system's reduced motion setting.
- Notara now works on phones. Below 768 pixels the sidebar becomes a drawer, and the notes list and editor become separate views with a switcher between them, instead of two columns fighting over a 375 pixel screen.
- Tags and Starred Notes move into the drawer on small screens, where the header has no room for them. They stay in the header on desktop.
- Note rows, to-do list rows, tag rows, and the tag picker are real buttons now. You can reach all of them with the keyboard, and screen readers announce them as controls.
- Row actions like delete no longer appear only on hover. They are always visible on touch, and they show up on desktop when they take keyboard focus.
- Every icon button has a name, so screen readers no longer announce a handful of unlabeled buttons.
- Buttons support a loading state. Choosing a storage folder and sending an AI message now show a spinner and refuse a second press while the first is still running.
- Controls hold a 44 pixel touch target on touch devices, without making the desktop layout roomier.
- Added an Interface Font setting with Inter (the default), Poppins, Outfit, Geist, and Plus Jakarta Sans. The Notara wordmark stays on Poppins whichever you pick.
- The notes list now opens at its narrowest width, leaving more room for the editor. Drag the divider to widen it.
- Moved Tags and Starred Notes out of the sidebar and into the header, and dropped the duplicate Documentation and Settings buttons from the header.
- The in-app documentation link now opens notara.site instead of the GitHub readme.

### 💥 Breaking changes

- Removed the Cosmic and Aurora themes. Both were built entirely from gradient backgrounds, which the flat direction does not allow. If you were using either one, Notara moves you to Midnight automatically.
- Removed the Glass Intensity setting. It has nothing left to adjust now that glass surfaces are gone.
- Removed the optional Supabase account system and its authentication routes.
- Removed the unfinished GitHub, Google Drive, and Dropbox integrations.
- Removed legacy OAuth functions, proxy code, environment variables, and stored integration credentials.

### 🧹 Maintenance

- Split `src/index.css` into `src/styles/tokens.css`, `src/styles/markdown.css`, and `src/styles/calendar.css`, bringing it under the 500-line limit.
- Split the Markdown cheat sheet, to-do, and vision board files so every file touched in this work is under the 500-line limit, apart from the AI component that Phase 6 covers.
- Split `src/context/FileSystemContext.tsx`, which was one line over the 500-line limit. Storage paths and the Markdown mirror helpers moved into `src/lib/filesystem/paths.ts` and `src/lib/filesystem/note-markdown.ts`.
- Added the first Rust code in the project. `src-tauri/src/workspace/` holds the path guard, the directory operations, and the Tauri commands, with 16 unit tests covering path escapes, symlinks, and every directory action.
- Added `WorkspacePanes`, one component that gives every two-pane screen the same desktop and mobile behavior instead of each page inventing its own.
- Removed the unused legacy Tailwind colors, keyframes, and animations left over from the cosmic theme.
- Deleted the unreferenced `ThemeSelector` and `ThemeSwitcher` components. The Settings page had already replaced both.
- Removed the `@supabase/supabase-js` and `idb` dependencies.
- Moved the remaining Pollinations controls into an AI & Data settings tab.
- Updated the in-app version source to read from `package.json`.

### 📝 Documentation

- Added a repo-grounded local-first overhaul plan and phased roadmap.
- Documented the current Supabase, OAuth, Pollinations, file, editor, reminder, UI, and accessibility boundaries.
- Added architecture, storage, OpenAI, reminders, design, security, development, configuration, testing, troubleshooting, user, and contribution guides.
- Rewrote the README to separate current behavior from planned features and remove unsupported claims.
- Recorded the approved OpenAI text and image model catalog for future Settings selectors.
- Added the accepted nested-directory notes tree, pinned-note section, and independent starred filter to the overhaul roadmap.
- Defined the documentation-site update as a visual and content match for the finished Notara application.

## [1.1.1] - 2026-03-26

### 🐛 Fixed

- Added a `New Note` button beside `Save` in the open note editor so users can create another note without getting stuck on the current note screen.
- Fixed the editor transition into new-note mode so the web app opens a fresh blank note instead of reusing the previously opened note state.
- Fixed the desktop Constellation page layout by restoring the expected `ResizablePanel` wrapper used by `AppLayout`, which resolves the broken installed-app rendering.

## Initial Release [1.1.0]

### ✨ Added

- Release install options for:
  - Linux `.deb`
  - Linux `.rpm`
  - Linux `AppImage`
  - Windows NSIS installer
  - Dockerized web runtime
- Tauri desktop app scaffold targeting the existing Vite frontend.
- Linux packaging scripts for `.deb` and `AppImage` bundles.
- Windows installer GitHub Actions workflow that builds an NSIS installer.
- Desktop installer icon generation sourced from `public/icon.png`.
- Native Pollinations transport for Tauri so AI text streaming and image generation no longer depend on browser-only `/api/pollinations/*` routes in desktop builds.
- Linux packaging now sets `NO_STRIP=YES` to avoid AppImage `linuxdeploy` strip failures on newer systems.
- Automatic Tauri desktop storage in the app-data workspace, which resolves to `~/.local/share/dev.pinkpixel.notara/workspace/` on Linux unless `XDG_DATA_HOME` overrides it.
- Docker build support with a multi-stage `Dockerfile`, `.dockerignore`, and a small Node runtime that serves the app plus Pollinations proxy endpoints.

### 🐛 Fixed

- Fixed desktop storage initialization by moving Tauri file persistence onto a scoped app-data workspace with explicit recursive write permissions.
- Fixed Pollinations desktop requests by allowing Pollinations URLs in the Tauri HTTP scope and enabling `Authorization` headers.
- Fixed the to-do list date picker freeze in Tauri/AppImage builds by replacing the native `input[type="date"]` control with an in-app calendar picker.

## [1.1.0] - 2026-03-13

### ✨ Added

- App-wide glass theming controls with a new transparency-to-frost slider in Settings.
- New `aurora` theme mode (replacing legacy `frost`) with migration for older saved settings.
- Pollinations settings panel for API key, text model, and image model configuration.
- AI image actions for saving generated images directly to Vision Boards.
- Local media persistence for generated and imported images through the connected Notara folder (`data/media`).
- Vision Board enhancements:
  - Item resizing for image and text cards.
  - Inline note editing and save/cancel controls.
  - Color-coded items with expanded multi-color palette.
  - Popup color picker per item.
  - Color-filter modal with per-board filter persistence and quick reset.
- Calendar right panel tabs with default `Upcoming` view (next 5 events) and conditional `Selected Date` tab.
- Calendar quick `Today` button for fast date jump and event context.

### 🔄 Changed

- Default theme now starts in `midnight` with `pink` accent.
- Top menu bar now uses glass styling to match the updated visual system.
- Calendar event side panel now defaults to a narrower footprint and tabbed navigation.
- AI chat save now archives conversations more reliably and can store chat transcripts as markdown notes.
- AI conversation state now persists while navigating within the current browser session.
- Pollinations request flow fully aligned to `gen.pollinations.ai` routes in dev proxy and Cloudflare functions.
- Pollinations key handling tightened so authenticated keys are consistently used for both text and image generation.

### 🐛 Fixed

- Fixed header search button behavior and keyboard shortcut flow (`Ctrl/Cmd+K`) to focus note search reliably.
- Fixed tooltip layering so tooltips render above page content.
- Fixed Constellation page crash caused by invalid canvas color parsing from CSS theme variables.
- Fixed save-chat edge cases where archives could be overwritten during async hydration.
- Fixed Vision Board color interactions so color selection does not conflict with drag behavior.
- Fixed date-panel usability in Calendar by separating upcoming vs selected-day workflows.

### ✨ Added

- **Integration System (Phase 1 - Complete)**:
  - Feature flag system for managing integration availability (global and per-provider toggles)
  - Comprehensive TypeScript type definitions for adapters, sync results, conflicts, and metrics
  - Secure token vault using Web Crypto API with AES-GCM encryption and IndexedDB storage
  - IntegrationContext for managing integration state, OAuth flows, and sync triggers
  - Reusable IntegrationCard UI components with status indicators and configuration panels
  - SyncOrchestrator class for debounced queuing, exponential backoff retries, and batch sync
  - Manual save workflows: the editor's Save button and File ▸ Save Active Note now flush notes, tags, and markdown files immediately
  - Global keyboard shortcuts: `Ctrl/Cmd+S` saves the active note and `Ctrl/Cmd+Shift+S` runs Save All without opening the browser download dialog
  - Richer markdown preview rendering powered by `prism-react-renderer`, including VSCode-quality code themes, GitHub-flavoured tables, and lazy-loaded images
  - Pollinations proxy endpoints for chat and image generation, available locally at `/api/pollinations/*` and in Cloudflare Pages functions with optional API token support
  - Markdown formatting toolbar with headings, block styles, inline styles, and quick link/image helpers plus inline color and highlight pickers for markdown content
  - Settings ▸ Tags tab for creating, recolouring, renaming, and deleting tags alongside live usage counts

### 🔄 Changed

- NotesContext now exposes `persistBundle` so user-triggered saves reuse the same filesystem pipeline as autosave
- Markdown tables, links, and code blocks have refreshed styling for readability in both inline and full preview modes
- Save notifications now reflect whether data wrote to the connected Notara folder or browser storage fallback
- Integration context pre-populates provider states from feature flags and mirrors adapter config/status updates so Connect buttons and repository details stay in sync
- Calendar page layout improved with better responsive design and proper panel sizing
- Calendar component styling updated to align with `react-day-picker@9` class names and keep day cells square
- App header now highlights search, docs, and settings with gradient glass styling and icon tooltips
- Sidebar promotes Starred Notes to the primary nav and replaces footer cards with compact icon chips for settings, docs, and the markdown cheat sheet
- Tags navigation now lives beside the app menu bar as a dedicated icon button while starred indicators use a prominent star glyph in the editor and note list

### 🐛 Fixed

- Resolved Save button and menu items that previously performed no action when a note was open
- Prevented the browser "Save As" dialog from appearing when pressing `Ctrl/Cmd+S`
- Fixed calendar page layout issues caused by nested ResizablePanel components
- Removed deprecated cosmic-glow classes from calendar components
- Restored calendar day grid proportions by retargeting custom CSS to the new DayPicker markup
- Restored markdown image rendering by expanding the sanitizer allow-list for `img`, `span`, and highlight elements

## [1.0.0] - 2025-09-26

### ✨ Added

- **Starred Notes Page**: Implemented dedicated page for managing pinned/starred notes
  - Added new `/starred-notes` route and sidebar navigation link
  - Proper filtering and display of starred notes only
  - Integrated with existing note pinning functionality

### 🔄 Changed

- **UI Layout Overhaul**:
  - Removed nested ResizablePanelGroup components from HomePage and TodoPage
  - Established clean 50/50 split between left and right panels
  - Improved layout consistency across the application
- **Glass Theme Enhancements**:
  - Enhanced frosted glass effects with better backdrop filters
  - Improved translucent backgrounds for better visual balance
  - Adjusted CSS variables for more authentic glass appearance
- **Clean UI Design**:
  - Removed decorative star backgrounds from AI Assistant, Todo page, and other pages
  - Streamlined visual design for better focus on content
- **Surface Layouts**:
  - Centered the authentication card within the layout grid so the form no longer hugs the sidebar
  - Expanded the Markdown Cheat Sheet with a right-hand quick-reference rail for shortcuts and templates
  - Reimagined the AI Assistant as a two-column workspace with a session dashboard and conversation archive tools
- **Settings Navigation**:
  - Added back/close button functionality in settings pages
  - Users can now properly return to previous screens after saving or exiting settings

### 🐛 Fixed

- **Context API**: Fixed import paths and added `togglePin` function in NotesContext
- **Layout Issues**: Resolved ResizablePanel nesting problems causing display issues
- **Glass Theme**: Fixed color balance inconsistencies between left and right panels
- **Frosted Glass Theme**: Unified dark palette tokens, restored translucent surfaces, and fixed theme preview swatches that were rendering as solid black
- **Navigation**: Improved settings page navigation flow

### 🛠️ Technical

- Enhanced NotesContext with proper starred notes management
- Improved component architecture for better maintainability
- Refined CSS custom properties for glass theme effects
- Better separation of concerns in panel layout components

## [Unreleased] - 2025-05-14

### 📝 Documentation

- Comprehensive project documentation update
- Enhanced OVERVIEW.md with detailed architecture information
- Added data models documentation
- Expanded UI/UX design documentation
- Updated feature descriptions
- Added technical roadmap section
- Improved contributing guidelines

### ✨ Added

- Improved AI assistant integration with Pollinations API:
  - Enhanced note summarization capabilities
  - Added context awareness for mood boards and constellation view
  - Implemented image generation based on prompts
  - Added focus prompt generation for creative writing
  - Added connection analysis between different content types
- Enhanced UI components and animations
- Additional Radix UI components integration
- Expanded documentation
- Calendar integration for temporal organization of notes
- Todo list management with sub-items

### 🔄 Changed

- Updated dependencies to latest versions
- Refined theme styling
- Improved responsive layout
- Enhanced AI system prompt for better context awareness

## [Unreleased] - 2025-05-03

### ✨ Added

- Initial application creation
- Markdown note creation and editing
- Tag-based organization with color coding
- Note pinning functionality
- Mood board feature for visual collections
- Basic constellation view placeholder
- Calendar view for temporal note organization
- Authentication with Supabase
- Settings page structure
- Beautiful cosmic UI theme with animations
- Star field background animations
- Responsive layout with resizable panels
- Markdown cheat sheet page

### 🔄 Changed

- N/A (initial release)

### 🐛 Fixed

- N/A (initial release)

### 🛠️ Technical

- Set up React + TypeScript project with Vite
- Implemented React Context for state management
- Added React Router for navigation
- Integrated React Query for data fetching
- Configured TailwindCSS for styling
- Added shadcn/ui components based on Radix UI

---

✨ Made with ❤️ by Pink Pixel
