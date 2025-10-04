import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotesProvider } from "./context/NotesContext";
import { AuthProvider } from "./context/AuthContext";
import { TodoProvider } from "./context/TodoContext";
import { ThemeProvider } from "./context/ThemeContext";
import { FileSystemProvider } from "./context/FileSystemContext";
import HomePage from "./pages/HomePage";
import TagsPage from "./pages/TagsPage";
import ConstellationsPage from "./pages/ConstellationsPage";
import VisionBoardPage from "./pages/VisionBoardPage";
import AiAssistantPage from "./pages/AiAssistantPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import NotFound from "./pages/NotFound";
import MarkdownCheatsheetPage from "./pages/MarkdownCheatsheetPage";
import NoteViewPage from "./pages/NoteViewPage";
import AuthPage from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import TodoPage from "./pages/TodoPage";
import StarredNotesPage from "./pages/StarredNotesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FileSystemProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotesProvider>
              <TodoProvider>
                <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/constellations" element={<ConstellationsPage />} />
                <Route path="/vision-board" element={<VisionBoardPage />} />
                <Route path="/ai-assistant" element={<AiAssistantPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/profile" element={<ProfileSettingsPage />} />
                <Route path="/markdown-cheatsheet" element={<MarkdownCheatsheetPage />} />
                <Route path="/note/:id" element={<NoteViewPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="/todos" element={<TodoPage />} />
                <Route path="/starred" element={<StarredNotesPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
                </BrowserRouter>
              </TodoProvider>
            </NotesProvider>
          </AuthProvider>
        </ThemeProvider>
      </FileSystemProvider>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
