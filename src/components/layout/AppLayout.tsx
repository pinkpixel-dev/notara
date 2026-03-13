import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, BookOpen, Settings, Menu, Tag, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
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
  const isOnTagsPage = location.pathname.startsWith('/tags');
  const isOnStarredPage = location.pathname.startsWith('/starred');

  return (
    <div className="h-screen flex overflow-hidden font-poppins">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className={cn(
        "flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300",
        isSidebarOpen ? "ml-64" : "ml-0"
      )}>
        <header className="px-4 py-3 flex justify-between items-center border-b border-border/30 bg-gradient-to-r from-card/90 via-background/70 to-card/90 backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <Button
                onClick={() => setIsSidebarOpen(true)}
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-secondary/50 transition-colors hover:scale-105"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <AppMenuBar />
            <StorageStatusBadge />

          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full hover:bg-secondary/50 transition-all hover:scale-105",
                    isOnTagsPage && "bg-secondary/60 text-primary"
                  )}
                  aria-label="Open tags"
                >
                  <Link to="/tags">
                    <Tag className="h-5 w-5" />
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
                  className={cn(
                    "rounded-full hover:bg-secondary/50 transition-all hover:scale-105",
                    isOnStarredPage && "bg-secondary/60 text-primary"
                  )}
                  aria-label="Open starred notes"
                >
                  <Link to="/starred">
                    <Star className="h-5 w-5" />
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
                  className="rounded-full hover:bg-secondary/50 transition-all hover:scale-105"
                  aria-label="Search notes"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-secondary/50 transition-all hover:scale-105"
                >
                  <a
                    href="https://github.com/pinkpixel/notara#readme"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open documentation"
                  >
                    <BookOpen className="h-5 w-5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Docs</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/settings">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-secondary/50 transition-all hover:scale-105"
                    aria-label="Open settings"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full animate-fade-in"
          >
            {children}
          </ResizablePanelGroup>
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
