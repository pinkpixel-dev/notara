<div align="center">
  <img src="public/logo.png" alt="Notara Logo" width="300" height="300">
</div>

# ✨ Notara

> **Dream it, Pixel it** - A feature-rich note-taking application and markdown editor with AI assistant

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/pinkpixel-dev/notara)
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
- **Vision Boards**: Create visual mood boards with images and text
- **Calendar View**: Organize notes and todos temporally
- **Constellations**: Visualize connections between your content
- **Glass Theme**: Beautiful frosted glass UI effects
- **Refined Navigation**: Starred notes live in the main nav with footer icon chips for settings, docs, and the markdown cheat sheet, plus a persistent header icon for quick tag management

### 🤖 **AI Assistant**
- **Writing Support**: AI-powered content generation and editing
- **Generate Images**: AI-generated images on demand for your notes, documents, and boards
- **Seamless Pollinations Proxy**: Requests route through `/api/pollinations/*` so the browser avoids CORS issues and can optionally attach your Pollinations API token for watermark-free results
- **Note Summaries**: Automatic summarization of long notes
- **Creative Prompts**: Generate ideas and writing inspiration
- **Context Awareness**: AI understands your existing content

### 💾 **Local File Storage**
- **Choose Your Folder**: Pick a Notara directory via the new File menu to sync data as readable JSON
- **Automatic & Manual Backups**: Notes, tags, todos, and vision boards write through to disk as you work or whenever you press Save
- **Graceful Fallbacks**: If permissions disappear, Notara switches back to in-browser storage until you reconnect

### 🔄 **Local-First Workspace**
- **On-Disk Sync**: Choose a Notara folder and work against readable JSON files
- **Cloud-Agnostic**: No external auth or Supabase project required—set `VITE_ENABLE_AUTH=true` only if you purposely want Supabase sign-in
- **Graceful Fallbacks**: Automatically returns to browser storage if the folder disconnects
- **Portable Data**: Copy the Notara directory anywhere to migrate your vault

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **Git**

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

## 🏗️ Build & Deploy

### Development Build
```bash
npm run build:dev
```

### Production Build
```bash
npm run build
```

### Deploy to Cloudflare
```bash
npm run deploy
```

Ensure the following secrets exist in your Cloudflare Pages project before deploying:

- `POLLINATIONS_API_TOKEN` *(optional but recommended if you rely on authenticated Pollinations requests)*

## 🛠️ Technology Stack

### Frontend
- **React** 18.3.1 - Modern React with hooks
- **TypeScript** - Type safety and developer experience
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React components
- **Radix UI** - Accessible component primitives
- **Prism React Renderer** - Fast, themeable syntax highlighting for markdown code blocks

### Storage & Integrations
- **Browser Storage API** - Local IndexedDB fallback when no folder is connected
- **File System Access API** - Direct sync to a user-selected Notara folder
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
```

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
