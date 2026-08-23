const LEGACY_LOCAL_STORAGE_KEYS = [
  'github_oauth_state',
  'notara_integration_config_github',
  'notara_integration_config_google-drive',
  'notara_integration_config_dropbox',
  'github_integration_config',
];

export const removeLegacyCredentialStorage = () => {
  if (typeof window === 'undefined') return;

  LEGACY_LOCAL_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));

  if ('indexedDB' in window) {
    window.indexedDB.deleteDatabase('notara-integrations');
  }
};
