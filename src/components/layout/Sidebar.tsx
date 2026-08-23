import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { BookOpen, Tag } from 'lucide-react';
import { SECTIONS } from './SectionTabs';
import { DOCUMENTATION_URL, UTILITY_LINKS } from './HeaderUtilityMenu';

interface SidebarProps {
  /** Called after any navigation, so the drawer can close itself. */
  onNavigate?: () => void;
}

/**
 * The mobile navigation drawer.
 *
 * This used to be the desktop navigation column as well. That column is gone:
 * five links that never change did not justify 256 pixels beside the notes
 * tree, and they live in the header now. Below the mobile breakpoint the header
 * has no room for them, so the drawer is where they go.
 *
 * Everything reachable from the desktop header is reachable here, including the
 * entries that collapse into the header's overflow menu. A drawer carrying only
 * some of the destinations would leave the rest unreachable on a phone.
 */
const Sidebar = ({ onNavigate }: SidebarProps) => {
  const location = useLocation();

  const isCurrent = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const entryClass = (active: boolean) =>
    cn(
      'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active
        ? 'bg-accent text-primary'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
    );

  return (
    <div className="flex h-full min-h-0 w-full flex-col surface-sidebar">
      <div className="flex shrink-0 items-center border-b border-border p-3">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3 rounded-md px-1 py-1 hover:bg-accent"
          onClick={onNavigate}
        >
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="truncate font-poppins text-lg font-semibold tracking-tight">
            Notara
          </span>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Main navigation">
        <ul className="space-y-1">
          {SECTIONS.map((section) => (
            <li key={section.path}>
              <Link
                to={section.path}
                aria-current={isCurrent(section.path) ? 'page' : undefined}
                onClick={onNavigate}
                className={entryClass(isCurrent(section.path))}
              >
                <section.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="truncate">{section.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        <hr className="my-2 border-border" />

        <ul className="space-y-1">
          {/* Tags sits in the header on desktop and has no room there on a
              phone, so the drawer carries it. */}
          <li>
            <Link
              to="/tags"
              aria-current={isCurrent('/tags') ? 'page' : undefined}
              onClick={onNavigate}
              className={entryClass(isCurrent('/tags'))}
            >
              <Tag className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">Tags</span>
            </Link>
          </li>

          {UTILITY_LINKS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={isCurrent(item.to) ? 'page' : undefined}
                onClick={onNavigate}
                className={entryClass(isCurrent(item.to))}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.name}</span>
              </Link>
            </li>
          ))}

          <li>
            <a
              href={DOCUMENTATION_URL}
              target="_blank"
              rel="noreferrer"
              className={entryClass(false)}
              onClick={onNavigate}
            >
              <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">Documentation</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
