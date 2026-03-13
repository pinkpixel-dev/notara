# 📝 Changelog

All notable changes to the Notara project will be documented in this file.

## [Unreleased]

### ✨ Added

- Tauri desktop app scaffold targeting the existing Vite frontend.
- Linux packaging scripts for `.deb` and `AppImage` bundles.
- Windows installer GitHub Actions workflow that builds an NSIS installer.
- Desktop installer icon generation sourced from `public/icon.png`.
- Native Tauri-backed folder selection and local file persistence for desktop builds, preserving Notara's linked-directory workflow outside the browser.
- Native Pollinations transport for Tauri so AI text streaming and image generation no longer depend on browser-only `/api/pollinations/*` routes in desktop builds.
- Linux packaging now sets `NO_STRIP=YES` to avoid AppImage `linuxdeploy` strip failures on newer systems.

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
  - Adapter stubs for GitHub, Google Drive, and Dropbox (Phase 2+ implementation pending)
  - Automatic background sync triggered on note save/update when integrations are connected
  - Comprehensive integration documentation in `docs/INTEGRATIONS.md`
- **GitHub Integration (Phase 2 - In Progress)**:
  - OAuth 2.0 flow with PKCE implementation for secure authorization
  - Popup-based OAuth workflow with automatic callback handling
  - GitHub OAuth callback page with status indicators and error handling
  - OAuth helper utilities with state management and CSRF protection
  - Token exchange proxy endpoints (Vite dev server + Cloudflare Functions)
  - Secure token storage with automatic GitHub user info fetching
  - Connect/disconnect flows with token revocation
  - Configuration persistence in localStorage
  - Comprehensive setup guide in `docs/GITHUB_OAUTH_SETUP.md`
  - Updated `.env.example` with detailed GitHub OAuth setup instructions
- Repository configuration UI in Settings → Integrations for entering GitHub owner, repository name, and branch
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
- GitHub OAuth helper now stores authorization state in shared `localStorage`, keeping popup callbacks reliable across windows
- Integration context pre-populates provider states from feature flags and mirrors adapter config/status updates so Connect buttons and repository details stay in sync
- Calendar page layout improved with better responsive design and proper panel sizing
- Calendar component styling updated to align with `react-day-picker@9` class names and keep day cells square
- App header now highlights search, docs, and settings with gradient glass styling and icon tooltips
- Sidebar promotes Starred Notes to the primary nav and replaces footer cards with compact icon chips for settings, docs, and the markdown cheat sheet
- Tags navigation now lives beside the app menu bar as a dedicated icon button while starred indicators use a prominent star glyph in the editor and note list
- Supabase authentication is opt-in behind `VITE_ENABLE_AUTH`; when disabled the app stays signed out and suppresses legacy auth console logging

### 🐛 Fixed

- Resolved Save button and menu items that previously performed no action when a note was open
- Prevented the browser "Save As" dialog from appearing when pressing `Ctrl/Cmd+S`
- Fixed calendar page layout issues caused by nested ResizablePanel components
- Removed deprecated cosmic-glow classes from calendar components
- Restored calendar day grid proportions by retargeting custom CSS to the new DayPicker markup
- Restored markdown image rendering by expanding the sanitizer allow-list for `img`, `span`, and highlight elements
- Prevented GitHub sync from running before a repository is configured and disabled manual sync controls until repo details are saved

### 🗑️ Removed

- Supabase authentication, GitHub OAuth, and remote database sync requirements in favor of a local-first workflow powered by the File System Access API

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

### 🔄 Changed

- Updated dependencies to latest versions
- Minor UI refinements

## [Unreleased] - 2025-05-09

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
- Refined cosmic theme styling
- Improved responsive layout
- Enhanced AI system prompt for better context awareness

### 🐛 Fixed

- Authentication flow improvements
- Various UI and performance optimizations
- Streaming API connection stability

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
