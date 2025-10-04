
import React, { useState, useEffect } from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Palette } from 'lucide-react';

interface Theme {
  name: string;
  class: string;
  icon: React.ReactNode;
}

const themes: Theme[] = [
  {
    name: "Cosmic",
    class: "theme-cosmic",
    icon: <div className="w-5 h-5 rounded-full bg-[#9b87f5] cosmic-glow" />
  },
  {
    name: "Nebula",
    class: "theme-nebula",
    icon: <div className="w-5 h-5 rounded-full bg-[#0EA5E9] nebula-glow" />
  },
  {
    name: "Emerald Galaxy",
    class: "theme-emerald",
    icon: <div className="w-5 h-5 rounded-full bg-[#10B981]" />
  },
  {
    name: "Ultraviolet",
    class: "theme-ultraviolet",
    icon: <div className="w-5 h-5 rounded-full bg-[#D946EF] nova-glow" />
  },
  {
    name: "Solar (Light)",
    class: "theme-solar",
    icon: <div className="w-5 h-5 rounded-full bg-[#F97316] solar-glow" />
  }
];

const ThemeSwitcher = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

  useEffect(() => {
    // Apply default theme on first load
    document.body.classList.add('theme-cosmic');
    
    const savedTheme = localStorage.getItem('notara-theme');
    if (savedTheme) {
      const theme = themes.find(t => t.class === savedTheme);
      if (theme) {
        setTheme(theme);
      }
    }
  }, []);

  const setTheme = (theme: Theme) => {
    // Remove all theme classes
    themes.forEach(t => {
      document.body.classList.remove(t.class);
    });
    
    // Add the selected theme class
    document.body.classList.add(theme.class);
    
    localStorage.setItem('notara-theme', theme.class);
    setCurrentTheme(theme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary/50 transition-all duration-300 hover:scale-105">
        <div className="flex items-center gap-2">
          {currentTheme.icon}
          <span className="hidden md:inline font-medium">{currentTheme.name}</span>
        </div>
        <Palette className="h-4 w-4 ml-1" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="animate-fade-in rounded-xl border border-primary/20 bg-card/95 backdrop-blur-sm">
        {themes.map((theme) => (
          <DropdownMenuItem 
            key={theme.name} 
            onClick={() => setTheme(theme)}
            className="flex items-center gap-3 hover:bg-primary/10 rounded-md transition-all duration-200 hover:translate-x-1"
          >
            {theme.icon}
            {theme.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSwitcher;
