/**
 * Typed wrappers around the Rust OpenAI commands.
 *
 * Every call here crosses into Rust, which holds the encrypted key, builds the
 * request, and talks to OpenAI. That is the point: this layer sends a model ID
 * and a prompt and receives a result, so the API key never exists in frontend
 * state, a console log, or browser storage.
 *
 * The browser build has no backend, so AI is unavailable there. Callers check
 * `isOpenAiAvailable()` before offering an AI action.
 */
import { invoke } from '@tauri-apps/api/core';
import { fileSystemHelpers } from '@/lib/filesystem';
import type { ImageModel, TextModel } from './models';

/** What the UI is allowed to know about the saved key. */
export interface OpenAiKeyStatus {
  saved: boolean;
  /** A short hint such as `sk-••••mnop`. Never the full key. */
  masked: string | null;
}

export interface OpenAiUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface OpenAiTextResult {
  text: string;
  model: string;
  responseId: string | null;
  usage: OpenAiUsage;
}

export interface OpenAiImageResult {
  base64: string;
  mimeType: string;
  model: string;
  requestId: string | null;
}

export interface OpenAiChatMessage {
  role: string;
  content: string;
}

/** The failure kinds the backend distinguishes. */
export type OpenAiErrorKind =
  | 'authentication'
  | 'access'
  | 'verification'
  | 'model'
  | 'rateLimit'
  | 'billing'
  | 'contentPolicy'
  | 'request'
  | 'provider'
  | 'network'
  | 'local';

export interface OpenAiFailure {
  kind: OpenAiErrorKind;
  message: string;
  requestId: string | null;
  status: number | null;
}

const KEY_STATUS_UNAVAILABLE: OpenAiKeyStatus = { saved: false, masked: null };

/** AI needs the Rust backend, so it is desktop only. */
export const isOpenAiAvailable = (): boolean => fileSystemHelpers.isTauriEnvironment();

export const OPENAI_UNAVAILABLE_MESSAGE =
  'AI features need the Notara desktop app, because the API key is stored and used by the desktop backend.';

/**
 * Normalizes whatever came back from a rejected command into a failure object.
 *
 * The transport commands reject with a structured error. The key commands
 * reject with a plain string, because storage problems are local rather than
 * provider problems. Both end up shaped the same way here.
 */
export const asOpenAiFailure = (error: unknown): OpenAiFailure => {
  if (typeof error === 'object' && error !== null && 'kind' in error && 'message' in error) {
    const failure = error as Partial<OpenAiFailure>;

    return {
      kind: (failure.kind ?? 'local') as OpenAiErrorKind,
      message: failure.message ?? 'The request to OpenAI failed.',
      requestId: failure.requestId ?? null,
      status: failure.status ?? null,
    };
  }

  return {
    kind: 'local',
    message: typeof error === 'string' ? error : 'The request to OpenAI failed.',
    requestId: null,
    status: null,
  };
};

/**
 * Builds the sentence shown to the user.
 *
 * The request ID is appended because it is the first thing OpenAI support asks
 * for, and there is nowhere else in the app to find it.
 */
export const describeOpenAiFailure = (error: unknown): string => {
  const failure = asOpenAiFailure(error);

  return failure.requestId ? `${failure.message} (request ${failure.requestId})` : failure.message;
};

export const readOpenAiKeyStatus = async (): Promise<OpenAiKeyStatus> => {
  if (!isOpenAiAvailable()) {
    return KEY_STATUS_UNAVAILABLE;
  }

  return invoke<OpenAiKeyStatus>('openai_key_status');
};

export const saveOpenAiKey = (key: string): Promise<OpenAiKeyStatus> =>
  invoke<OpenAiKeyStatus>('openai_save_key', { key });

export const deleteOpenAiKey = (): Promise<OpenAiKeyStatus> =>
  invoke<OpenAiKeyStatus>('openai_delete_key');

export const testOpenAiKey = (): Promise<{ ok: boolean }> =>
  invoke<{ ok: boolean }>('openai_test_key');

/** Runs a text generation through the Responses API. */
export const generateOpenAiText = (request: {
  model: TextModel;
  messages: OpenAiChatMessage[];
  instructions?: string;
  maxOutputTokens?: number;
}): Promise<OpenAiTextResult> =>
  invoke<OpenAiTextResult>('openai_generate_text', {
    model: request.model,
    messages: request.messages,
    instructions: request.instructions ?? null,
    maxOutputTokens: request.maxOutputTokens ?? null,
  });

/** Runs an image generation through the Images API. */
export const generateOpenAiImage = (request: {
  model: ImageModel;
  prompt: string;
  size?: string;
  quality?: string;
}): Promise<OpenAiImageResult> =>
  invoke<OpenAiImageResult>('openai_generate_image', {
    model: request.model,
    prompt: request.prompt,
    size: request.size ?? null,
    quality: request.quality ?? null,
  });

/** Turns a returned image into a blob the pinboard and file saves can use. */
export const openAiImageToBlob = (result: OpenAiImageResult): Blob => {
  const binary = atob(result.base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: result.mimeType });
};

/**
 * Writes a generated image to a path the user picks in a native save dialog.
 *
 * Returns the saved path, or `null` when the dialog was cancelled. The write
 * happens in Rust because the destination is outside the workspace, which the
 * filesystem scope does not cover.
 */
export const saveOpenAiImageAs = async (
  result: Pick<OpenAiImageResult, 'base64' | 'mimeType'>,
  suggestedName: string
): Promise<string | null> => {
  const { save } = await import('@tauri-apps/plugin-dialog');

  const extension = result.mimeType === 'image/jpeg' ? 'jpg' : result.mimeType === 'image/webp' ? 'webp' : 'png';

  const path = await save({
    defaultPath: `${suggestedName}.${extension}`,
    filters: [{ name: 'Image', extensions: [extension] }],
  });

  if (!path) {
    return null;
  }

  return invoke<string>('openai_save_image', { path, base64: result.base64 });
};

/**
 * Reads the bytes back out of a rendered data URL.
 *
 * Messages already carry the generated image as a data URL for display, so a
 * later Save As can work from that rather than holding a second copy of every
 * image in component state.
 */
export const dataUrlToOpenAiImage = (
  dataUrl: string
): Pick<OpenAiImageResult, 'base64' | 'mimeType'> | null => {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);

  return match ? { mimeType: match[1], base64: match[2] } : null;
};
