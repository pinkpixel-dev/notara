export const POLLINATIONS_CONFIG_STORAGE_KEY = 'notara-pollinations-config';

export interface PollinationsConfig {
  apiKey: string;
  textModel: string;
  imageModel: string;
}

export const POLLINATIONS_DEFAULT_CONFIG: PollinationsConfig = {
  apiKey: '',
  textModel: 'gemini-fast',
  imageModel: 'flux',
};

export const normalizePollinationsConfig = (
  config?: Partial<PollinationsConfig>
): PollinationsConfig => ({
  apiKey: config?.apiKey?.trim() ?? POLLINATIONS_DEFAULT_CONFIG.apiKey,
  textModel: config?.textModel?.trim() || POLLINATIONS_DEFAULT_CONFIG.textModel,
  imageModel: config?.imageModel?.trim() || POLLINATIONS_DEFAULT_CONFIG.imageModel,
});

export const readPollinationsConfig = (): PollinationsConfig => {
  if (typeof window === 'undefined') {
    return POLLINATIONS_DEFAULT_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(POLLINATIONS_CONFIG_STORAGE_KEY);
    if (!raw) {
      return POLLINATIONS_DEFAULT_CONFIG;
    }

    const parsed = JSON.parse(raw) as Partial<PollinationsConfig>;
    return normalizePollinationsConfig(parsed);
  } catch (error) {
    console.warn('Failed to load Pollinations config:', error);
    return POLLINATIONS_DEFAULT_CONFIG;
  }
};

export const savePollinationsConfig = (config: Partial<PollinationsConfig>): PollinationsConfig => {
  const normalized = normalizePollinationsConfig(config);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(POLLINATIONS_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.warn('Failed to save Pollinations config:', error);
    }
  }

  return normalized;
};
