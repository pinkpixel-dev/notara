# ✨ Notara - Cosmic Note-Taking App

![Last Updated](https://img.shields.io/badge/Last%20Updated-May%209%2C%202025-blueviolet)

## 🌌 Introduction

Notara is a beautiful, cosmic-themed note-taking application that combines powerful organization features with an immersive user experience. The application allows users to create, edit, and organize notes with a delightful space-inspired interface.

## 🚀 Features

- **📝 Rich Markdown Support**: Create and format your notes with full Markdown capabilities
- **🏷️ Smart Tagging**: Organize notes with customizable, colorful tags
- **🌠 Constellation View**: Visualize and navigate connections between related notes
- **🎨 Mood Boards**: Create visual collections for inspiration and ideas
- **🤖 AI Assistant**: Get help with your writing and organization with text generation, summarization, and image creation
- **📅 Calendar Integration**: View and organize notes by date with a beautiful calendar
- **🔒 Secure Authentication**: Keep your notes private and secure with Supabase
- **🌃 Cosmic UI**: Enjoy a beautiful, space-themed interface with animations and effects

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
- **AI Services**: Pollinations API for text and image generation, with support for multiple embedding providers (OpenAI, Ollama, HuggingFace)

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

### AI & Embedding Providers

- Pollinations API for text and image generation
- OpenAI, Ollama, HuggingFace embedding providers

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

The project is in active development:

- Core note-taking functionality is well-implemented with rich Markdown support
- UI components and styling are polished with a consistent cosmic theme
- AI Assistant has been enhanced with note summarization and context awareness
- Constellation View provides visualization of connections between notes
- Calendar integration allows for temporal organization of notes
- Authentication is implemented with Supabase
- Current version is 1.2.0, with ongoing improvements since the initial 1.0.0 release

## 🔮 Future Development Opportunities

- Complete server-side storage with Supabase for notes, tags, and mood boards
- Further enhance AI Assistant capabilities:
  - Improve context awareness for mood boards and constellation view
  - Add calendar integration for meeting schedule queries
  - Enhance note summarization capabilities
- Implement full Constellation View functionality with more interactive features
- Add collaborative features for shared note-taking
- Implement comprehensive search functionality across all content types
- Add export/import options for notes and collections
- Develop fully responsive mobile design

---

✨ Made with ❤️ by Pink Pixel