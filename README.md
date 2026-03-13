<div align="center">
  <img src="public/logo.png" alt="Notara Logo" width="300" height="300">
</div>

# ✨ Notara

> **Dream it, Pixel it** - A feature-rich note-taking application and markdown editor with AI assistant

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/pinkpixel-dev/notara)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)
[![Made with Love](https://img.shields.io/badge/made%20with-❤️-red.svg)](https://pinkpixel.dev)

## 🌟 Features

### 📝 **Smart Note-Taking**

- **Markdown Editor**: Rich text editing with live preview
- **Formatting Toolbar**: One-click headings, lists, quotes, code blocks, inline styles, colour accents, and highlights without leaving the keyboard
- **Enhanced Preview**: GitHub-flavoured tables, syntax-highlighted code, clickable links, and embedded images right beside the editor
- **One-Click Saves**: Save button and File menu write notes instantly, with `Ctrl/Cmd+S` for active note and `Ctrl/Cmd+Shift+S` for Save All
- **Tag Organization**: Color-coded tags plus a Settings ▸ Tags hub for adding, renaming, recolouring, and deleting tags with usage counts
- **Pinned Notes**: Star your most important notes for quick access right from the editor header or note list
- **Search & Filter**: Find notes instantly with powerful search

### ✅ **Todo Management**

- **Hierarchical Tasks**: Create todos with sub-items
- **Time Scheduling**: Assign times to tasks and lists
- **Daily Organization**: Organize todos by date
- **Progress Tracking**: Check off completed items

### 🎨 **Visual Organization**

- **Vision Boards**: Create visual mood boards with draggable, resizable image/text cards, inline text editing, and color grouping filters
- **Calendar View**: Organize notes and todos temporally with Upcoming + Selected Date tabs and a quick Today jump
- **Constellations**: Visualize connections between your content
- **Glass Theme**: App-wide glass styling with adjustable transparency/frost intensity and modern Aurora mode
- **Refined Navigation**: Starred notes live in the main nav with footer icon chips for settings, docs, and the markdown cheat sheet, plus a persistent header icon for quick tag management

### 🤖 **AI Assistant**

- **Writing Support**: AI-powered content generation and editing
- **Generate Images**: AI-generated images on demand for your notes, documents, and boards
- **Seamless Pollinations Proxy**: Requests route through `/api/pollinations/*` so the browser avoids CORS issues and uses your configured API key/model selections
- **Note Summaries**: Automatic summarization of long notes
- **Creative Prompts**: Generate ideas and writing inspiration
- **Context Awareness**: AI understands your existing content
- **Session Continuity**: Active chat stays intact while navigating during a session
- **Save Workflows**: Save chats to archive + markdown notes, and save generated images into Vision Boards/local media

### 💾 **Local File Storage**

- **Automatic Desktop Storage**: Tauri builds now save into Notara's app-data workspace automatically, with no folder-picking required
- **Automatic & Manual Backups**: Notes, tags, todos, and vision boards write through to disk as you work or whenever you press Save
- **Readable Local Files**: Desktop data is stored as JSON and markdown files inside Notara's local workspace

### 🔄 **Local-First Workspace**

- **On-Disk Sync**: Desktop builds work against readable JSON files in Notara's local app-data workspace
- **Cloud-Agnostic**: No external auth or Supabase project required—set `VITE_ENABLE_AUTH=true` only if you purposely want Supabase sign-in
- **Browser Fallback**: Web builds still use browser storage when local files are unavailable
- **Portable Data**: Copy the Notara workspace directory anywhere to migrate your vault

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **Git**
- **Rust** toolchain for desktop builds
- Linux desktop build deps for Tauri on Debian/Ubuntu:
  ```bash
  sudo apt-get update
  sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf
  ```

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/pinkpixel-dev/notara.git
   cd notara
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Only the Pollinations token is optional if you want authenticated AI image requests:

   ```env
   VITE_POLLINATIONS_API_TOKEN=optional_pollinations_token
   VITE_ENABLE_AUTH=false
   ```

   > **Optional**: Add `VITE_POLLINATIONS_API_TOKEN` when you have a Pollinations key and want the AI assistant to include an `Authorization` header. Cloudflare Pages deployments should mirror this value via `wrangler secret put POLLINATIONS_API_TOKEN`. Set `VITE_ENABLE_AUTH=true` (and supply Supabase keys) only if you intend to use the legacy authentication flows.

4. **Start development server**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**

   Navigate to `http://localhost:3489`

## 📦 Downloads

Direct download links for `v1.1.0`:

- [Linux `.deb`](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara_1.1.0_amd64.deb)
- [Linux `.rpm`](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara-1.1.0-1.x86_64.rpm)
- [Linux `AppImage`](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara_1.1.0_amd64.AppImage)
- [Windows installer](https://pub-7910a730d724411db0d8fb3f65278e6a.r2.dev/Notara_1.1.0_x64-setup.exe)

Available installation options:

- Tauri Linux packages: `.deb`, `.rpm`, and `AppImage`
- Windows NSIS installer
- Docker container for the web runtime
- Cloudflare Pages deployment for hosted web installs

## 🏗️ Build & Deploy

### Development Build

```bash
npm run build:dev
```

### Production Build

```bash
npm run build
```

### Desktop Development

```bash
npm run tauri:dev
```

### Linux Desktop Bundles

Build Linux installers locally:

```bash
npm run tauri:build:linux
```

Artifacts are written to:

- `src-tauri/target/release/bundle/deb/`
- `src-tauri/target/release/bundle/appimage/`

Desktop data is written to Notara's Tauri app-data folder. On Linux this is typically:

- `~/.local/share/dev.pinkpixel.notara/workspace/`

If `XDG_DATA_HOME` is set, Tauri will use that location instead of `~/.local/share`.

If you are building on a rolling-release Linux distro, AppImage packaging may fail because `linuxdeploy` can lag behind newer system linker formats. The included GitHub Actions workflow builds Linux bundles on `ubuntu-22.04`, which is the most reliable path for AppImage output.

Notara now sets `NO_STRIP=YES` for the Linux Tauri packaging script to work around `linuxdeploy` strip failures on newer distros such as Arch.

### Docker

Build a Docker image:

```bash
docker build -t notara:latest .
```

Run the container:

```bash
docker run --rm -p 3489:3489 \
  -e POLLINATIONS_API_TOKEN=your_optional_pollinations_token \
  notara:latest
```

Then open:

- `http://localhost:3489`

The Docker image serves the built SPA and also provides `/api/pollinations/text` and `/api/pollinations/image`, so the web app keeps its AI functionality inside the container. If you do not pass `POLLINATIONS_API_TOKEN`, users can still provide their own Pollinations key in Settings.

### Windows Installer via GitHub Actions

This repository now includes a GitHub Actions workflow at `.github/workflows/windows-installer.yml`.

- Trigger it manually from the Actions tab, or
- Push a tag like `v1.1.0`

The workflow builds an NSIS Windows installer and uploads it as both:

- a GitHub Actions artifact
- a draft GitHub release asset for tagged builds

### Deploy to Cloudflare

```bash
npm run deploy
```

Ensure the following secrets exist in your Cloudflare Pages project before deploying:

- `POLLINATIONS_API_TOKEN` _(optional but recommended if you rely on authenticated Pollinations requests)_

## 🛠️ Technology Stack

### Frontend

- **React** 19.1.1 - Modern React with hooks
- **TypeScript** - Type safety and developer experience
- **Vite** - Fast build tool and dev server
- **React Router** 7.9.2 - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Radix UI** - Accessible component primitives
- **Prism React Renderer** - Fast, themeable syntax highlighting for markdown code blocks

### Storage & Integrations

- **Tauri AppData Storage** - Desktop persistence in Notara's local workspace directory
- **Browser Storage API** - Local IndexedDB fallback for web builds
- **Pollinations Proxy** - Chat and image generation helper

### State Management

- **React Context** - Built-in state management
- **React Query** - Server state management and caching

### Routing & Navigation

- **React Router** - Client-side routing

## 📱 UI/UX Features

- **🌙 Glass Theme**: Beautiful frosted glass effects
- **📱 Responsive Design**: Works perfectly on all devices
- **⚡ Fast Performance**: Optimized for speed and efficiency
- **🎯 Intuitive Interface**: Clean and focused user experience
- **🔍 Smart Search**: Instant search across all content
- **📐 Resizable Panels**: Customize your workspace layout
- **⌨️ Keyboard Shortcuts**: Quickly save (`Ctrl/Cmd+S`) or save everything (`Ctrl/Cmd+Shift+S`) without leaving the editor

## 🔧 Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development setup and guidelines.

### Key Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
npm run tauri:dev  # Run the Tauri desktop app in development
npm run tauri:build:linux # Build .deb and AppImage bundles
```

### Desktop Notes

- The Tauri desktop shell is configured and uses `public/icon.png` for installer icons.
- Desktop builds now persist data automatically in the Tauri app-data workspace at `~/.local/share/dev.pinkpixel.notara/workspace/` on Linux, or the equivalent `XDG_DATA_HOME` path.
- Pollinations-backed AI text and image requests now use Tauri's native HTTP client in desktop builds, so the assistant is no longer blocked on the web proxy routes.
- The to-do list dialogs use an in-app calendar picker in desktop builds to avoid native WebKit date-picker freezes.

### Docker Notes

- The Docker runtime serves the prebuilt frontend from `dist/`.
- A small Node server in `docker/server.mjs` handles SPA routing and the Pollinations proxy endpoints.
- Docker does not provide the Tauri desktop filesystem features; use the Tauri builds when you want local desktop app storage under `~/.local/share/dev.pinkpixel.notara/workspace/`.

## 📋 Roadmap

- [ ] **Offline Support**: PWA capabilities with offline editing
- [ ] **Export Options**: PDF, HTML, and other format exports
- [ ] **Collaboration**: Share notes and collaborate in real-time
- [ ] **Plugin System**: Extensible plugin architecture
- [ ] **Mobile App**: Native iOS and Android applications
- [ ] **Cloud Sync**: Bring-your-own backend integrations post-local-first launch
- [ ] **Advanced AI**: More AI features and integrations

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Website**: [pinkpixel.dev](https://pinkpixel.dev)
- **Email**: [admin@pinkpixel.dev](mailto:admin@pinkpixel.dev)
- **GitHub Issues**: [Report bugs or request features](https://github.com/pinkpixel-dev/notara/issues)
- **Discord**: @sizzlebop

## ✨ About Pink Pixel

**Made with ❤️ by Pink Pixel**

Pink Pixel specializes in creating beautiful, modern applications that enhance productivity and creativity.

- 🌐 **Website**: [pinkpixel.dev](https://pinkpixel.dev)
- 💜 **GitHub**: [github.com/pinkpixel-dev](https://github.com/pinkpixel-dev)
- ☕ **Support**: [Buy me a coffee](https://www.buymeacoffee.com/pinkpixel)

---

**Dream it, Pixel it** ✨
