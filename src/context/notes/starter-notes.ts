/**
 * The notes a brand new workspace starts with.
 *
 * These are written as real Markdown files the first time Notara is pointed at
 * an empty folder, so a fresh workspace has something in it and the files are
 * ordinary notes the user can edit or delete like any other. The copy is
 * unchanged from the versions that shipped as JSON records.
 */

export interface StarterNote {
  title: string;
  content: string;
  pinned: boolean;
}

export const STARTER_NOTES: StarterNote[] = [
  {
    title: 'Welcome to Notara',
    pinned: true,
    content: `# Welcome to Notara!

Notara is an AI assisted note-taking app and markdown editor designed to help you capture ideas, organize your thoughts, and visualize connections between your notes.

## Features
- Write in Markdown
- Organize with tags
- Visualize connections with Constellation View
- Create vision boards
- Use AI assistance

Get started by creating your first note!`,
  },
  {
    title: 'Markdown Cheat Sheet',
    pinned: false,
    content: `# Markdown Cheat Sheet

## Headers
# H1
## H2
### H3

## Emphasis
*italic*
**bold**
~~strikethrough~~

## Lists
- Item 1
- Item 2
  - Subitem

1. Item 1
2. Item 2

## Links & Images
[Link](https://example.com)
![Image Alt](https://example.com/image.jpg)

## Code
\`inline code\`

\`\`\`
// code block
function hello() {
  console.log("Hello Notara!");
}
\`\`\`

## Blockquotes
> This is a blockquote

## Tables
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`,
  },
];
