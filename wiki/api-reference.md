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
  { role: "system", content: "SYSTEM_PROMPT" },
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