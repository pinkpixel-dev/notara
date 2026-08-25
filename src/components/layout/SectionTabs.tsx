import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, CheckSquare, FileText, Image, Sparkle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * The sections of the app.
 *
 * The assistant is deliberately not here. It is a panel that opens beside any
 * of these rather than a place you go, so it has its own header toggle next to
 * the other panel controls instead of a tab of its own.
 */
export const SECTIONS = [
  { name: 'Notes', icon: FileText, path: '/' },
  { name: 'To-Do', icon: CheckSquare, path: '/todos' },
  { name: 'Calendar', icon: Calendar, path: '/calendar' },
  { name: 'Vision Board', icon: Image, path: '/vision-board' },
  { name: 'Constellations', icon: Sparkle, path: '/constellations' },
] as const;

/**
 * Section navigation, across the header.
 *
 * These five links never change, so they do not deserve a column of their own.
 * Putting them in the header frees the whole left side for the notes tree.
 *
 * Labels appear from 1280 pixels up. Between the mobile breakpoint and there,
 * the tabs are icons with tooltips, because five labels plus the File menu plus
 * the right-hand controls do not fit and a wrapped nav is not an option. Below
 * the mobile breakpoint this is hidden entirely and the drawer takes over.
 */
const SectionTabs: React.FC = () => {
  const location = useLocation();

  return (
    <nav aria-label="Sections" className="hidden min-w-0 md:block">
      <ul className="flex items-center gap-0.5">
        {SECTIONS.map((section) => {
          const isActive =
            section.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(section.path);

          const link = (
            <Link
              to={section.path}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-accent text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <section.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {/* One element, not two. `sr-only` below 1280 keeps the name
                  available to assistive technology while the tab shows as an
                  icon; `not-sr-only` brings it back visually above that. A
                  second hidden copy would be announced alongside the visible
                  one, so every section read out twice. */}
              <span className="sr-only xl:not-sr-only">{section.name}</span>
            </Link>
          );

          return (
            <li key={section.path}>
              {/* One link, always tooltip-wrapped. Rendering a second copy for
                  the wide layout would double the tab stops and repeat
                  `aria-current` for every section. */}
              <Tooltip>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent>{section.name}</TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default SectionTabs;
