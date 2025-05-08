## Project Structure

```
  📁 .wrangler/
    📁 tmp/
  📁 image/
    📁 supabase-setup-guide/
      📄 1746318170739.png
  📁 public/
    📄 favicon.png
    📄 logo.png
    📄 robots.txt
  📁 src/
    📁 components/
      📁 ai/
        📄 AiAssistant.tsx
      📁 constellation/
        📄 ConstellationView.tsx
      📁 layout/
        📄 AppLayout.tsx
        📄 Sidebar.tsx
      📁 moodboard/
        📄 MoodBoard.tsx
      📁 notes/
        📄 CalendarView.tsx
        📄 MarkdownPreview.tsx
        📄 NoteEditor.tsx
        📄 NotesList.tsx
        📄 TagSelector.tsx
      📁 settings/
        📄 ProfileSettings.tsx
        📄 SettingsPage.tsx
      📁 ui/
        📄 accordion.tsx
        📄 alert-dialog.tsx
        📄 alert.tsx
        📄 aspect-ratio.tsx
        📄 avatar.tsx
        📄 badge.tsx
        📄 breadcrumb.tsx
        📄 button.tsx
        📄 calendar.tsx
        📄 card.tsx
        📄 carousel.tsx
        📄 chart.tsx
        📄 checkbox.tsx
        📄 collapsible.tsx
        📄 command.tsx
        📄 context-menu.tsx
        📄 dialog.tsx
        📄 drawer.tsx
        📄 dropdown-menu.tsx
        📄 form.tsx
        📄 hover-card.tsx
        📄 input-otp.tsx
        📄 input.tsx
        📄 label.tsx
        📄 menubar.tsx
        📄 navigation-menu.tsx
        📄 pagination.tsx
        📄 popover.tsx
        📄 progress.tsx
        📄 radio-group.tsx
        📄 resizable.tsx
        📄 scroll-area.tsx
        📄 select.tsx
        📄 separator.tsx
        📄 sheet.tsx
        📄 sidebar.tsx
        📄 skeleton.tsx
        📄 slider.tsx
        📄 sonner.tsx
        📄 switch.tsx
        📄 table.tsx
        📄 tabs.tsx
        📄 textarea.tsx
        📄 toast.tsx
        📄 toaster.tsx
        📄 toggle-group.tsx
        📄 toggle.tsx
        📄 tooltip.tsx
        📄 use-toast.ts
      📁 ui-custom/
        📄 AuthDebug.tsx
        📄 ThemeSwitcher.tsx
    📁 context/
      📄 AuthContext.tsx
      📄 NotesContext.tsx
      📄 NotesContextTypes.tsx
    📁 hooks/
      📄 use-mobile.tsx
      📄 use-toast.ts
    📁 lib/
      📄 supabase.ts
      📄 utils.ts
    📁 pages/
      📄 AiAssistantPage.tsx
      📄 AuthCallbackPage.tsx
      📄 AuthPage.tsx
      📄 CalendarPage.tsx
      📄 ConstellationsPage.tsx
      📄 HomePage.tsx
      📄 Index.tsx
      📄 MarkdownCheatsheetPage.tsx
      📄 MoodBoardPage.tsx
      📄 NoteViewPage.tsx
      📄 NotFound.tsx
      📄 ProfileSettingsPage.tsx
      📄 SettingsPage.tsx
      📄 TagsPage.tsx
    📁 types/
      📄 index.ts
    📄 App.css
    📄 App.tsx
    📄 index.css
    📄 main.tsx
    📄 vite-env.d.ts
  📄 .env
  📄 .env.example
  📄 .gitignore
  📄 CHANGELOG.md
  📄 codian-context-2025-05-07T22-22-43-360Z.xml
  📄 codian-context-2025-05-08T03-22-15-137Z.xml
  📄 components.json
  📄 context.md
  📄 CONTRIBUTING.md
  📄 deploy-cloudflare.js
  📄 env-instructions.txt
  📄 eslint.config.js
  📄 index.html
  📄 LICENSE
  📄 OVERVIEW.md
  📄 package-lock.json
  📄 package.json
  📄 postcss.config.js
  📄 README.md
  📄 supabase-setup-guide.md
  📄 tailwind.config.ts
  📄 tsconfig.app.json
  📄 tsconfig.json
  📄 tsconfig.node.json
  📄 vite.config.ts
  📄 wrangler.toml

```

# Project Documentation

*Generated on 5/7/2025 at 11:24:52 PM*

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [API Reference](#api-reference)
4. [Usage Examples](#usage-examples)

## Project Overview

## Project Overview

### Purpose
The project aims to create an interactive and user-friendly note-taking application named Notara. It is designed with a cosmic theme and provides a rich feature set to enhance the user experience in creating, organizing, and managing personal, work, and general notes.

### Main Features

1. **AI-Assistant Integration**: The application includes an AI assistant capable of performing tasks such as generating creative writing prompts, summarizing notes, and generating images based on user prompts using the Pollinations API.

2. **Note Management**: Users have the ability to create, update, and delete notes. The note editor supports Markdown and allows for rich text formatting. Notes can be organized with tags and visualized in a constellation view.

3. **Mood Boards**: The application supports the creation of mood boards, which users can use to visually arrange and manage inspiration and ideas.

4. **Error Handling**: The AI assistant includes error handling that provides user feedback if an error occurs during the processing of requests or generation of AI-based content.

5. **Custom Components**: The application features custom UI components such as buttons, text areas, resizable panels, and toasts for notifications.

6. **Contextual Data Management**: The application uses React Context for state management, particularly for managing notes, tags, and mood boards.

7. **Responsive Design**: The UI is designed to be responsive and includes animations and visual effects such as generating a star field background.

8. **Persistent Storage**: The application uses `localStorage` to persist notes, tags, and mood boards across browser sessions.

9. **Routing**: The application has a client-side routing setup using `react-router-dom` for navigating between different pages like the home page, tags, mood boards, AI assistant, and others.

### Technologies Used

1. **React**: Used as the main library for building the user interface. It provides the component structure and hooks for managing state and effects.

2. **TypeScript**: The application is written in TypeScript, which adds static type checking to JavaScript and enhances code quality and maintainability.

3. **Lucide-react**: A React library used for rendering icons within the application.

4. **Pollinations API**: An external API used by the AI assistant for processing natural language and image generation.

5. **React-Query**: Utilized for managing and caching asynchronous data, ensuring efficient data synchronization.

6. **React Router DOM**: This library is used for managing routing within the application, enabling navigation between different views.

7. **UUID**: A utility to generate unique identifiers, used for creating unique keys for notes, tags, and other entities.

8. **Local Storage**: Used to store and retrieve the application state, such as notes and tags, ensuring data persistence.

9. **Custom Styling and Animation**: The application includes custom CSS for styling and animations to enhance the visual appeal and user interaction.

This project combines modern web technologies and APIs to create a feature-rich note-taking experience with a unique and engaging user interface.

## Architecture

## Project Architecture Overview

The architecture of the Notara note-taking application is designed to be modular, scalable, and maintainable. Below is an overview of the main components, their relationships, and the design patterns used in the project.

### Main Components

1. **React Components**: The UI is broken down into reusable React components, such as buttons, toasts, tabs, cards, inputs, switches, selects, and dialogs. These components can be found across various files like `src\components\ui\button.tsx` and `src\components\ui\dialog.tsx`, adhering to the principles of component-based architecture.

2. **Pages**: The application features several pages (`HomePage`, `TagsPage`, `ConstellationsPage`, etc.) that represent the different views users can navigate to. Each page component is stored in `src\pages` and is responsible for rendering the UI and orchestrating the behavior relevant to that page.

3. **Routing**: The `react-router-dom` library is used for client-side routing, defined in `src\App.tsx`. It handles the navigation between the different pages without reloading the browser.

4. **Context Providers**: The app leverages React Context providers like `NotesProvider` and `AuthProvider` to manage and distribute application state across components. These contexts are wrapped around the application at the top level in `src\App.tsx`.

5. **API Integration**: The `AiAssistant.tsx` component integrates with the Pollinations API to generate AI-based text and image content. It uses an async streaming pattern for processing real-time updates from the API.

6. **Local Storage**: The app uses the Web Storage API to persist notes, tags, and mood boards across browser sessions. This allows for client-side state persistence without the need for a backend database.

7. **Custom Hooks**: Hooks like `use-toast` provide custom logic that can be reused in multiple components. This promotes the DRY (Don't Repeat Yourself) principle and enhances code organization.

8. **Error Handling**: The AI assistant includes error handling logic that updates the UI with feedback when an error occurs during AI content generation.

9. **Responsive Design**: CSS and custom styling are used to create a responsive design, ensuring that the app looks and works well on different devices and screen sizes.

### Relationships Between Components

- **Parent-Child Relationship**: Components like `Tabs` and `TabsTrigger` have a direct parent-child relationship where the parent manages the state and behavior that is propagated to its children.
- **Provider-Consumer Relationship**: Context providers (`NotesProvider`, `AuthProvider`) at the top level of the app pass state down to consumer components that subscribe to context changes.
- **Composition**: Pages are composed of smaller UI components and containers, following the composition-over-inheritance principle in React.
- **API Integration**: The `AiAssistant.tsx` component encapsulates the logic for communicating with external APIs, separating concerns and making it easier to manage API interactions.

### Design Patterns and Principles

1. **Modular Design**: Components are designed to be self-contained and modular, making them reusable and easier to maintain.
2. **Single Responsibility Principle (SRP)**: Each component and hook has a single responsibility, whether it's presenting UI, managing state, or handling user input.
3. **Stateful vs. Stateless Components**: The app distinguishes between stateful components (e.g., pages and contexts) and stateless/dumb components (e.g., UI elements) to organize logic and presentation separately.
4. **High Cohesion and Low Coupling**: The architecture promotes high cohesion within components and low coupling between them, which simplifies updates and maintenance.
5. **Declarative UI**: React's declarative nature allows the UI to be defined in terms of state, with changes automatically propagated to the DOM.
6. **Async Data Management**: `React-Query` is used to manage asynchronous data fetching, caching, and synchronization, abstracting away the complexities of data handling.

### Overall Design

The overall architecture of Notara follows a modern React application structure, employing best practices such as hooks for managing side-effects, context for state management, and React Router for client-side navigation. The use of TypeScript enhances type safety and developer experience. Furthermore, the application's architecture is designed to be scalable, allowing for easy addition of new features and components while maintaining a clean and organized codebase.

## API Reference

## Notara APIs Documentation

This documentation covers the main APIs provided by the Notara note-taking application. The APIs described here enable interaction with the application's features, such as authentication, AI assistant communication, and note management.

### Authentication API

#### `signInWithGithub`

- **Description**: Authenticates a user with GitHub OAuth.
- **Function Signature**: `signInWithGithub(): Promise<unknown>`
- **Parameters**: None.
- **Return Value**: A promise that resolves with the authentication result or rejects with an error.
- **Example**:

```typescript
signInWithGithub()
  .then(response => console.log('Signed in with GitHub:', response))
  .catch(error => console.error('GitHub OAuth error:', error));
```

#### `signInWithEmail`

- **Description**: Authenticates a user with email and password.
- **Function Signature**: `signInWithEmail(email: string, password: string): Promise<unknown>`
- **Parameters**:
  - `email` (string): The user's email address.
  - `password` (string): The user's password.
- **Return Value**: A promise that resolves with the sign-in result or rejects with an error.
- **Example**:

```typescript
signInWithEmail('user@example.com', 'strongpassword123')
  .then(response => console.log('Signed in with email:', response))
  .catch(error => console.error('Email sign in error:', error));
```

#### `signUpWithEmail`

- **Description**: Registers a new user with email and password.
- **Function Signature**: `signUpWithEmail(email: string, password: string): Promise<unknown>`
- **Parameters**:
  - `email` (string): The new user's email address.
  - `password` (string): The new user's password.
- **Return Value**: A promise that resolves with the sign-up result or rejects with an error.
- **Example**:

```typescript
signUpWithEmail('newuser@example.com', 'securepassword123')
  .then(response => console.log('Signed up with email:', response))
  .catch(error => console.error('Email sign up error:', error));
```

#### `resetPassword`

- **Description**: Initiates a password reset for the given email.
- **Function Signature**: `resetPassword(email: string): Promise<unknown>`
- **Parameters**:
  - `email` (string): The email address of the user who wants to reset their password.
- **Return Value**: A promise that resolves with the password reset result.
- **Example**:

```typescript
resetPassword('user@example.com')
  .then(() => console.log('Password reset email sent'))
  .catch(error => console.error('Reset password error:', error));
```

#### `signOut`

- **Description**: Signs out the currently authenticated user.
- **Function Signature**: `signOut(): Promise<unknown>`
- **Parameters**: None.
- **Return Value**: A promise that resolves when the user is signed out.
- **Example**:

```typescript
signOut()
  .then(() => console.log('User signed out'))
  .catch(error => console.error('Sign out error:', error));
```

### AI Assistant API

#### `streamChatCompletion`

- **Description**: Streams chat completion responses from the Pollinations API.
- **Function Signature**: `streamChatCompletion(messages: Array<{ role: string, content: string }>, onChunkReceived: (chunk: string) => void): Promise<void>`
- **Parameters**:
  - `messages` (Array<{ role: string, content: string }>): An array of message objects with role (`system` or `user`) and content (string) properties.
  - `onChunkReceived` ((chunk: string) => void): A callback function that is called when a new chunk of data is received from the API.
- **Return Value**: A promise that resolves when the stream is complete or rejects with an error.
- **Example**:

```typescript
const messages = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: "Hello, can you help me?" }
];

streamChatCompletion(messages, (chunk) => {
  console.log('Received chunk:', chunk);
})
.catch(error => console.error('Error during streaming chat completion:', error));
```

### Note Management API

#### `useNotes`

- **Description**: A React hook to provide access to the notes context.
- **Function Signature**: `useNotes(): NotesContextTypes`
- **Parameters**: None.
- **Return Value**: The notes context, which includes methods for adding, updating, and deleting notes, as well as the list of notes themselves.
- **Example**:

```jsx
const { notes, addNote, updateNote, deleteNote } = useNotes();

// Add a new note
addNote({
  title: 'New Note',
  content: 'This is the content of the new note.',
  isPinned: false,
  tags: []
});
```

### Carousel Component API

#### `useEmblaCarousel`

- **Description**: A React hook to initialize and control the Embla carousel.
- **Function Signature**: `useEmblaCarousel(options?: CarouselOptions, plugins?: CarouselPlugin): [React.RefObject<HTMLDivElement>, CarouselApi]`
- **Parameters**:
  - `options` (CarouselOptions): Optional carousel settings.
  - `plugins` (CarouselPlugin): Optional plugins for extending carousel functionality.
- **Return Value**: An array containing a React ref object and the carousel API.
- **Example**:

```jsx
const [carouselRef, emblaApi] = useEmblaCarousel({
  loop: true
});

// Scroll to the next slide
emblaApi.scrollNext();
```

The provided documentation outlines the function signatures, parameters, return values, and examples for the main APIs of the Notara project. These APIs facilitate user authentication, AI assistant interactions, and note management, along with carousel control for user interface components.

## Usage Examples

Certainly, here are examples of how to use the main features of the Notara note-taking project, including code snippets and explanations for each feature.

### Authentication

#### Sign In with Email
```javascript
import { signInWithEmail } from 'path-to-authentication-service';

// Example usage
signInWithEmail('user@example.com', 'password123')
  .then(response => {
    // Handle successful authentication
    console.log('User signed in:', response);
  })
  .catch(error => {
    // Handle errors
    console.error('Sign in failed:', error);
  });
```
Here we use the `signInWithEmail` function to authenticate a user with their email and password. After calling the function, we handle the promise by logging the user in on success or catching any errors.

### AI Assistant Integration

#### Generate a Creative Writing Prompt
```javascript
import { streamChatCompletion } from 'path-to-ai-assistant-service';

// Example usage
const messages = [
  { role: "system", content: "SYSTEM_PROMPT" },
  { role: "user", content: "Generate a creative writing prompt." }
];

streamChatCompletion(messages, (chunk) => {
  // Handle each chunk of data received from the AI
  console.log('AI response:', chunk);
}).catch(error => {
  // Handle errors
  console.error('Error during AI interaction:', error);
});
```
In this example, we're using the `streamChatCompletion` function to communicate with an AI to generate a creative writing prompt. We pass an array of messages that includes a system prompt and a user request. The function streams the AI's response in chunks, which we handle in a callback function.

### Note Management

#### Add a New Note
```jsx
import { useNotes } from 'path-to-notes-context';

const NoteCreator = () => {
  const { addNote } = useNotes();

  // Function to call when adding a new note
  const handleAddNote = () => {
    const newNote = {
      title: 'New Note',
      content: 'This is a new note content.',
      isPinned: false,
      tags: ['tag1', 'tag2'],
    };
    addNote(newNote);
  };

  return (
    <button onClick={handleAddNote}>Add Note</button>
  );
};
```
This React component uses the `useNotes` hook to access the note management context. We define a `handleAddNote` function that creates a new note object and passes it to the `addNote` method provided by the context.

### Editor Settings

#### Toggle Spell Check
```jsx
import React, { useState } from 'react';
import { Switch } from 'path-to-ui-components';

const SpellCheckToggle = () => {
  const [spellCheck, setSpellCheck] = useState(true);

  return (
    <Switch 
      id="spellcheck" 
      checked={spellCheck} 
      onCheckedChange={setSpellCheck}
      label="Spell Check"
    />
  );
};
```
This component renders a `Switch` UI component to enable or disable spell check functionality within the editor. The state is managed by the `spellCheck` state variable, which is toggled through the `setSpellCheck` function.

### Markdown Cheatsheet

#### Render Markdown Cheatsheet Page
```jsx
import React from 'react';
import MarkdownCheatsheetPage from 'path-to-markdown-cheatsheet-page';

// Example usage in the application
const App = () => {
  return (
    <div>
      {/* Other components */}
      <MarkdownCheatsheetPage />
    </div>
  );
};
```
This snippet shows how to use the `MarkdownCheatsheetPage` component within the application. It renders a page that provides users with a reference for Markdown syntax, aiding them in creating well-formatted notes.

These examples cover different aspects of the Notara project, highlighting how to interact with its features programmatically or through UI components. Each snippet includes a brief explanation to help understand the context and purpose of the code.

