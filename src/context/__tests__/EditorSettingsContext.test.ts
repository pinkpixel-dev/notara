import { describe, expect, it } from 'vitest';
import { DEFAULT_EDITOR_SETTINGS, parseEditorSettings } from '../EditorSettingsContext';

describe('parseEditorSettings', () => {
  it('defaults auto save to off when no setting has been saved', () => {
    expect(parseEditorSettings(null)).toEqual(DEFAULT_EDITOR_SETTINGS);
  });

  it('restores an explicitly enabled auto save setting', () => {
    expect(parseEditorSettings('{"autoSave":true}')).toEqual({ autoSave: true });
  });

  it('restores an explicitly disabled auto save setting', () => {
    expect(parseEditorSettings('{"autoSave":false}')).toEqual({ autoSave: false });
  });

  it.each([
    'not-json',
    '{}',
    '{"autoSave":"true"}',
    'null',
    '[]',
  ])('falls back to off for malformed stored settings: %s', (storedValue) => {
    expect(parseEditorSettings(storedValue)).toEqual(DEFAULT_EDITOR_SETTINGS);
  });
});
