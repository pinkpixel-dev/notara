import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';

// Theme Types
export type ThemeMode = 'cosmic' | 'minimal-light' | 'midnight-modern' | 'frosted-glass';
export type AccentColor = 'blue' | 'pink' | 'orange' | 'purple' | 'green';
export type VisualizationMode = 'constellation' | 'graph';

interface ThemeSettings {
  mode: ThemeMode;
  accentColor: AccentColor;
  visualizationMode: VisualizationMode;
  animations: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

interface ThemeContextType {
  // Current theme settings
  settings: ThemeSettings;
  
  // Theme management
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  setVisualizationMode: (mode: VisualizationMode) => void;
  setAnimations: (enabled: boolean) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  
  // Convenience functions
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settings: string) => boolean;
  
  // Theme metadata
  availableThemes: Array<{
    mode: ThemeMode;
    name: string;
    description: string;
    preview: string;
  }>;
  availableAccentColors: Array<{
    color: AccentColor;
    name: string;
    cssClass: string;
    hexValue: string;
  }>;
}

// Default theme settings
const defaultSettings: ThemeSettings = {
  mode: 'cosmic',
  accentColor: 'blue',
  visualizationMode: 'constellation',
  animations: true,
  fontSize: 'medium',
};

// Theme metadata
const availableThemes = [
  {
    mode: 'cosmic' as ThemeMode,
    name: 'Cosmic',
    description: 'Original cosmic theme with space-inspired colors and animations',
    preview: 'linear-gradient(135deg, #121624, #9b87f5)',
  },
  {
    mode: 'minimal-light' as ThemeMode,
    name: 'Minimal Light',
    description: 'Clean, crisp white backgrounds with subtle accents',
    preview: 'linear-gradient(135deg, #ffffff, #f8fafc)',
  },
  {
    mode: 'midnight-modern' as ThemeMode,
    name: 'Midnight Modern',
    description: 'Sleek dark theme with vibrant accent colors',
    preview: 'linear-gradient(135deg, #0f172a, #1e293b)',
  },
  {
    mode: 'frosted-glass' as ThemeMode,
    name: 'Frosted Glass',
    description: 'Frosted glass effect with translucent panels',
    preview: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6))',
  },
];

const availableAccentColors = [
  {
    color: 'blue' as AccentColor,
    name: 'Ocean Blue',
    cssClass: 'accent-blue',
    hexValue: '#3b82f6',
  },
  {
    color: 'pink' as AccentColor,
    name: 'Rose Pink',
    cssClass: 'accent-pink',
    hexValue: '#ec4899',
  },
  {
    color: 'orange' as AccentColor,
    name: 'Sunset Orange',
    cssClass: 'accent-orange',
    hexValue: '#f97316',
  },
  {
    color: 'purple' as AccentColor,
    name: 'Royal Purple',
    cssClass: 'accent-purple',
    hexValue: '#8b5cf6',
  },
  {
    color: 'green' as AccentColor,
    name: 'Forest Green',
    cssClass: 'accent-green',
    hexValue: '#10b981',
  },
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    try {
      const saved = localStorage.getItem('notara-theme-settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch (error) {
      console.error('Error loading theme settings:', error);
      return defaultSettings;
    }
  });

  // Apply theme classes to document when settings change
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const body = document.body;

      // Remove all theme classes
      body.classList.remove(
        'theme-cosmic', 'theme-minimal-light', 'theme-midnight-modern', 'theme-frosted-glass'
      );

      // Remove all accent classes
      body.classList.remove(
        'accent-blue', 'accent-pink', 'accent-orange', 'accent-purple', 'accent-green'
      );

      // Apply theme mode class
      switch (settings.mode) {
        case 'cosmic':
          body.classList.add('theme-cosmic'); // Default cosmic theme
          break;
        case 'minimal-light':
          body.classList.add('theme-minimal-light');
          break;
        case 'midnight-modern':
          body.classList.add('theme-midnight-modern');
          break;
        case 'frosted-glass':
          body.classList.add('theme-frosted-glass');
          break;
      }

      // Apply accent color class
      body.classList.add(`accent-${settings.accentColor}`);

      // Apply font size
      root.classList.remove('text-sm', 'text-base', 'text-lg');
      switch (settings.fontSize) {
        case 'small':
          root.classList.add('text-sm');
          break;
        case 'medium':
          root.classList.add('text-base');
          break;
        case 'large':
          root.classList.add('text-lg');
          break;
      }

      // Apply animation preference
      if (!settings.animations) {
        root.style.setProperty('--animation-duration', '0ms');
      } else {
        root.style.removeProperty('--animation-duration');
      }
    };

    applyTheme();
  }, [settings]);

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('notara-theme-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving theme settings:', error);
    }
  }, [settings]);

  const setThemeMode = (mode: ThemeMode) => {
    setSettings(prev => ({ ...prev, mode }));
    toast({
      title: "Theme updated",
      description: `Switched to ${availableThemes.find(t => t.mode === mode)?.name}`,
    });
  };

  const setAccentColor = (color: AccentColor) => {
    setSettings(prev => ({ ...prev, accentColor: color }));
    toast({
      title: "Accent color updated",
      description: `Now using ${availableAccentColors.find(c => c.color === color)?.name}`,
    });
  };

  const setVisualizationMode = (mode: VisualizationMode) => {
    setSettings(prev => ({ ...prev, visualizationMode: mode }));
    toast({
      title: "Visualization mode updated",
      description: `Switched to ${mode === 'constellation' ? 'Constellation View' : 'Graph View'}`,
    });
  };

  const setAnimations = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, animations: enabled }));
    toast({
      title: `Animations ${enabled ? 'enabled' : 'disabled'}`,
      description: enabled ? "Smooth animations are now active" : "Animations have been reduced",
    });
  };

  const setFontSize = (size: 'small' | 'medium' | 'large') => {
    setSettings(prev => ({ ...prev, fontSize: size }));
    toast({
      title: "Font size updated",
      description: `Font size set to ${size}`,
    });
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    toast({
      title: "Settings reset",
      description: "All theme settings have been reset to defaults",
    });
  };

  const exportSettings = (): string => {
    try {
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.error('Error exporting settings:', error);
      return '';
    }
  };

  const importSettings = (settingsString: string): boolean => {
    try {
      const imported = JSON.parse(settingsString);
      
      // Validate the imported settings
      if (typeof imported === 'object' && imported !== null) {
        const validSettings: ThemeSettings = {
          mode: availableThemes.some(t => t.mode === imported.mode) ? imported.mode : defaultSettings.mode,
          accentColor: availableAccentColors.some(c => c.color === imported.accentColor) ? imported.accentColor : defaultSettings.accentColor,
          visualizationMode: ['constellation', 'graph'].includes(imported.visualizationMode) ? imported.visualizationMode : defaultSettings.visualizationMode,
          animations: typeof imported.animations === 'boolean' ? imported.animations : defaultSettings.animations,
          fontSize: ['small', 'medium', 'large'].includes(imported.fontSize) ? imported.fontSize : defaultSettings.fontSize,
        };
        
        setSettings(validSettings);
        toast({
          title: "Settings imported",
          description: "Theme settings have been imported successfully",
        });
        return true;
      }
    } catch (error) {
      console.error('Error importing settings:', error);
    }
    
    toast({
      title: "Import failed",
      description: "Invalid settings format",
      variant: "destructive",
    });
    return false;
  };

  const contextValue: ThemeContextType = {
    settings,
    setThemeMode,
    setAccentColor,
    setVisualizationMode,
    setAnimations,
    setFontSize,
    resetToDefaults,
    exportSettings,
    importSettings,
    availableThemes,
    availableAccentColors,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;