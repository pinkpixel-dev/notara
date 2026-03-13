# 🏗️ Notara - Technical Overview

> **Version 1.1.0** - Complete technical architecture and implementation guide
> **Last Updated**: March 13, 2026 00:31 EDT
> **Integration System**: Phase 1 Complete | Phase 2 (GitHub OAuth) 40% Complete

## 🆕 Recent Release Highlights (v1.1.0)

- Default app appearance now starts in **Midnight + Pink** with global glass styling and adjustable glass intensity.
- Vision Boards now support **resize**, **inline text editing**, **item color coding**, and **persisted color filters**.
- Calendar right-side panel now uses **Upcoming/Selected Date tabs** with a quick **Today** shortcut.
- AI Assistant now supports configurable Pollinations key/model settings, stronger save workflows (chat archive + markdown note), and session chat continuity.
- Constellation rendering now normalizes theme color values before canvas gradients, preventing runtime color parsing crashes.

## 📋 Project Summary

**Notara** is a modern, feature-rich note-taking and personal knowledge management application built with React, TypeScript, and a local-first storage pipeline powered by the File System Access API. This document provides a comprehensive technical overview of the application's architecture, components, and implementation details.

### 🎯 Project Goals

- **Modern Note-Taking**: Rich markdown editing with real-time preview
- **Visual Organization**: Multiple ways to organize and visualize content
- **AI Integration**: Intelligent writing assistance and content generation
- **Cross-Platform**: Web-first with responsive design
- **Local-First Ownership**: File-based sync without external authentication

## 🏛️ Architecture Overview

### High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend (React SPA)"
        A[App Component]
        B[Context Providers]
        C[Pages/Routes]
        D[Components]
        E[Hooks]
    end

    subgraph "State Management"
        F[FileSystemContext]
        G[NotesContext]
        H[TodoContext]
        I[ThemeContext]
        J[IntegrationContext]
        K[React Query]
    end

    subgraph "Storage & Integrations"
        L[File System Access API]
        M[IndexedDB Fallback]
        N[Pollinations API]
        O[Integration System]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    B --> F
    B --> G
    B --> H
    B --> I
    B --> J
    D --> K
    F --> L
    F --> M
    D --> N
    J --> O
```

### 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── integrations/    # Integration system UI
│   │   └── IntegrationCard.tsx
│   ├── layout/          # Layout components (AppLayout, Navigation)
│   ├── notes/           # Note-related components
│   ├── todos/           # Todo management components
│   └── ui/              # shadcn/ui base components
├── context/             # React Context providers
│   ├── AuthContext.tsx         # Optional Supabase auth (disabled unless VITE_ENABLE_AUTH=true)
│   ├── FileSystemContext.tsx   # Local file system integration
│   ├── IntegrationContext.tsx  # Integration system state & orchestration
│   ├── NotesContext.tsx        # Notes management
│   ├── TodoContext.tsx         # Todo management
│   └── ThemeContext.tsx        # UI theming
├── hooks/               # Custom React hooks
│   ├── use-mobile.tsx   # Mobile detection
│   └── use-toast.ts     # Toast notifications
├── lib/                 # Utility libraries
│   ├── integrations/    # Integration system core
│   │   ├── adapters/    # Provider adapters
│   │   │   ├── GitHubAdapter.ts
│   │   │   ├── GoogleDriveAdapter.ts
│   │   │   ├── DropboxAdapter.ts
│   │   │   └── index.ts
│   │   ├── oauth/       # OAuth helpers
│   │   │   └── github.ts
│   │   ├── index.ts
│   │   ├── syncOrchestrator.ts  # Sync queue & retry logic
│   │   ├── tokenVault.ts        # Encrypted token storage
│   │   └── types.ts             # Integration type definitions
│   ├── supabase.ts      # Legacy Supabase helpers (kept for backward compatibility)
│   └── utils.ts         # General utilities
├── pages/               # Route components
│   ├── GitHubOAuthCallback.tsx # GitHub OAuth callback handler
│   ├── HomePage.tsx     # Main note editing interface
│   ├── TodoPage.tsx     # Todo management
│   ├── AuthPage.tsx     # Authentication
│   └── [other pages]
└── types/               # TypeScript type definitions
    └── index.ts         # Core data models
```

## 🗄️ Data Models

### Core Entities

#### Note

```typescript
interface Note {
  id: string; // UUID
  title: string; // Note title
  content: string; // Markdown content
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  tags: NoteTag[]; // Associated tags
  isPinned: boolean; // Starred/pinned status
}
```

#### NoteTag

```typescript
interface NoteTag {
  id: string; // UUID
  name: string; // Tag name
  color: string; // Hex color code
}
```

#### TodoList

```typescript
interface TodoList {
  id: string; // UUID
  title: string; // List title
  date: string; // Date (yyyy-MM-dd)
  time: string; // Time (HH:mm)
  items: TodoItem[]; // Todo items
}
```

#### TodoItem

```typescript
interface TodoItem {
  id: string; // UUID
  content: string; // Item text
  checked: boolean; // Completion status
  time: string; // HH:mm format
  subItems?: TodoItem[]; // Nested sub-items
}
```

#### VisionBoard

```typescript
interface VisionBoard {
  id: string; // UUID
  name: string; // Board name
  items: VisionBoardItem[]; // Board items
}

interface VisionBoardItem {
  id: string; // UUID
  type: "image" | "text"; // Item type
  content: string; // Content/URL
  position: { x: number; y: number }; // Canvas position
  size?: { width: number; height: number }; // Optional sizing
  accentColor?: string; // Optional item color for grouping/filtering
}
```

## 🔧 Technical Stack

### Frontend Technologies

| Technology       | Version | Purpose                              |
| ---------------- | ------- | ------------------------------------ |
| **React**        | 18.3.1  | UI framework with modern hooks       |
| **TypeScript**   | 5.5.3   | Type safety and developer experience |
| **Vite**         | 6.3.4   | Fast build tool and dev server       |
| **React Router** | 6.26.2  | Client-side routing                  |
| **TailwindCSS**  | 3.4.17  | Utility-first styling                |
| **React Query**  | 5.56.2  | Server state management              |

### UI Component Library

| Package                  | Purpose                             |
| ------------------------ | ----------------------------------- |
| **@radix-ui/react-\***   | Accessible component primitives     |
| **shadcn/ui**            | Pre-built component system          |
| **lucide-react**         | Icon library                        |
| **cmdk**                 | Command palette component           |
| **prism-react-renderer** | Syntax-highlighted markdown preview |

### Storage & Integrations

| Service                    | Purpose                                                                   |
| -------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **File System Access API** | Writes JSON bundles and markdown files to the user-selected Notara folder |
| **IndexedDB**              | Local fallback when filesystem permissions are unavailable                |
|                            | **Pollinations Proxy**                                                    | `/api/pollinations/*` Cloudflare Pages functions that forward chat/image requests with optional API token |

## 🔄 Integration System

### Overview

The **Integration System** provides a secure, extensible framework for syncing notes with external platforms like GitHub, Google Drive, and Dropbox. Built with a modular adapter pattern, it enables automatic background synchronization while maintaining local-first data ownership.

### Architecture Components

```
┌─────────────────────────────────────────────────────────┐
│                   Integration System                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   GitHub     │  │ Google Drive │  │   Dropbox    │ │
│  │   Adapter    │  │   Adapter    │  │   Adapter    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│  ┌──────┴──────────────────┴──────────────────┴─────┐  │
│  │          IntegrationContext (State)               │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           │                             │
│  ┌────────────────────────┴──────────────────────────┐  │
│  │         SyncOrchestrator (Queue, Retry)           │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           │                             │
│  ┌────────────────────────┴──────────────────────────┐  │
│  │    TokenVault (Encrypted IndexedDB Storage)       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key Features

#### 🔒 Secure Token Storage (TokenVault)

- **Web Crypto API Encryption**: All OAuth tokens encrypted with AES-GCM (256-bit)
- **Device Fingerprinting**: Encryption key derived from unique device characteristics
- **IndexedDB Persistence**: Tokens stored client-side with zero backend dependency
- **Auto-Expiry Handling**: Automatically detects and manages expired tokens
- **Secure Key Derivation**: PBKDF2 with 100,000 iterations for key stretching

#### 🔄 Intelligent Sync Orchestration

- **Debounced Syncing**: Prevents excessive API calls during rapid edits (2-second delay)
- **Queue Management**: Manages concurrent sync operations safely
- **Exponential Backoff**: Automatic retry with increasing delays (2s, 4s, 8s, 16s, 32s max)
- **Conflict Detection**: Identifies when local and remote versions diverge
- **Background Sync**: Automatically triggered on note save/update when integrations are connected
- **Batch Operations**: Groups multiple note changes into single API calls when possible

#### 🎨 Rich UI Components

- **IntegrationCard**: Displays connection status, sync metrics, and configuration options
- **Status Indicators**: Real-time connection, syncing, error, and success states
- **Error Handling**: Clear error messages with actionable recovery steps
- **Metrics Dashboard**: Track sync success rates, last sync time, and note counts

#### 🧩 Extensible Adapter Pattern

- **Provider-Agnostic**: Easy to add new integration providers
- **Common Interface**: Consistent API across all adapters (`connect()`, `disconnect()`, `sync()`, `getStatus()`)
- **Async-First**: Built for modern async/await patterns
- **Type-Safe**: Full TypeScript coverage with strict interface contracts

### Development Status

| Provider     | Phase   | Status   | OAuth | Sync | Notes                          |
| ------------ | ------- | -------- | ----- | ---- | ------------------------------ |
| **GitHub**   | Phase 2 | 40% Done | 🚧    | ❌   | OAuth flow complete, needs API |
| Google Drive | Phase 3 | Planned  | ❌    | ❌   | Stub adapter created           |
| Dropbox      | Phase 3 | Planned  | ❌    | ❌   | Stub adapter created           |

#### Phase 1: Foundation (✅ Complete)

- [x] Feature flag system (global + per-provider toggles)
- [x] TypeScript type definitions for adapters, sync results, conflicts, metrics
- [x] TokenVault with Web Crypto API encryption
- [x] IntegrationContext for state management
- [x] IntegrationCard UI component
- [x] SyncOrchestrator with debouncing and retry logic
- [x] Adapter stubs for GitHub, Google Drive, Dropbox
- [x] Comprehensive integration documentation

#### Phase 2: GitHub OAuth (🚧 40% Complete)

- [x] OAuth helper utilities with PKCE support
- [x] Authorization URL builder with state/code_challenge
- [x] Token exchange via proxy endpoints (CORS fix)
- [x] Popup-based OAuth workflow with message passing
- [x] GitHub OAuth callback page with status UI
- [x] Token revocation on disconnect
- [x] Configuration persistence in localStorage
- [ ] Repository selection UI with search/filter
- [ ] Note-to-Markdown converter with YAML frontmatter
- [ ] GitHub API sync logic (Contents API integration)
- [ ] Conflict detection and resolution UI
- [ ] End-to-end testing and error handling

#### Phase 3: Google Drive & Dropbox (⏳ Planned)

- [ ] Google Drive OAuth flow
- [ ] Drive API folder sync implementation
- [ ] Dropbox OAuth flow
- [ ] Dropbox API file sync implementation

### Configuration

#### Environment Variables

```bash
# Global integrations toggle (master switch)
VITE_ENABLE_INTEGRATIONS=true

# Provider-specific toggles
VITE_ENABLE_GITHUB_INTEGRATION=true
VITE_ENABLE_GOOGLE_DRIVE_INTEGRATION=false
VITE_ENABLE_DROPBOX_INTEGRATION=false

# OAuth Credentials (Phase 2+)
VITE_GITHUB_OAUTH_CLIENT_ID=your_github_client_id
VITE_GITHUB_CLIENT_SECRET=your_github_client_secret  # Required for OAuth Apps
VITE_GOOGLE_DRIVE_API_KEY=your_google_api_key
VITE_DROPBOX_APP_KEY=your_dropbox_app_key
```

### Security Considerations

1. **Token Encryption**: All OAuth tokens encrypted before storage using AES-GCM with 256-bit keys
2. **PKCE Flow**: GitHub OAuth implements PKCE (Proof Key for Code Exchange) for enhanced security
3. **State Parameter**: CSRF protection via cryptographically random state values
4. **Proxy Endpoints**: Token exchanges happen through secure proxy to prevent client_secret exposure
5. **Automatic Cleanup**: Tokens are revoked and cleared on disconnection
6. **No Backend Storage**: All tokens stored client-side only, never sent to Notara servers

### Integration Context API

The `IntegrationContext` provides the following methods:

```typescript
interface IntegrationContextType {
  // Connection Management
  connectIntegration: (provider: IntegrationProvider) => Promise<boolean>;
  disconnectIntegration: (provider: IntegrationProvider) => Promise<void>;

  // Sync Operations
  syncIntegration: (provider: IntegrationProvider) => Promise<void>;
  syncAll: () => Promise<void>;

  // Status & Config
  getIntegrationStatus: (provider: IntegrationProvider) => IntegrationStatus;
  getIntegrationConfig: (
    provider: IntegrationProvider,
  ) => IntegrationConfig | null;
  updateConfig: (
    provider: IntegrationProvider,
    config: Partial<IntegrationConfig>,
  ) => void;

  // State
  integrations: Map<IntegrationProvider, IntegrationState>;
  syncInProgress: boolean;
  lastSyncTime: Date | null;
}
```

### Usage Example

```typescript
// Connect to GitHub
const success = await connectIntegration("github");
if (success) {
  // Configure repository
  updateConfig("github", {
    repository: "username/my-notes",
    branch: "main",
    folderPath: "notes/",
  });

  // Trigger manual sync
  await syncIntegration("github");
}

// Disconnect when done
await disconnectIntegration("github");
```

## 🤖 AI Assistant Integration

### Pollinations Request Flow

```
User ➜ React AI Assistant ➜ /api/pollinations/text|image ➜ Cloudflare Pages Function ➜ Pollinations API
```

- **Local Development**: Vite registers a middleware that mirrors the `/api/pollinations/*` routes. The middleware forwards requests to Pollinations, preserves streaming responses for chat completions, and injects an `Authorization` header when `VITE_POLLINATIONS_API_TOKEN` is present.
- **Production (Cloudflare Pages)**: Matching functions live at `functions/api/pollinations/text.ts` and `functions/api/pollinations/image.ts`. They accept either the caller's `Authorization` header or the `POLLINATIONS_API_TOKEN` secret configured via `wrangler secret put`.
- **Watermark Control**: The assistant always sets `referrer=notara` and forwards the `noLogo` flag. Supplying a Pollinations token is optional but recommended to guarantee watermark-free image generation.
- **Error Handling**: Both proxies return upstream status codes and plain-text messages so the UI can surface actionable toasts when Pollinations rejects a request.

## 🎨 UI/UX Architecture

### Theme System

The application features a sophisticated theming system with multiple themes:

- **Light Theme**: Clean, minimal design
- **Dark Theme**: Dark mode with proper contrast
- **Glass Theme**: Frosted glass effects with backdrop blur

#### Glass Theme Implementation

```css
/* Custom CSS variables for glass effects */
:root {
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --backdrop-blur: blur(10px);
}

.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: var(--backdrop-blur);
  border: 1px solid var(--glass-border);
}
```

### Layout System

- **Responsive Design**: Mobile-first approach with breakpoints
- **Resizable Panels**: Custom implementation using `react-resizable-panels`
- **Grid Layouts**: CSS Grid for complex layouts
- **Flexbox**: For component-level layouts

### Component Architecture

```mermaid
graph TD
    A[App] --> B[AppLayout]
    B --> C[Sidebar Navigation]
    B --> D[Main Content Area]
    D --> E[Resizable Panel Group]
    E --> F[Left Panel - Notes List]
    E --> G[Right Panel - Editor]

    F --> H[NotesList Component]
    G --> I[NoteEditor Component]

    H --> J[Individual Note Items]
    I --> K[Markdown Editor]
    I --> L[Live Preview]
```

### Markdown Rendering Pipeline

- **ReactMarkdown + remark-gfm** convert note content into GitHub-flavoured HTML elements (tables, task lists, links)
- **prism-react-renderer** applies Night Owl theming and tokenizes fenced code blocks client-side
- **Responsive styling** wraps tables and images to prevent overflow in preview panes and dialogs
- **rehype-raw + rehype-sanitize** allow safe inline colour spans, highlights, and remote images by extending the sanitizer while keeping scripts/styles blocked

### Interaction Enhancements

- Global keyboard shortcuts: `Ctrl/Cmd+S` saves the active note, `Ctrl/Cmd+Shift+S` triggers Save All
- Save toasts clarify whether changes wrote to disk or temporarily remained in browser storage
- Markdown toolbar surfaces headings, lists, quotes, code blocks, inline styles, colour accents, highlights, and quick link/image prompts without manual syntax
- Header toolbar houses a dedicated Tags icon, while pinning swaps to a prominent star glyph that mirrors the note list indicator
- Settings ▸ Tags consolidates tag creation, renaming, colour selection, deletion, and displays per-tag usage counts sourced from `NotesContext`

## 📂 Local-First Storage Model

### Supabase Retirement (Opt-In Legacy Mode)

- **Removed Dependencies**: Supabase auth, database, and GitHub OAuth flows were deprecated in October 2025 and are now disabled by default.
- **Legacy Artifacts**: `AuthContext` and `lib/supabase.ts` remain for backwards compatibility and only initialise when `VITE_ENABLE_AUTH=true` with valid Supabase keys.
- **Migration Path**: Local-first users can ignore Supabase entirely; teams needing the legacy workflow can re-enable it explicitly without touching the default experience.

### Current Storage Layers

1. **File System Access API** — Primary persistence to user-selected Notara directory (notes, tags, todos, AI cache).
2. **IndexedDB Fallback** — Automatic browser storage when filesystem permissions are missing or revoked.
3. **Runtime Memory** — React contexts manage in-session state and coordinate save pipelines.

### Permission & Save Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant F as File System Access API
    participant I as IndexedDB

    U->>A: Choose Notara Folder
    A->>F: Request Permissions
    alt Granted
        F-->>A: Directory Handle
        A->>F: Write JSON/Markdown Bundles
        F-->>A: Success
    else Denied
        A->>I: Persist Bundle to IndexedDB
        I-->>A: Success (Fallback)
    end
```

## 💾 State Management

### Context-Based Architecture

The application uses React Context for global state management:

#### NotesContext

- **Purpose**: Manages notes CRUD operations
- **State**: Notes array, active note, filters
- **Actions**: Create, read, update, delete, pin/unpin notes
- **Persistence**: Exposes `persistBundle()` so manual saves reuse the same filesystem pipeline as autosave

#### TodoContext

- **Purpose**: Manages todo lists and items
- **State**: Todo lists, active list
- **Actions**: CRUD operations for lists and items

#### ThemeContext

- **Purpose**: Manages UI theming
- **State**: Current theme, theme preferences
- **Actions**: Switch themes, save preferences

### React Query Integration

Used for server state management:

- **Caching**: Automatic caching of API responses
- **Synchronization**: Background refetching
- **Optimistic Updates**: Immediate UI updates

## 🔄 Data Flow

### Note Management Flow

```mermaid
graph LR
    A[User Action] --> B[Context Method]
    B --> C[Optimistic Update]
    C --> D[UI Update]
    B --> E[FileSystemContext Persist]
    E --> F[File System Access API]
    F --> G[Disk Write Success]
    G --> H[Sync State & Toast]

    E --> I[Permission Error]
    I --> J[Fallback to IndexedDB]
    J --> H
```

### Component Communication

1. **Props**: Parent-to-child data flow
2. **Context**: Global state access
3. **Custom Hooks**: Shared logic and state
4. **Event Callbacks**: Child-to-parent communication

### Filesystem Save Pipeline

1. **User Trigger**: Clicking Save, choosing _File ▸ Save Active Note_, or pressing `Ctrl/Cmd+S`
2. **Editor Dispatch**: `NoteEditor` assembles the current bundle and calls `persistBundle()` from `NotesContext`
3. **Filesystem Context**: `persistBundle()` routes through the File System Access API to write JSON bundles and per-note markdown files
4. **Fallback Handling**: If the Notara folder is unavailable, the bundle mirrors into browser storage and a toast explains the fallback
5. **Save All Shortcut**: `Ctrl/Cmd+Shift+S` runs the same pipeline for notes, todos, and cached AI history

## 🚀 Performance Optimizations

### Code Splitting

- **Route-based splitting**: Each page is lazy-loaded
- **Component splitting**: Large components are split

### React Optimizations

- **React.memo**: Prevents unnecessary re-renders
- **useMemo/useCallback**: Memoizes expensive computations
- **Virtualization**: For large lists (future enhancement)

### Bundle Optimization

- **Tree Shaking**: Removes unused code
- **Asset Optimization**: Image and font optimization
- **Chunk Splitting**: Optimal bundle sizes

## 🏗️ Build & Deployment

### Development Setup

```bash
# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Optional: add VITE_POLLINATIONS_API_TOKEN for authenticated AI image requests

# Development server
npm run dev
```

### Build Configuration

- **Vite Configuration**: Fast builds with optimizations
- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality and consistency
- **PostCSS**: TailwindCSS processing

### Deployment Options

1. **Cloudflare Pages**: Primary deployment target
2. **Netlify**: Alternative static hosting
3. **Vercel**: Another deployment option
4. **Self-hosted**: Docker containerization ready

### Build Scripts

```json
{
  "dev": "vite", // Development server
  "build": "vite build", // Production build
  "build:dev": "vite build --mode development", // Dev build
  "lint": "eslint .", // Code linting
  "preview": "vite preview", // Preview build
  "deploy": "npm run deploy:cloudflare" // Deploy to Cloudflare
}
```

## 🔮 Future Enhancements

### Planned Features

1. **Offline Support**
   - Service Worker implementation
   - Local storage synchronization
   - Progressive Web App features

2. **Collaboration Features**
   - Real-time collaborative editing
   - Share notes with permissions
   - Comment system

3. **Advanced AI Integration**
   - More AI writing features
   - Content analysis and insights
   - Auto-tagging and categorization

4. **Mobile Applications**
   - React Native mobile apps
   - Native iOS and Android features
   - Offline-first mobile experience

5. **Plugin System**
   - Extensible architecture
   - Third-party integrations
   - Custom themes and components

### Technical Roadmap

- **Performance**: Further optimizations and monitoring
- **Testing**: Comprehensive test suite implementation
- **Documentation**: API documentation and guides
- **Accessibility**: Full WCAG compliance
- **Internationalization**: Multi-language support

## 🛠️ Development Guidelines

### Code Style

- **TypeScript**: Strict mode with explicit return types
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Components**: Functional components with hooks

### Component Patterns

- **Compound Components**: For complex UI patterns
- **Render Props**: For flexible component composition
- **Custom Hooks**: For shared stateful logic
- **Context + Reducer**: For complex state management

### File Naming Conventions

- **Components**: PascalCase (e.g., `NoteEditor.tsx`)
- **Hooks**: camelCase starting with 'use' (e.g., `useNotes.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)

---

## 📊 Version History

### Version 1.1.0 (Current - March 2026)

- **Visual Theming Refresh**: Midnight + Pink defaults, Aurora mode, and app-wide glass with adjustable intensity.
- **Vision Board Expansion**: Resize handles, inline note editing, richer color palette, color picker modal, and per-board persisted color filters.
- **Calendar UX Upgrade**: Upcoming-first event panel with dynamic Selected Date tab and Today quick jump.
- **AI Workflow Improvements**: Pollinations settings for API key/model selection, better chat persistence, save-chat markdown archival, and improved generated image save paths.
- **Stability Improvements**: Tooltip layering fixes, global search focus wiring, and canvas gradient color normalization in Constellation.

### Version 1.0.0+ (October 2025)

- **Integration System Phase 1 (Complete)**: Secure token vault with Web Crypto API, SyncOrchestrator with exponential backoff, IntegrationContext state management, IntegrationCard UI, adapter pattern for GitHub/Drive/Dropbox
- **Integration System Phase 2 (40% Complete)**: GitHub OAuth flow with PKCE, popup-based authentication, proxy endpoints for CORS handling, callback page with status UI, token storage and revocation
- **Local File Storage**: FileSystemContext integration with File System Access API
- **Manual Save Workflows**: Save button and File ▸ Save Active Note menu option
- **Keyboard Shortcuts**: `Ctrl/Cmd+S` for active note, `Ctrl/Cmd+Shift+S` for Save All
- **Enhanced Markdown Preview**: Prism React Renderer with VSCode-quality syntax highlighting
- **GitHub-Flavoured Markdown**: Tables, task lists, and enhanced formatting
- **Smart Notifications**: Save toasts indicate disk vs browser storage status
- **Supabase Deprecation**: Authentication and remote database requirements removed in favor of local-first storage
- **Pollinations AI Proxy**: Development and production endpoints for chat and image generation with optional API token support

### Version 1.0.0 (2025-09-26)

- **Major Overhaul**: Complete modernization from cosmic theme
- **UI Improvements**: Glass theme implementation and layout fixes
- **New Features**: Starred notes page and enhanced navigation
- **Performance**: Optimized component architecture
- **Bug Fixes**: Context API improvements and layout issues

### Previous Versions

- **Pre-1.0**: Cosmic-themed prototype versions (deprecated)

---

**Made with ❤️ by Pink Pixel** ✨
