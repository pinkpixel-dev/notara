# ✨ Notara - Cosmic Note-Taking App

![Last Updated](https://img.shields.io/badge/Last%20Updated-May%2014%2C%202025-blueviolet)

## 🌌 Introduction

Notara is a beautiful, cosmic-themed note-taking application that combines powerful organization features with an immersive user experience. The application allows users to create, edit, and organize notes with a delightful space-inspired interface, featuring rich Markdown support, smart tagging, and innovative visualization tools like Constellation View and Mood Boards.

## 🚀 Features

- **📝 Rich Markdown Support**: Create and format your notes with full Markdown capabilities
- **🏷️ Smart Tagging**: Organize notes with customizable, colorful tags
- **🌠 Constellation View**: Visualize and navigate connections between related notes
- **🎨 Mood Boards**: Create visual collections for inspiration and ideas
- **🤖 AI Assistant**: Get help with your writing and organization with text generation, summarization, and image creation
- **📅 Calendar Integration**: View and organize notes by date with a beautiful calendar
- **✅ Todo Lists**: Manage tasks with integrated todo lists and sub-items
- **🔒 Secure Authentication**: Keep your notes private and secure with Supabase
- **🌃 Cosmic UI**: Enjoy a beautiful, space-themed interface with animations and effects

## 🏗️ Architecture

### Technology Stack

Notara is built with modern web technologies:

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **State Management**: React Context API for global state
- **Routing**: React Router v6 for navigation
- **UI Components**: Custom components built on Radix UI primitives
- **Styling**: TailwindCSS with custom animations and theme
- **Data Fetching**: TanStack Query (React Query) for efficient data fetching
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Supabase Auth with email/password and GitHub OAuth
- **AI Services**: Pollinations API for text and image generation

### Authentication Implementation

The authentication system uses Supabase with:
- Email/password authentication
- GitHub OAuth integration
- Session persistence
- Password reset functionality
- Auth state management through React Context

### Data Management

Data is currently managed through:
- React Context providers for global state
- localStorage for persistence
- Well-defined TypeScript interfaces for data structures
- CRUD operations for notes, tags, mood boards, and todos

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
│   │   ├── NotesContext.tsx # Notes state management
│   │   └── TodoContext.tsx # Todo list management
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

## 🧩 Data Models

### Notes
```typescript
interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: NoteTag[];
  isPinned: boolean;
}
```

### Tags
```typescript
interface NoteTag {
  id: string;
  name: string;
  color: string;
}
```

### Mood Boards
```typescript
interface MoodBoard {
  id: string;
  name: string;
  items: MoodBoardItem[];
}

interface MoodBoardItem {
  id: string;
  type: 'image' | 'text';
  content: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
}
```

### Todo Lists
```typescript
interface TodoList {
  id: string;
  title: string;
  date: string;   // ISO date string (yyyy-MM-dd)
  time: string;   // HH:mm format
  items: TodoItem[];
}

interface TodoItem {
  id: string;
  content: string;
  checked: boolean;
  time: string;      // HH:mm format
  subItems?: TodoItem[];
}
```

## 🎨 UI/UX Design

The application features a distinctive cosmic theme with:

- **Color Palette**:
  - Deep space background (#121624)
  - Nebula purple (#9b87f5)
  - Stardust violet (#8B5CF6)
  - Aurora blue (#0EA5E9)
  - Nova pink (#D946EF)
  - Solar orange (#F97316)

- **Animations**:
  - Twinkling star effects
  - Floating elements
  - Fade transitions
  - Slide-in/slide-up effects
  - Pulse animations

- **UI Elements**:
  - Star field backgrounds
  - Gradient cards with nebula-like appearance
  - Glowing accents and borders
  - Space-themed icons and illustrations
  - Resizable panels for workspace customization

## 🤖 AI Integration

The AI Assistant provides:

- **Text Generation**: Create content, answer questions, and provide writing suggestions
- **Note Summarization**: Multiple summarization types (concise, detailed, bullet points, action items, key concepts)
- **Image Generation**: Create images based on prompts using the Pollinations API
- **Context Awareness**: Analyze mood boards, constellation connections, and calendar data
- **Focus Prompts**: Generate creative writing prompts based on existing notes

## 🔌 Dependencies

### Main Dependencies
- react, react-dom (v18.3+)
- react-router-dom (v6.26+)
- @tanstack/react-query
- @supabase/supabase-js
- react-hook-form, zod
- react-markdown
- lucide-react
- date-fns
- uuid
- tailwind-merge, class-variance-authority

### UI Component Libraries
- Multiple @radix-ui/* packages for accessible UI primitives
- sonner, vaul - Toast notifications and drawer components
- cmdk - Command menu interface
- embla-carousel-react - Carousel component
- recharts - Chart visualization

## 🚧 Current Status

The project is in active development:

- **Version**: 1.2.0 (as of May 9, 2025)
- **Implemented Features**:
  - Core note-taking with Markdown support
  - Tag-based organization
  - Basic Constellation View
  - Mood Boards
  - AI Assistant with text and image generation
  - Calendar integration
  - Authentication with Supabase
  - Todo list management

- **Recent Updates** (v1.2.0):
  - Enhanced AI assistant with improved context awareness
  - Added image generation capabilities
  - Expanded note summarization options
  - Refined cosmic theme styling
  - Improved responsive layout
  - Added calendar integration

## 🔮 Future Development

### Planned Enhancements
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
- Add dark/light theme toggle with customizable cosmic themes

### Technical Roadmap
- Migrate from localStorage to Supabase for data persistence
- Implement real-time collaboration features
- Add offline support with service workers
- Enhance performance with optimized rendering
- Implement comprehensive testing suite

## 🤝 Contributing

Contributions to Notara are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

### Development Setup
1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env` file following the instructions in `env-instructions.txt`
4. Start the development server with `npm run dev`

### Coding Guidelines
- Use TypeScript for all JavaScript files
- Use functional components with hooks
- Follow the cosmic theme aesthetic
- Use TailwindCSS for styling
- Write tests for your code when possible

---

✨ Made with ❤️ by Pink Pixel