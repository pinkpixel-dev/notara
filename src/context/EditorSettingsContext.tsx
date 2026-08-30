/* eslint-disable react-refresh/only-export-components */
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const EDITOR_SETTINGS_STORAGE_KEY = 'notara-editor-settings';

export interface EditorSettings {
  autoSave: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  autoSave: false,
};

interface EditorSettingsContextValue {
  settings: EditorSettings;
  setAutoSave: (enabled: boolean) => void;
  resetEditorSettings: () => void;
}

const EditorSettingsContext = createContext<EditorSettingsContextValue | undefined>(undefined);

export const parseEditorSettings = (storedValue: string | null): EditorSettings => {
  if (!storedValue) return DEFAULT_EDITOR_SETTINGS;

  try {
    const parsed: unknown = JSON.parse(storedValue);

    if (
      typeof parsed === 'object'
      && parsed !== null
      && 'autoSave' in parsed
      && typeof parsed.autoSave === 'boolean'
    ) {
      return { autoSave: parsed.autoSave };
    }
  } catch {
    // Invalid saved settings use the safe, opt-in default below.
  }

  return DEFAULT_EDITOR_SETTINGS;
};

interface EditorSettingsProviderProps {
  children: ReactNode;
}

export const EditorSettingsProvider: React.FC<EditorSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<EditorSettings>(() => {
    try {
      return parseEditorSettings(localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY));
    } catch {
      return DEFAULT_EDITOR_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(EDITOR_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving editor settings:', error);
    }
  }, [settings]);

  const setAutoSave = (enabled: boolean) => {
    setSettings({ autoSave: enabled });
  };

  const resetEditorSettings = () => {
    setSettings(DEFAULT_EDITOR_SETTINGS);
  };

  return (
    <EditorSettingsContext.Provider value={{ settings, setAutoSave, resetEditorSettings }}>
      {children}
    </EditorSettingsContext.Provider>
  );
};

export const useEditorSettings = (): EditorSettingsContextValue => {
  const context = useContext(EditorSettingsContext);

  if (!context) {
    throw new Error('useEditorSettings must be used within an EditorSettingsProvider');
  }

  return context;
};
