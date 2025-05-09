import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  FileText, Tag, Star, Image, MessageSquare, CheckSquare, 
  Calendar, ChevronLeft, Plus, Settings, ArrowUpRight, 
  LogIn, User, LogOut, UserCircle, Github, FileCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAuthenticated } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  const navItems = [
    { name: 'All Notes', icon: FileText, path: '/' },
    { name: 'Tags', icon: Tag, path: '/tags' },
    { name: 'Constellations', icon: Star, path: '/constellations' },
    { name: 'Mood Board', icon: Image, path: '/mood-board' },
    { name: 'AI Assistant', icon: MessageSquare, path: '/ai-assistant' },
    { name: 'To-Do', icon: CheckSquare, path: '/todos' },
    { name: 'Calendar', icon: Calendar, path: '/calendar' }
  ];

  const handleAuth = () => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleProfileSettings = () => {
    navigate('/settings/profile');
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return '?';
    
    const name = user.user_metadata?.full_name || user.email || '';
    if (!name) return '?';
    
    if (name.includes('@')) {
      // If it's an email, use first letter of email
      return name.substring(0, 1).toUpperCase();
    }
    
    // If it's a name, use initials
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Get display name for profile
  const getDisplayName = () => {
    if (!user) return 'Guest';
    
    return user.user_metadata?.full_name || 
           user.user_metadata?.name || 
           user.email?.split('@')[0] || 
           'User';
  };

  // Get authentication method
  const getAuthMethod = () => {
    if (!user) return '';
    
    if (user.app_metadata?.provider === 'github') {
      return 'GitHub';
    } else if (user.email) {
      return 'Email';
    }
    
    return '';
  };

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 h-screen transition-all duration-300 border-r border-border/30 backdrop-blur-md bg-card/80",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className={cn("h-full flex flex-col", !isOpen && "items-center")}>
        <div className="flex items-center justify-between p-4 border-b border-border/30 w-full">
          {isOpen ? (
            <>
              <Link to="/" className="flex items-center space-x-5">
                <div className="w-12 h-12 square-full bg-gradient-to-br from-cosmos-nebula to-cosmos-stardust cosmic-glow flex items-center justify-center">
                  <img src="/logo.png" alt="Notara Logo" className="w-16 h-16 object-cover glow-sm shadow-sm" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-cosmos-nebula bg-clip-text text-transparent">Notara</h2>
              </Link>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-secondary/50 transition-colors hover:scale-105"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsOpen(true)}
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-secondary/50 transition-colors hover:scale-105"
              >
            </Button>
          )}
        </div>
        
        {isOpen ? (
          <div className="p-6">
            <Button
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md 
                       bg-primary hover:bg-primary/90 transition-all duration-300 btn-glow
                       hover:translate-y-[-2px] hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </Button>
          </div>
        ) : (
          <div className="p-3">
            <Button
              className="w-10 h-10 flex items-center justify-center rounded-full 
                       bg-primary hover:bg-primary/90 transition-all duration-300 btn-glow
                       hover:translate-y-[-2px] hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
        
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

          <div className={cn("mt-6 pt-6 border-t border-border/30", !isOpen && "flex flex-col items-center")}>
            {isOpen && (
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Access
              </div>
            )}
            <Link
              to="/starred"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-secondary/30 hover:text-primary hover-grow",
                !isOpen && "justify-center px-2"
              )}
            >
              <Star className="w-5 h-5 text-cosmos-solar" />
              {isOpen && <span className="text-muted-foreground group-hover:text-primary">Starred Notes</span>}
            </Link>
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-secondary/30 hover:text-primary hover-grow",
                !isOpen && "justify-center px-2"
              )}
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
              {isOpen && <span className="text-muted-foreground group-hover:text-primary">Settings</span>}
            </Link>
            <Link
              to="/markdown-cheatsheet"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-secondary/30 hover:text-primary hover-grow",
                !isOpen && "justify-center px-2",
                location.pathname === '/markdown-cheatsheet' && "bg-primary/20 text-primary border-gradient"
              )}
            >
              <FileCode className={cn(
                "w-5 h-5",
                location.pathname === '/markdown-cheatsheet' ? "text-primary" : "text-muted-foreground"
              )} />
              {isOpen && (
                <span className={cn(
                  "text-muted-foreground group-hover:text-primary",
                  location.pathname === '/markdown-cheatsheet' && "text-primary"
                )}>Markdown Cheatsheet</span>
              )}
            </Link>
          </div>
        </nav>
        
        <div className={cn("p-4 border-t border-border/30", !isOpen && "w-full flex justify-center")}>
          {isAuthenticated ? (
            <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <div className={cn(
                  "flex items-center gap-3 p-2 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-all cursor-pointer glass-card",
                  !isOpen && "justify-center p-2 w-10 h-10"
                )}>
                  <Avatar className="h-10 w-10 cosmic-glow">
                    {user?.user_metadata?.avatar_url ? (
                      <AvatarImage src={user.user_metadata.avatar_url} alt={getDisplayName()} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-cosmos-nebula via-cosmos-aurora to-cosmos-stardust text-white">
                        {getUserInitials()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {isOpen && (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{getDisplayName()}</div>
                        {user?.email && (
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        )}
                      </div>
                      <div className="rounded-full p-1 hover:bg-secondary/50 transition-colors">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 backdrop-blur-md bg-card/90 border-border/50">
                <DropdownMenuLabel>
                  <div className="font-medium">Account</div>
                  {getAuthMethod() && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      {getAuthMethod() === 'GitHub' ? (
                        <Github className="h-3 w-3" />
                      ) : (
                        <UserCircle className="h-3 w-3" />
                      )}
                      <span>Signed in with {getAuthMethod()}</span>
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileSettings} className="cursor-pointer">
                  <UserCircle className="h-4 w-4 mr-2" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-500 focus:text-red-500">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-all cursor-pointer glass-card",
                    !isOpen && "justify-center p-2 w-10 h-10"
                  )}
                  onClick={handleAuth}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-cosmos-nebula via-cosmos-aurora to-cosmos-stardust text-white">
                      <LogIn className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  {isOpen && (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">Sign In</div>
                        <div className="text-xs text-muted-foreground truncate">Access your notes</div>
                      </div>
                      <div className="rounded-full p-1 hover:bg-secondary/50 transition-colors">
                        <LogIn className="h-4 w-4" />
                      </div>
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">Sign in to sync your notes</div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
