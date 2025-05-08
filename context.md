<context>
<project_tree>
├── .gitignore (0 KB)
├── CHANGELOG.md (2 KB)
├── components.json (0 KB)
├── CONTRIBUTING.md (4 KB)
├── env-instructions.txt (1 KB)
├── eslint.config.js (1 KB)
├── image/
    └── supabase-setup-guide/
    │   └── 1746318170739.png (200 KB)
├── index.html (1 KB)
├── LICENSE (1 KB)
├── OVERVIEW.md (5 KB)
├── package.json (3 KB)
├── postcss.config.js (0 KB)
├── public/
    ├── favicon.png (176 KB)
    ├── logo.png (176 KB)
    └── robots.txt (0 KB)
├── README.md (4 KB)
├── src/
    ├── App.css (1 KB)
    ├── App.tsx (2 KB)
    ├── components/
    │   ├── ai/
    │   │   └── AiAssistant.tsx (23 KB)
    │   ├── constellation/
    │   │   └── ConstellationView.tsx (9 KB)
    │   ├── layout/
    │   │   ├── AppLayout.tsx (3 KB)
    │   │   └── Sidebar.tsx (14 KB)
    │   ├── moodboard/
    │   │   └── MoodBoard.tsx (10 KB)
    │   ├── notes/
    │   │   ├── CalendarView.tsx (8 KB)
    │   │   ├── MarkdownPreview.tsx (0 KB)
    │   │   ├── NoteEditor.tsx (4 KB)
    │   │   ├── NotesList.tsx (8 KB)
    │   │   └── TagSelector.tsx (3 KB)
    │   ├── settings/
    │   │   ├── ProfileSettings.tsx (7 KB)
    │   │   └── SettingsPage.tsx (17 KB)
    │   ├── ui-custom/
    │   │   ├── AuthDebug.tsx (5 KB)
    │   │   └── ThemeSwitcher.tsx (3 KB)
    │   └── ui/
    │   │   ├── accordion.tsx (2 KB)
    │   │   ├── alert-dialog.tsx (4 KB)
    │   │   ├── alert.tsx (2 KB)
    │   │   ├── aspect-ratio.tsx (0 KB)
    │   │   ├── avatar.tsx (1 KB)
    │   │   ├── badge.tsx (1 KB)
    │   │   ├── breadcrumb.tsx (3 KB)
    │   │   ├── button.tsx (2 KB)
    │   │   ├── calendar.tsx (3 KB)
    │   │   ├── card.tsx (2 KB)
    │   │   ├── carousel.tsx (6 KB)
    │   │   ├── chart.tsx (11 KB)
    │   │   ├── checkbox.tsx (1 KB)
    │   │   ├── collapsible.tsx (0 KB)
    │   │   ├── command.tsx (5 KB)
    │   │   ├── context-menu.tsx (7 KB)
    │   │   ├── dialog.tsx (4 KB)
    │   │   ├── drawer.tsx (3 KB)
    │   │   ├── dropdown-menu.tsx (7 KB)
    │   │   ├── form.tsx (4 KB)
    │   │   ├── hover-card.tsx (1 KB)
    │   │   ├── input-otp.tsx (2 KB)
    │   │   ├── input.tsx (1 KB)
    │   │   ├── label.tsx (1 KB)
    │   │   ├── menubar.tsx (8 KB)
    │   │   ├── navigation-menu.tsx (5 KB)
    │   │   ├── pagination.tsx (3 KB)
    │   │   ├── popover.tsx (1 KB)
    │   │   ├── progress.tsx (1 KB)
    │   │   ├── radio-group.tsx (1 KB)
    │   │   ├── resizable.tsx (2 KB)
    │   │   ├── scroll-area.tsx (2 KB)
    │   │   ├── select.tsx (6 KB)
    │   │   ├── separator.tsx (1 KB)
    │   │   ├── sheet.tsx (4 KB)
    │   │   ├── sidebar.tsx (24 KB)
    │   │   ├── skeleton.tsx (0 KB)
    │   │   ├── slider.tsx (1 KB)
    │   │   ├── sonner.tsx (1 KB)
    │   │   ├── switch.tsx (1 KB)
    │   │   ├── table.tsx (3 KB)
    │   │   ├── tabs.tsx (2 KB)
    │   │   ├── textarea.tsx (1 KB)
    │   │   ├── toast.tsx (5 KB)
    │   │   ├── toaster.tsx (1 KB)
    │   │   ├── toggle-group.tsx (2 KB)
    │   │   ├── toggle.tsx (1 KB)
    │   │   ├── tooltip.tsx (1 KB)
    │   │   └── use-toast.ts (0 KB)
    ├── context/
    │   ├── AuthContext.tsx (6 KB)
    │   ├── NotesContext.tsx (6 KB)
    │   └── NotesContextTypes.tsx (1 KB)
    ├── hooks/
    │   ├── use-mobile.tsx (1 KB)
    │   └── use-toast.ts (4 KB)
    ├── index.css (7 KB)
    ├── lib/
    │   ├── supabase.ts (3 KB)
    │   └── utils.ts (0 KB)
    ├── main.tsx (0 KB)
    ├── pages/
    │   ├── AiAssistantPage.tsx (0 KB)
    │   ├── AuthCallbackPage.tsx (4 KB)
    │   ├── AuthPage.tsx (8 KB)
    │   ├── CalendarPage.tsx (0 KB)
    │   ├── ConstellationsPage.tsx (0 KB)
    │   ├── HomePage.tsx (4 KB)
    │   ├── Index.tsx (0 KB)
    │   ├── MarkdownCheatsheetPage.tsx (26 KB)
    │   ├── MoodBoardPage.tsx (5 KB)
    │   ├── NoteViewPage.tsx (2 KB)
    │   ├── NotFound.tsx (1 KB)
    │   ├── ProfileSettingsPage.tsx (0 KB)
    │   ├── SettingsPage.tsx (0 KB)
    │   └── TagsPage.tsx (10 KB)
    ├── types/
    │   └── index.ts (1 KB)
    └── vite-env.d.ts (0 KB)
├── tailwind.config.ts (4 KB)
├── tsconfig.app.json (1 KB)
├── tsconfig.json (0 KB)
├── tsconfig.node.json (0 KB)
├── vite.config.ts (0 KB)
└── wrangler.toml (1 KB)

</project_tree>
<project_files>
<file name="vite.config.ts" path="vite.config.ts">
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
</file>
<file name="tsconfig.json" path="tsconfig.json">
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "noImplicitAny": false,
    "noUnusedParameters": false,
    "skipLibCheck": true,
    "allowJs": true,
    "noUnusedLocals": false,
    "strictNullChecks": false
  }
}
</file>
<file name="README.md" path="README.md">
# 🌌 Notara

<div align="center">
  <img src="https://res.cloudinary.com/di7ctlowx/image/upload/v1746328813/logo_ozzqvo.png" alt="Notara Logo">
</div>

![Notara Logo](https://img.shields.io/badge/✨-Notara-blueviolet?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![Last Updated](https://img.shields.io/badge/Last%20Updated-May%203%2C%202025-purple?style=for-the-badge)

**Notara** is a beautiful, cosmic-themed note-taking application that combines powerful organization features with an immersive user experience.

<div align="center">
  <img src="https://res.cloudinary.com/di7ctlowx/image/upload/v1746328840/1746318170739_oxri3a.png" alt="Notara Screenshot">
</div>

![Cosmic Theme](https://img.shields.io/badge/🌠-Cosmic%20Theme-9b87f5?style=flat-square)
![Markdown Support](https://img.shields.io/badge/📝-Markdown-0EA5E9?style=flat-square)
![Tags](https://img.shields.io/badge/🏷️-Tags-10B981?style=flat-square)
![Mood Boards](https://img.shields.io/badge/🎨-Mood%20Boards-F97316?style=flat-square)

## ✨ Features

- **📝 Rich Markdown Support**: Create and format your notes with full Markdown capabilities
- **🏷️ Smart Tagging**: Organize notes with customizable, colorful tags
- **🌠 Constellation View**: Visualize and navigate connections between related notes
- **🎨 Mood Boards**: Create visual collections for inspiration and ideas
- **🤖 AI Assistance**: Get help with your writing and organization (in development)
- **📅 Calendar Integration**: View and organize notes by date with a beautiful calendar
- **🔒 Secure Authentication**: Keep your notes private and secure
- **🌃 Cosmic UI**: Enjoy a beautiful, space-themed interface with animations and effects

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm or Yarn or Bun

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/your-username/notara.git
   cd notara
   ```
2. Install dependencies

   ```bash
   # Using npm
   npm install

   # Using Yarn
   yarn

   # Using Bun
   bun install
   ```
3. Start the development server

   ```bash
   # Using npm
   npm run dev

   # Using Yarn
   yarn dev

   # Using Bun
   bun dev
   ```
4. Open your browser and navigate to `http://localhost:5173`

## 🔧 Building for Production

```bash
# Using npm
npm run build

# Using Yarn
yarn build

# Using Bun
bun run build
```

The built files will be in the `dist` directory, ready to be deployed.

## 🧩 Project Structure

The project follows a modular structure:

- `src/components`: UI components organized by feature
- `src/context`: React Context providers for state management
- `src/pages`: Page components for different views
- `src/hooks`: Custom React hooks
- `src/lib`: Utility functions and libraries
- `src/types`: TypeScript type definitions

See [OVERVIEW.md](./OVERVIEW.md) for a more detailed breakdown.

## 🔌 Authentication

Notara uses [Supabase](https://supabase.io/) for authentication. To set up your own authentication:

1. Create a Supabase account and project
2. Copy your Supabase URL and anon key
3. Create a `.env.local` file in the root directory with:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📬 Contact

Pink Pixel - [pinkpixel.dev](https://pinkpixel.dev) - [@sizzlebop](https://discord.com/users/sizzlebop)

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [shadcn/ui](https://ui.shadcn.com/)

---

✨ Dream it, Pixel it ✨
</file>
<file name="package.json" path="package.json">
{
  "name": "@pinkpixel/notara",
  "version": "1.2.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "deploy": "npm run deploy:cloudflare",
    "deploy:cloudflare": "node deploy-cloudflare.js"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    "@radix-ui/react-aspect-ratio": "^1.1.0",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.1.1",
    "@radix-ui/react-collapsible": "^1.1.0",
    "@radix-ui/react-context-menu": "^2.2.1",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-hover-card": "^1.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-menubar": "^1.1.1",
    "@radix-ui/react-navigation-menu": "^1.2.0",
    "@radix-ui/react-popover": "^1.1.1",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-radio-group": "^1.2.0",
    "@radix-ui/react-scroll-area": "^1.1.0",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-toggle": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.4",
    "@supabase/supabase-js": "^2.49.4",
    "@tanstack/react-query": "^5.56.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.3.0",
    "input-otp": "^1.2.4",
    "lucide-react": "^0.462.0",
    "next-themes": "^0.3.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.0",
    "react-markdown": "^10.1.0",
    "react-resizable-panels": "^2.1.3",
    "react-router-dom": "^6.26.2",
    "recharts": "^2.12.7",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "uuid": "^11.1.0",
    "vaul": "^0.9.3",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@eslint/js": "^9.9.0",
    "@tailwindcss/typography": "^0.5.15",
    "@types/node": "^22.5.5",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react-swc": "^3.9.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.9.0",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.9",
    "globals": "^15.9.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.11",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.0.1",
    "vite": "^6.3.4",
    "wrangler": "^4.14.1"
  }
}
</file>
<file name="OVERVIEW.md" path="OVERVIEW.md">
# ✨ Notara - Cosmic Note-Taking App

![Last Updated](https://img.shields.io/badge/Last%20Updated-May%203%2C%202025-blueviolet)

## 🌌 Introduction

Notara is a beautiful, cosmic-themed note-taking application that combines powerful organization features with an immersive user experience. The application allows users to create, edit, and organize notes with a delightful space-inspired interface.

## 🚀 Features

- **📝 Markdown Notes**: Create and edit notes with full Markdown support
- **🏷️ Tags**: Organize notes with colorful tags
- **🌠 Constellation View**: Visualize connections between your notes
- **🎨 Mood Boards**: Create visual collections for inspiration
- **🤖 AI Assistant**: Get help with your note-taking (in development)
- **📅 Calendar View**: Organize notes by date
- **🔒 Authentication**: Secure your notes with user accounts
- **🌃 Cosmic UI**: Enjoy a beautiful, space-themed interface with animations

## 🏗️ Architecture

Notara is built with modern web technologies:

- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **State Management**: React Context API
- **Routing**: React Router
- **UI Components**: Custom components built on Radix UI primitives
- **Styling**: TailwindCSS
- **Data Fetching**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Supabase Auth

## 📂 Project Structure

```
notara/
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   ├── ai/           # AI assistant components
│   │   ├── constellation/ # Constellation view components
│   │   ├── layout/       # Layout components (AppLayout, Sidebar)
│   │   ├── moodboard/    # Mood board components
│   │   ├── notes/        # Note-related components
│   │   ├── settings/     # Settings components
│   │   ├── ui/           # UI components (based on shadcn/ui)
│   │   └── ui-custom/    # Custom UI components
│   ├── context/          # React context providers
│   │   ├── AuthContext.tsx # Authentication state
│   │   └── NotesContext.tsx # Notes state management
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions and libraries
│   ├── pages/            # Page components
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Main App component
│   ├── App.css           # Global styles
│   ├── main.tsx          # Entry point
│   └── index.css         # Global CSS
├── package.json          # Dependencies and scripts
├── tailwind.config.ts    # TailwindCSS configuration
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

## 🔌 Dependencies

### Main Dependencies

- react, react-dom - UI framework
- react-router-dom - Routing
- @tanstack/react-query - Data fetching
- @supabase/supabase-js - Authentication and database
- react-hook-form, zod - Form handling and validation
- react-markdown - Markdown rendering
- lucide-react - Icons
- date-fns - Date utilities
- tailwind-merge, class-variance-authority - Utility-first CSS

### UI Component Libraries

- Multiple @radix-ui/* packages for accessible UI primitives
- sonner, vaul - Toast notifications and drawer components
- cmdk - Command menu interface
- embla-carousel-react - Carousel component

### Development Dependencies

- vite, @vitejs/plugin-react-swc - Build tooling
- typescript, typescript-eslint - Type checking
- eslint, eslint-plugin-* - Code linting
- tailwindcss, postcss, autoprefixer - CSS tooling

## 💾 Data Storage

Currently, the application uses localStorage for storing notes, tags, and mood boards. There is integration with Supabase Auth for user authentication, suggesting plans for server-side storage in the future.

## 🎭 UI/UX Design

The application features a distinctive cosmic theme with:

- Star field animations in the background
- Gradient colors that give a nebula-like appearance
- Animation effects including floating and glowing elements
- Dark mode aesthetics with space-inspired colors
- Resizable panels for workspace flexibility
- Clean, modern interface components

## 🚧 Project Status

The project appears to be in active development:

- Core note-taking functionality is well-implemented
- UI components and styling are polished
- Some features (AI Assistant, Constellation View) are in early stages
- Authentication is implemented but may still be in progress
- Current version is 1.0.0, released on May 3, 2025

## 🔮 Future Development Opportunities

- Complete server-side storage with Supabase
- Implement full Constellation View functionality
- Enhance AI Assistant capabilities
- Add collaborative features
- Implement search functionality
- Add export/import options
- Develop mobile responsive design

---

✨ Made with ❤️ by Pink Pixel 
</file>
<file name="index.html" path="index.html">
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Notara</title>
    <meta name="description" content="AI assisted note-taking app and markdown editor" />
    <meta name="author" content="Pink Pixel" />

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/favicon.png" />

    <!-- Open Graph / Social Media -->
    <meta property="og:title" content="Notara" />
    <meta property="og:description" content="AI assisted note-taking app and markdown editor" />
    <meta property="og:image" content="/logo.png" />
    <meta property="og:type" content="website" />

  </head>

  <body>
    <div id="root"></div>
    <!-- IMPORTANT: DO NOT REMOVE THIS SCRIPT TAG OR THIS VERY COMMENT! -->
    <script src="https://cdn.gpteng.co/gptengineer.js" type="module"></script>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
</file>
<file name="components.json" path="components.json">
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
</file>
<file name="CHANGELOG.md" path="CHANGELOG.md">
# 📝 Changelog

All notable changes to the Notara project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-05-03

### ✨ Added

- Initial release of Notara
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

## [Unreleased]

### Planned Features

- Enhanced AI assistant functionality
- Full implementation of constellation view
- Server-side storage with Supabase
- Search functionality
- Export/import options
- Collaborative editing
- Mobile-responsive design
- Dark/light theme toggle
- More customization options

---

✨ Made with ❤️ by Pink Pixel 
</file>
</project_files>
</context>