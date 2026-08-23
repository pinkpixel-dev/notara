import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  FileText, Star, Image, MessageSquare, CheckSquare,
  Calendar, PanelLeftClose, PanelLeftOpen, Settings, FileCode, BookOpen, Sparkle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navItems = [
  { name: 'Notes', icon: FileText, path: '/' },
  { name: 'To-Do', icon: CheckSquare, path: '/todos' },
  { name: 'Calendar', icon: Calendar, path: '/calendar' },
  { name: 'Vision Board', icon: Image, path: '/vision-board' },
  { name: 'Constellations', icon: Sparkle, path: '/constellations' },
  { name: 'AI Assistant', icon: MessageSquare, path: '/ai-assistant' },
];

const utilityItems = [
  { name: 'Settings', icon: Settings, to: '/settings' as const },
  { name: 'Markdown Cheatsheet', icon: FileCode, to: '/markdown-cheatsheet' as const },
];

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const location = useLocation();

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col surface-sidebar border-r border-border"
      aria-label="Main navigation"
    >
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-border p-3',
          isOpen ? 'justify-between gap-2' : 'justify-center'
        )}
      >
        {isOpen ? (
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3 rounded-md px-1 py-1 hover:bg-accent"
          >
            <img src="/logo.png" alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain" />
            <span className="truncate text-lg font-semibold tracking-tight">Notara</span>
          </Link>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/"
                className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent"
                aria-label="Notara home"
              >
                <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Notara home</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              variant="ghost"
              size="icon"
              className={cn('h-11 w-11 shrink-0', !isOpen && 'hidden')}
              aria-label="Collapse sidebar"
              aria-expanded={isOpen}
            >
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Collapse sidebar</TooltipContent>
        </Tooltip>
      </div>

      {!isOpen && (
        <div className="flex shrink-0 justify-center border-b border-border p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsOpen(true)}
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                aria-label="Expand sidebar"
                aria-expanded={false}
              >
                <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      )}

      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const link = (
              <Link
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  !isOpen && 'justify-center px-0'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {isOpen ? (
                  <span className="truncate">{item.name}</span>
                ) : (
                  <span className="sr-only">{item.name}</span>
                )}
                {isActive && isOpen && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                )}
              </Link>
            );

            return (
              <li key={item.name}>
                {isOpen ? (
                  link
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  </Tooltip>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={cn(
          'flex shrink-0 gap-1 border-t border-border p-2',
          isOpen ? 'flex-row items-center' : 'flex-col items-center'
        )}
      >
        {utilityItems.map((item) => (
          <Tooltip key={item.name}>
            <TooltipTrigger asChild>
              <Link
                to={item.to}
                aria-current={location.pathname === item.to ? 'page' : undefined}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-md transition-colors',
                  location.pathname === item.to
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">{item.name}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side={isOpen ? 'top' : 'right'}>{item.name}</TooltipContent>
          </Tooltip>
        ))}

        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://github.com/pinkpixel-dev/notara#readme"
              target="_blank"
              rel="noreferrer"
              className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Documentation</span>
            </a>
          </TooltipTrigger>
          <TooltipContent side={isOpen ? 'top' : 'right'}>Documentation</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
};

export default Sidebar;
