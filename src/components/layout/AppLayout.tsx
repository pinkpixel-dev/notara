import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, BookOpen, Settings, Tag, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import AppMenuBar from './AppMenuBar';
import StorageStatusBadge from './StorageStatusBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const isOnTagsPage = location.pathname.startsWith('/tags');
  const isOnStarredPage = location.pathname.startsWith('/starred');

  const triggerSearchFocus = useCallback(() => {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('notara:focus-note-search'));
    }, 0);
  }, []);

  const handleSearchNotes = useCallback(() => {
    if (location.pathname !== '/') {
      navigate('/');
    }
    triggerSearchFocus();
  }, [location.pathname, navigate, triggerSearchFocus]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier || event.key.toLowerCase() !== 'k') {
        return;
      }
      event.preventDefault();
      handleSearchNotes();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSearchNotes]);

  return (
    /* A two-column grid keeps the main area beside the sidebar at every width.
       The column width comes from the same token the sidebar renders at, so
       the two can never disagree. Grid columns are not transitioned, because
       animating a layout property is both janky and against the design rules. */
    <div
      className="grid h-screen w-full overflow-hidden surface-app"
      style={{
        gridTemplateColumns: `${
          isSidebarOpen ? 'var(--app-sidebar-width)' : 'var(--app-sidebar-width-collapsed)'
        } minmax(0, 1fr)`,
      }}
    >
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex min-w-0 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border surface-toolbar px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <AppMenuBar />
            <StorageStatusBadge />
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={cn('h-11 w-11', isOnTagsPage && 'bg-accent text-primary')}
                  aria-label="Open tags"
                >
                  <Link to="/tags" aria-current={isOnTagsPage ? 'page' : undefined}>
                    <Tag className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tags</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={cn('h-11 w-11', isOnStarredPage && 'bg-accent text-primary')}
                  aria-label="Open starred notes"
                >
                  <Link to="/starred" aria-current={isOnStarredPage ? 'page' : undefined}>
                    <Star className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Starred Notes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11"
                  aria-label="Search notes"
                  aria-keyshortcuts="Control+K Meta+K"
                  onClick={handleSearchNotes}
                >
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search notes</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {children}
          </ResizablePanelGroup>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
