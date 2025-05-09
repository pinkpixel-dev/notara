# 🌌 Notara

<div align="center">
  <img src="https://res.cloudinary.com/di7ctlowx/image/upload/v1746328813/logo_ozzqvo.png" alt="Notara Logo">
</div>

![Notara Logo](https://img.shields.io/badge/✨-Notara-blueviolet?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.2.0-blue?style=for-the-badge)
![Last Updated](https://img.shields.io/badge/Last%20Updated-May%209%2C%202025-purple?style=for-the-badge)

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
