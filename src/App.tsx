import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { NotesProvider } from "./context/NotesContext";
import { TodoProvider } from "./context/TodoContext";
import { ThemeProvider } from "./context/ThemeContext";
import { FileSystemProvider } from "./context/FileSystemContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import HomePage from "./pages/HomePage";
import TagsPage from "./pages/TagsPage";
import ConstellationsPage from "./pages/ConstellationsPage";
import VisionBoardPage from "./pages/VisionBoardPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import MarkdownCheatsheetPage from "./pages/MarkdownCheatsheetPage";
import NoteViewPage from "./pages/NoteViewPage";
import TodoPage from "./pages/TodoPage";
import { removeLegacyCredentialStorage } from "./lib/legacy-cleanup";

const queryClient = new QueryClient();

/**
 * A data router, rather than `BrowserRouter`.
 *
 * `useBlocker` only works under one of these, and blocking is how the notes
 * page stops a section change from throwing away unsaved edits. The providers
 * stay outside it: none of them use router hooks, and the pages below still
 * see every context.
 */
const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/tags", element: <TagsPage /> },
  { path: "/constellations", element: <ConstellationsPage /> },
  { path: "/vision-board", element: <VisionBoardPage /> },
  { path: "/calendar", element: <CalendarPage /> },
  { path: "/settings", element: <SettingsPage /> },
  { path: "/markdown-cheatsheet", element: <MarkdownCheatsheetPage /> },
  { path: "/note/:id", element: <NoteViewPage /> },
  { path: "/todos", element: <TodoPage /> },
  { path: "*", element: <NotFound /> },
]);

const App = () => {
  useEffect(() => {
    removeLegacyCredentialStorage();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FileSystemProvider>
        <WorkspaceProvider>
        <ThemeProvider>
          <NotesProvider>
            <TodoProvider>
              <RouterProvider router={router} />
            </TodoProvider>
          </NotesProvider>
        </ThemeProvider>
        </WorkspaceProvider>
      </FileSystemProvider>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
import { useEffect } from "react";
