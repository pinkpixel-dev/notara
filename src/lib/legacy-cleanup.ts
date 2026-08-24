/**
 * Browser storage that used to hold credentials.
 *
 * `notara-pollinations-config` is the newest entry. It held an API key in plain
 * localStorage, which is the reason the OpenAI key is stored by the backend
 * instead, so an upgrade has to clear the old one rather than leave a working
 * key sitting in browser storage.
 */
const LEGACY_LOCAL_STORAGE_KEYS = [
  'github_oauth_state',
  'notara_integration_config_github',
  'notara_integration_config_google-drive',
  'notara_integration_config_dropbox',
  'github_integration_config',
  'notara-pollinations-config',
];

export const removeLegacyCredentialStorage = () => {
  if (typeof window === 'undefined') return;

  LEGACY_LOCAL_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));

  if ('indexedDB' in window) {
    window.indexedDB.deleteDatabase('notara-integrations');
  }
};
