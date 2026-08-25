import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Search, Tag } from 'lucide-react';
import MigrationDialog from '@/components/notes/MigrationDialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import AppMenuBar from './AppMenuBar';
import StorageStatusBadge from './StorageStatusBadge';
import SectionTabs from './SectionTabs';
import HeaderUtilityMenu from './HeaderUtilityMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AiPanel from '@/components/ai/AiPanel';
import AiPanelToggle from '@/components/ai/AiPanelToggle';
import { useAiPanel } from '@/hooks/use-ai-panel';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * The application shell.
 *
 * One horizontal bar and one vertical one. Section navigation sits in the
 * header, which leaves the whole left side to whatever the current section
 * needs. On the notes screen that is the notes tree, which is the thing that
 * actually wanted the vertical space.
 *
 * Below the mobile breakpoint the header cannot hold five tabs as well as the
 * File menu, so a drawer takes over. A bottom tab bar was the alternative and
 * was turned down: the mobile layout already carries a header and a pane
 * switcher, and a third horizontal bar would spend the scarcest vertical space
 * in the app on navigation that is one tap away either way.
 */
const AppLayout = ({ children }: AppLayoutProps) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnTagsPage = location.pathname.startsWith('/tags');
  const aiPanel = useAiPanel();
  // Pulled out because the hook returns a fresh object every render, and the
  // shortcut listener should not be torn down and rebound on each one.
  const { toggle: toggleAiPanel } = aiPanel;

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
      if (!isModifier) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'k') {
        event.preventDefault();
        handleSearchNotes();
        return;
      }

      // J rather than a letter that stands for something. Every obvious
      // candidate is taken: K is search, S saves, O imports, and A is select
      // all inside the editor.
      if (key === 'j') {
        event.preventDefault();
        toggleAiPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSearchNotes, toggleAiPanel]);

  // Leaving the mobile breakpoint should not strand an open drawer over the
  // desktop layout.
  useEffect(() => {
    if (!isMobile) {
      setIsDrawerOpen(false);
    }
  }, [isMobile]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden surface-app">
      {/* Padding and gaps tighten below 640 pixels. At 320 the hamburger, the
          File menu, and the right-hand controls together came to 334 pixels
          against 320 of header, and nothing in a header may be clipped. */}
      <header className="flex shrink-0 items-center gap-1 border-b border-border surface-toolbar px-2 py-2 sm:gap-2 sm:px-3">
        {/* Everything left of the divider, in one element so its width can be
            watched. The divider's position depends on how wide the wordmark and
            the File menu render, which changes when webfonts arrive and again
            whenever the interface font is changed in Settings. The notes sidebar
            lines up with that divider, so it has to follow those moves rather
            than be measured once. */}
        <div data-nav-leading="" className="flex shrink-0 items-center gap-1 sm:gap-2">
        {isMobile ? (
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
        ) : (
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src="/logo.png"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 shrink-0 object-contain"
            />
            {/* Deliberately a step above the menu's `text-sm`, so the brand
                reads as the brand rather than as another menu entry. The
                wordmark is still the first thing to go when width runs short;
                the logo alone identifies the app. */}
            <span className="hidden font-poppins text-lg font-semibold tracking-tight lg:inline">
              Notara
            </span>
          </Link>
        )}

        <AppMenuBar />
        </div>

        {/* Decorative, so it is hidden from assistive technology. The nav
            landmark inside SectionTabs is what announces the boundary. The
            side margins are what set the sections apart from the File menu
            rather than letting them read as one long row of controls. */}
        <span
          aria-hidden="true"
          data-nav-divider=""
          className="hidden h-6 w-px shrink-0 bg-border md:mx-2 md:block"
        />

        <SectionTabs />

        {/* The only flexible item, so it both pushes the controls right and
            stops the tabs from stretching to fill the bar. */}
        <div className="min-w-0 flex-1" />

        <div className="flex shrink-0 items-center gap-1">
          <StorageStatusBadge />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden shrink-0 md:inline-flex"
                aria-label="Search notes"
                aria-keyshortcuts="Control+K Meta+K"
                onClick={handleSearchNotes}
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search notes</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className={cn(
                  'hidden shrink-0 md:inline-flex',
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

          <AiPanelToggle isOpen={aiPanel.isOpen} onToggle={aiPanel.toggle} />

          <HeaderUtilityMenu />
        </div>
      </header>

      {isMobile && (
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent side="left" className="w-[17rem] max-w-[85vw] p-0 surface-sidebar">
            <SheetTitle className="sr-only">Main navigation</SheetTitle>
            <Sidebar onNavigate={() => setIsDrawerOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* The section and the assistant share this row. The section keeps
          `min-w-0` so a wide note cannot push the panel off the screen, and the
          panel renders nothing at all while it is closed on desktop. */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
        <AiPanel panel={aiPanel} />
      </div>

      {/* Rendered from the layout rather than the notes page, because the app
          can open on any section and old notes are worth offering wherever the
          user landed. It renders nothing when there is nothing to import. */}
      <MigrationDialog />
    </div>
  );
};

export default AppLayout;
