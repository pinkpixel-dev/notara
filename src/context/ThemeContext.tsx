import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';
import { AppFont, availableFonts, defaultFont, getFontStack, isAppFont } from '@/lib/fonts';

// Theme Types
export type ThemeMode = 'light' | 'midnight';
export type AccentColor = 'blue' | 'pink' | 'orange' | 'purple' | 'green';
export type VisualizationMode = 'constellation' | 'graph';

interface ThemeSettings {
  mode: ThemeMode;
  accentColor: AccentColor;
  visualizationMode: VisualizationMode;
  animations: boolean;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: AppFont;
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
  setFontFamily: (font: AppFont) => void;

  // Convenience functions
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settings: string) => boolean;

  // Theme metadata
  availableThemes: Array<{
    mode: ThemeMode;
    name: string;
    description: string;
    /** Solid swatch color for the theme picker. */
    swatch: string;
  }>;
  availableAccentColors: Array<{
    color: AccentColor;
    name: string;
    cssClass: string;
    hexValue: string;
  }>;
  availableFonts: typeof availableFonts;
}

// Default theme settings
const defaultSettings: ThemeSettings = {
  mode: 'midnight',
  accentColor: 'pink',
  visualizationMode: 'constellation',
  animations: true,
  fontSize: 'medium',
  fontFamily: defaultFont,
};

// Theme metadata
const availableThemes = [
  {
    mode: 'midnight' as ThemeMode,
    name: 'Midnight',
    description: 'Dark charcoal surfaces with crisp light text',
    swatch: '#141416',
  },
  {
    mode: 'light' as ThemeMode,
    name: 'Light',
    description: 'Soft white surfaces with dark text',
    swatch: '#f7f7f8',
  },
];

/**
 * Themes that no longer exist. Anyone whose stored setting names one is moved
 * to Midnight, which is the closest surviving dark theme.
 */
const retiredThemes: Record<string, ThemeMode> = {
  cosmic: 'midnight',
  aurora: 'midnight',
  frost: 'midnight',
};

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
      if (!saved) return defaultSettings;

      const parsed = JSON.parse(saved);
      if (typeof parsed?.mode === 'string' && parsed.mode in retiredThemes) {
        parsed.mode = retiredThemes[parsed.mode];
      }

      // glassIntensity was dropped with the glass surface system.
      delete parsed?.glassIntensity;

      if (!isAppFont(parsed?.fontFamily)) {
        delete parsed?.fontFamily;
      }

      return { ...defaultSettings, ...parsed };
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

      body.classList.remove('theme-light', 'theme-midnight');
      body.classList.remove(
        'accent-blue', 'accent-pink', 'accent-orange', 'accent-purple', 'accent-green'
      );

      body.classList.add(`theme-${settings.mode}`);
      body.classList.add(`accent-${settings.accentColor}`);

      root.style.setProperty('--app-font', getFontStack(settings.fontFamily));

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

      // The stylesheet keys off this class so the preference applies to every
      // transition and entrance animation, not just a handful of components.
      body.classList.toggle('motion-off', !settings.animations);
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

  const setFontFamily = (font: AppFont) => {
    setSettings(prev => ({ ...prev, fontFamily: font }));
    toast({
      title: "Font updated",
      description: `Now using ${availableFonts.find(f => f.id === font)?.name}`,
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
          mode: availableThemes.some(t => t.mode === imported.mode)
            ? imported.mode
            : retiredThemes[imported.mode] ?? defaultSettings.mode,
          accentColor: availableAccentColors.some(c => c.color === imported.accentColor) ? imported.accentColor : defaultSettings.accentColor,
          visualizationMode: ['constellation', 'graph'].includes(imported.visualizationMode) ? imported.visualizationMode : defaultSettings.visualizationMode,
          animations: typeof imported.animations === 'boolean' ? imported.animations : defaultSettings.animations,
          fontSize: ['small', 'medium', 'large'].includes(imported.fontSize) ? imported.fontSize : defaultSettings.fontSize,
          fontFamily: isAppFont(imported.fontFamily) ? imported.fontFamily : defaultSettings.fontFamily,
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
    setFontFamily,
    resetToDefaults,
    exportSettings,
    importSettings,
    availableThemes,
    availableAccentColors,
    availableFonts,
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
