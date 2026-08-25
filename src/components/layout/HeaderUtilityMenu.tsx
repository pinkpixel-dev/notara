import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, FileCode, MoreVertical, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** In-app destinations that are not sections. */
export const UTILITY_LINKS = [
  { name: 'Settings', icon: Settings, to: '/settings' },
  { name: 'Markdown Cheat Sheet', icon: FileCode, to: '/markdown-cheatsheet' },
] as const;

export const DOCUMENTATION_URL = 'https://notara.site';

/**
 * The header's overflow menu.
 *
 * These used to sit along the bottom of the navigation sidebar. That column is
 * gone, and they are not frequent enough to each earn a permanent icon beside
 * the section tabs, so they collapse into one menu. Everything here is reachable
 * by keyboard, and each entry keeps its own icon so the menu is scannable rather
 * than a wall of text.
 */
const HeaderUtilityMenu: React.FC = () => {
  const location = useLocation();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More" className="shrink-0">
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>More</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-56">
        {UTILITY_LINKS.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link
              to={item.to}
              aria-current={location.pathname === item.to ? 'page' : undefined}
              className="flex items-center gap-2"
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.name}</span>
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a
            href={DOCUMENTATION_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Documentation</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HeaderUtilityMenu;
