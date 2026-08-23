import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Menu, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import AppMenuBar from './AppMenuBar';
import StorageStatusBadge from './StorageStatusBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnTagsPage = location.pathname.startsWith('/tags');

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

  // Leaving the mobile breakpoint should not strand an open drawer over the
  // desktop layout.
  useEffect(() => {
    if (!isMobile) {
      setIsDrawerOpen(false);
    }
  }, [isMobile]);

  return (
    /* A two-column grid keeps the main area beside the sidebar at every width.
       The column width comes from the same token the sidebar renders at, so
       the two can never disagree. Grid columns are not transitioned, because
       animating a layout property is both janky and against the design rules. */
    <div
      className="grid h-screen w-full overflow-hidden surface-app"
      style={{
        gridTemplateColumns: isMobile
          ? 'minmax(0, 1fr)'
          : `${
              isSidebarOpen ? 'var(--app-sidebar-width)' : 'var(--app-sidebar-width-collapsed)'
            } minmax(0, 1fr)`,
      }}
    >
      {isMobile ? (
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent side="left" className="w-[17rem] max-w-[85vw] p-0 surface-sidebar">
            <SheetTitle className="sr-only">Main navigation</SheetTitle>
            <Sidebar
              isOpen
              setIsOpen={setIsSidebarOpen}
              variant="drawer"
              onNavigate={() => setIsDrawerOpen(false)}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      )}

      <main className="flex min-w-0 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border surface-toolbar px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            {isMobile && (
              <Button
                onClick={() => setIsDrawerOpen(true)}
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Open navigation menu"
                aria-expanded={isDrawerOpen}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            )}
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
                  className={cn(
                    'hidden h-11 w-11 md:inline-flex',
                    isOnTagsPage && 'bg-accent text-primary'
                  )}
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
                  variant="ghost"
                  size="icon"
                  className="hidden h-11 w-11 md:inline-flex"
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

        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
