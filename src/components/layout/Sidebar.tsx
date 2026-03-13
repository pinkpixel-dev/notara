import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  FileText, Star, Image, MessageSquare, CheckSquare,
  Calendar, ChevronLeft, Plus, Settings, FileCode, BookOpen,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const location = useLocation();

  const navItems = [
    { name: 'Notes', icon: FileText, path: '/' },
    { name: 'Constellations', icon: Star, path: '/constellations' },
    { name: 'Vision Board', icon: Image, path: '/vision-board' },
    { name: 'AI Assistant', icon: MessageSquare, path: '/ai-assistant' },
    { name: 'To-Do', icon: CheckSquare, path: '/todos' },
    { name: 'Calendar', icon: Calendar, path: '/calendar' },
    { name: 'Tags', icon: Tag, path: '/tags' },
    { name: 'Starred Notes', icon: Star, path: '/starred' }
  ];

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 h-screen transition-all duration-300 border-r border-border/30 backdrop-blur-md bg-card/80",
        isOpen ? "w-64" : "w-20"
      )}
    >
      <div className={cn("h-full flex flex-col", !isOpen && "items-center")}>
        <div className="flex items-center justify-between p-4 border-b border-border/30 w-full">
          {isOpen ? (
            <>
              <Link to="/" className="flex items-center space-x-5">
                <div className="w-16 h-16 flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="Notara Logo"
                    className="w-20 h-20 object-cover"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))' }}
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight"
                  style={{
                    background: "linear-gradient(90deg, #22d3ee 0%, #fbbf24 55%, #f43f8e 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.52))",
                  }}
                >
                  Notara
              </h2>
              </Link>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-secondary/50 transition-colors hover:scale-105"
              >
                <ChevronLeft className="h-10 w-10" />
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsOpen(true)}
              variant="ghost"
              size="icon"
              className="w-16 h-16 flex items-center justify-center rounded-full hover:bg-secondary/40 transition-colors"
            >
                <img
                  src="/logo.png"
                  alt="Notara Logo"
                  className="h-14 w-14 object-cover"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.52))' }}
                />
            </Button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover-grow group",
                    isActive
                      ? "bg-primary/20 text-primary border-gradient"
                      : "hover:bg-secondary/30 hover:text-primary",
                    !isOpen && "justify-center px-2"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-all",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  {isOpen && (
                    <span className={cn(
                      "font-medium transition-all",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                    )}>{item.name}</span>
                  )}

                  {isActive && isOpen && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </Link>
              );
            })}
          </div>

        </nav>

        <div
          className={cn(
            "p-4 border-t border-border/30",
            isOpen
              ? "flex w-full items-center justify-start gap-3"
              : "w-full flex flex-col items-center gap-2"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/settings"
                className="group flex h-11 w-11 items-center justify-center rounded-full bg-secondary/30 backdrop-blur transition-all hover:bg-secondary/50 hover:scale-105"
                aria-label="Open settings"
              >
                <Settings className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                <span className="sr-only">Settings</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">Settings</div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="https://github.com/pinkpixel/notara#readme"
                target="_blank"
                rel="noreferrer"
                className="group flex h-11 w-11 items-center justify-center rounded-full bg-secondary/30 backdrop-blur transition-all hover:bg-secondary/50 hover:scale-105"
                aria-label="Open documentation"
              >
                <BookOpen className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                <span className="sr-only">Documentation</span>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">Docs</div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/markdown-cheatsheet"
                className={cn(
                  "group flex h-11 w-11 items-center justify-center rounded-full bg-secondary/30 backdrop-blur transition-all hover:bg-secondary/50 hover:scale-105",
                  location.pathname === '/markdown-cheatsheet' && "ring-2 ring-primary/50"
                )}
                aria-label="Open markdown cheatsheet"
              >
                <FileCode
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary",
                    location.pathname === '/markdown-cheatsheet' && "text-primary"
                  )}
                />
                <span className="sr-only">Markdown Cheatsheet</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">Markdown Cheatsheet</div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
