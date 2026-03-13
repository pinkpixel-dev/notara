# 🤝 Contributing to Notara

Thank you for your interest in contributing to **Notara**! We welcome contributions from developers of all skill levels. This guide will help you get started with contributing to our note-taking and personal knowledge management application.

## 🌟 How to Contribute

There are many ways you can contribute to Notara:

- 🐛 **Report bugs** - Help us identify and fix issues
- 💡 **Suggest features** - Share ideas for new functionality
- 📝 **Improve documentation** - Help make our docs clearer
- 🎨 **Design improvements** - Enhance the user interface
- 🔧 **Code contributions** - Fix bugs and implement features
- 🧪 **Testing** - Help improve our test coverage
- 🌍 **Translations** - Help localize the app (future)

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18+ installed
- **npm** or **yarn** package manager
- **Git** for version control
- A **GitHub account**
- Basic knowledge of **React** and **TypeScript**

### Setting Up Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/notara.git
   cd notara
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/pinkpixel-dev/notara.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Configure your `.env` file with Supabase credentials for testing.

6. **Start the development server**:
   ```bash
   npm run dev
   ```

7. **Verify setup** by visiting `http://localhost:3489`

## 🏗️ Project Structure

Understanding the project structure will help you contribute effectively:

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components
│   ├── notes/          # Note-related components
│   ├── todos/          # Todo management
│   └── ui/             # Base UI components (shadcn/ui)
├── context/            # React Context providers
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── pages/              # Route components
└── types/              # TypeScript definitions
```

## 💻 Development Workflow

### Creating a Feature Branch

1. **Sync with upstream**:
   ```bash
   git checkout main
   git pull upstream main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/bug-description
   ```

### Making Changes

1. **Write clean, readable code** following our style guidelines
2. **Add or update tests** for your changes
3. **Update documentation** if needed
4. **Test thoroughly** in different scenarios

### Commit Guidelines

We follow conventional commit format:

```bash
# Format
<type>(<scope>): <description>

# Examples
feat(notes): add note pinning functionality
fix(auth): resolve login redirect issue
docs(readme): update installation instructions
style(ui): improve glass theme effects
refactor(context): optimize notes context performance
test(notes): add tests for note creation
```

**Commit Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style/formatting (not UI changes)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Code Quality

Before submitting, ensure your code passes all checks:

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Build to check for errors
npm run build
```

### Submitting a Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub with:
   - Clear title and description
   - Reference to any related issues
   - Screenshots for UI changes
   - Testing instructions

3. **Respond to feedback** promptly and make requested changes

## 🎨 Code Style Guidelines

### TypeScript Best Practices

- **Use strict typing** - Avoid `any` type
- **Define interfaces** for complex objects
- **Use enums** for constants
- **Export types** from `src/types/index.ts`

```typescript
// Good
interface NoteFormData {
  title: string;
  content: string;
  tags: string[];
}

// Avoid
const data: any = { ... };
```

### React Component Guidelines

- **Use functional components** with hooks
- **Follow the component structure**:

```tsx
import React from 'react';
import { SomeType } from '@/types';
import { Button } from '@/components/ui/button';

interface ComponentProps {
  title: string;
  onSave: (data: SomeType) => void;
}

export const MyComponent: React.FC<ComponentProps> = ({
  title,
  onSave
}) => {
  // Hooks at the top
  const [isLoading, setIsLoading] = useState(false);

  // Event handlers
  const handleSave = () => {
    // Implementation
  };

  // Early returns
  if (!title) {
    return null;
  }

  // Main render
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

### Styling Guidelines

- **Use TailwindCSS** classes primarily
- **Follow mobile-first** responsive design
- **Use CSS custom properties** for theming
- **Maintain consistency** with existing designs

```tsx
// Good
<div className="p-4 bg-card rounded-lg shadow-sm md:p-6">
  <h2 className="text-lg font-semibold mb-4">Title</h2>
</div>

// Use semantic class names for complex styles
<div className="glass-panel note-editor">
```

### File Organization

- **Components**: One component per file
- **Utilities**: Group related functions
- **Constants**: Use descriptive names
- **Imports**: Organize by category

```tsx
// External libraries
import React, { useState } from 'react';
import { useRouter } from 'react-router-dom';

// Internal utilities
import { formatDate } from '@/lib/utils';
import { useNotes } from '@/context/NotesContext';

// Components
import { Button } from '@/components/ui/button';
import NoteEditor from '@/components/notes/NoteEditor';

// Types
import { Note } from '@/types';
```

## 🧪 Testing Guidelines

### Writing Tests

We use **Jest** and **React Testing Library**:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteEditor } from '@/components/notes/NoteEditor';

describe('NoteEditor', () => {
  it('should render note title input', () => {
    render(<NoteEditor />);

    const titleInput = screen.getByPlaceholderText(/note title/i);
    expect(titleInput).toBeInTheDocument();
  });

  it('should call onSave when save button is clicked', () => {
    const mockOnSave = jest.fn();
    render(<NoteEditor onSave={mockOnSave} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(mockOnSave).toHaveBeenCalled();
  });
});
```

### Testing Checklist

- [ ] **Unit tests** for utilities and hooks
- [ ] **Component tests** for user interactions
- [ ] **Integration tests** for complex workflows
- [ ] **Accessibility tests** with screen readers
- [ ] **Visual regression tests** (future)

## 🐛 Bug Reports

When reporting bugs, please include:

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
Add screenshots if applicable.

**Environment:**
- OS: [e.g., macOS, Windows, Linux]
- Browser: [e.g., Chrome, Firefox, Safari]
- Version: [e.g., 1.0.0]

**Additional context**
Any other context about the problem.
```

## 💡 Feature Requests

For feature requests, please provide:

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem you're trying to solve.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Additional context**
Mockups, examples, or any other context.
```

## 📋 Pull Request Guidelines

### PR Checklist

Before submitting a PR, ensure:

- [ ] **Code follows** our style guidelines
- [ ] **Tests pass** locally
- [ ] **Documentation updated** if needed
- [ ] **No breaking changes** (or clearly documented)
- [ ] **PR description** explains the changes
- [ ] **Screenshots included** for UI changes
- [ ] **Responsive design** tested on different screen sizes

### PR Review Process

1. **Automated checks** run first
2. **Maintainer review** for code quality
3. **Design review** for UI changes
4. **Testing** in different environments
5. **Approval and merge**

## 🚀 Release Process

We follow **semantic versioning** (SemVer):

- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features (backward compatible)
- **Patch** (0.0.1): Bug fixes

### Release Schedule

- **Patch releases**: As needed for critical bugs
- **Minor releases**: Monthly feature releases
- **Major releases**: Quarterly or for significant changes

## 🏆 Recognition

Contributors are recognized in:

- **CHANGELOG.md** - All contributions documented
- **README.md** - Major contributors highlighted
- **GitHub** - Contributor badges and mentions
- **Social media** - Feature announcements credit contributors

## 🤔 Questions?

If you have questions about contributing:

- **GitHub Discussions** - For general questions
- **GitHub Issues** - For specific problems
- **Discord**: @sizzlebop - For real-time chat
- **Email**: [admin@pinkpixel.dev](mailto:admin@pinkpixel.dev)

## 📜 Code of Conduct

### Our Pledge

We are committed to making participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Trolling, insulting comments, and personal attacks
- Public or private harassment
- Publishing private information without permission
- Any conduct inappropriate in a professional setting

### Enforcement

Instances of abusive behavior may be reported to [admin@pinkpixel.dev](mailto:admin@pinkpixel.dev). All complaints will be reviewed and investigated promptly and fairly.

## 🙏 Thank You!

Thank you for taking the time to contribute to Notara! Every contribution, no matter how small, helps make the project better for everyone.

---

**Made with ❤️ by Pink Pixel** ✨

_"The best way to get started is to quit talking and begin doing." - Walt Disney_
