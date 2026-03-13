import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

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

type PollinationsChatMessage = {
  role: string;
  content: string;
};

type PollinationsTextPayload = {
  model: string;
  messages: PollinationsChatMessage[];
  stream: boolean;
};

type PollinationsImagePayload = {
  prompt: string;
  width: number;
  height: number;
  seed: number;
  model: string;
  enhance?: boolean;
  safe?: boolean;
  quality?: 'low' | 'medium' | 'high' | 'hd';
};

export const isTauriDesktopRuntime = (): boolean =>
  typeof window !== 'undefined' &&
  '__TAURI_INTERNALS__' in (window as unknown as Record<string, unknown>);

const getPollinationsFetch = () => (isTauriDesktopRuntime() ? tauriFetch : fetch);

const getPollinationsTextUrl = (): string =>
  isTauriDesktopRuntime()
    ? 'https://gen.pollinations.ai/v1/chat/completions'
    : '/api/pollinations/text';

const getPollinationsImageUrl = (payload: PollinationsImagePayload): string => {
  if (!isTauriDesktopRuntime()) {
    return '/api/pollinations/image';
  }

  const upstreamUrl = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(payload.prompt)}`);
  upstreamUrl.searchParams.set('width', String(payload.width));
  upstreamUrl.searchParams.set('height', String(payload.height));
  upstreamUrl.searchParams.set('seed', String(payload.seed));
  upstreamUrl.searchParams.set('model', payload.model);

  if (typeof payload.enhance === 'boolean') {
    upstreamUrl.searchParams.set('enhance', payload.enhance ? 'true' : 'false');
  }

  if (typeof payload.safe === 'boolean') {
    upstreamUrl.searchParams.set('safe', payload.safe ? 'true' : 'false');
  }

  if (payload.quality) {
    upstreamUrl.searchParams.set('quality', payload.quality);
  }

  return upstreamUrl.toString();
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

export const requestPollinationsText = async (
  payload: PollinationsTextPayload,
  bearerToken: string
): Promise<Response> => {
  const pollinationsFetch = getPollinationsFetch();

  return pollinationsFetch(getPollinationsTextUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: bearerToken,
    },
    body: JSON.stringify(payload),
  });
};

export const requestPollinationsImage = async (
  payload: PollinationsImagePayload,
  bearerToken: string
): Promise<Response> => {
  const pollinationsFetch = getPollinationsFetch();

  if (isTauriDesktopRuntime()) {
    return pollinationsFetch(getPollinationsImageUrl(payload), {
      method: 'GET',
      headers: {
        Authorization: bearerToken,
      },
    });
  }

  return pollinationsFetch(getPollinationsImageUrl(payload), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: bearerToken,
    },
    body: JSON.stringify(payload),
  });
};
