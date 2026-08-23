import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  FileText, Image, MessageSquare, CheckSquare,
  Calendar, PanelLeftClose, PanelLeftOpen, Settings, FileCode, BookOpen, Sparkle, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  /**
   * `rail` is the desktop column, which can collapse to icons. `drawer` is the
   * mobile sheet, which is always expanded and has no collapse control because
   * the sheet itself is the thing being dismissed.
   */
  variant?: 'rail' | 'drawer';
  /** Called after any navigation, so the mobile drawer can close itself. */
  onNavigate?: () => void;
}

const navItems = [
  { name: 'Notes', icon: FileText, path: '/' },
  { name: 'To-Do', icon: CheckSquare, path: '/todos' },
  { name: 'Calendar', icon: Calendar, path: '/calendar' },
  { name: 'Vision Board', icon: Image, path: '/vision-board' },
  { name: 'Constellations', icon: Sparkle, path: '/constellations' },
  { name: 'AI Assistant', icon: MessageSquare, path: '/ai-assistant' },
];

/**
 * Tags lives in the header on desktop. There is no room for it there at phone
 * widths, so the drawer carries it instead.
 */
const drawerOnlyNavItems = [
  { name: 'Tags', icon: Tag, path: '/tags' },
];

const utilityItems = [
  { name: 'Settings', icon: Settings, to: '/settings' as const },
  { name: 'Markdown Cheatsheet', icon: FileCode, to: '/markdown-cheatsheet' as const },
];

const Sidebar = ({ isOpen, setIsOpen, variant = 'rail', onNavigate }: SidebarProps) => {
  const location = useLocation();
  const isDrawer = variant === 'drawer';
  // The drawer is never in the collapsed icon state.
  const expanded = isDrawer || isOpen;
  const items = isDrawer ? [...navItems, ...drawerOnlyNavItems] : navItems;

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-full flex-col surface-sidebar',
        !isDrawer && 'border-r border-border'
      )}
      aria-label="Main navigation"
    >
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-border p-3',
          expanded ? 'justify-between gap-2' : 'justify-center'
        )}
      >
        {expanded ? (
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3 rounded-md px-1 py-1 hover:bg-accent"
            onClick={onNavigate}
          >
            <img src="/logo.png" alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain" />
            <span className="truncate font-poppins text-lg font-semibold tracking-tight">Notara</span>
          </Link>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/"
                className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-accent"
                aria-label="Notara home"
                onClick={onNavigate}
              >
                <img src="/logo.png" alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Notara home</TooltipContent>
          </Tooltip>
        )}

        {!isDrawer && (
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
        )}
      </div>

      {!isDrawer && !isOpen && (
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
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            const link = (
              <Link
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                onClick={onNavigate}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  !expanded && 'justify-center px-0'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {expanded ? (
                  <span className="truncate">{item.name}</span>
                ) : (
                  <span className="sr-only">{item.name}</span>
                )}
                {isActive && expanded && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                )}
              </Link>
            );

            return (
              <li key={item.name}>
                {expanded ? (
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
          expanded ? 'flex-row items-center' : 'flex-col items-center'
        )}
      >
        {utilityItems.map((item) => (
          <Tooltip key={item.name}>
            <TooltipTrigger asChild>
              <Link
                to={item.to}
                aria-current={location.pathname === item.to ? 'page' : undefined}
                onClick={onNavigate}
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
            <TooltipContent side={expanded ? 'top' : 'right'}>{item.name}</TooltipContent>
          </Tooltip>
        ))}

        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://notara.site"
              target="_blank"
              rel="noreferrer"
              className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Documentation</span>
            </a>
          </TooltipTrigger>
          <TooltipContent side={expanded ? 'top' : 'right'}>Documentation</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
};

export default Sidebar;
