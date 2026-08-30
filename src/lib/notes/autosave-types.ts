export type AutosaveStatus = 'disabled' | 'idle' | 'scheduled' | 'saving' | 'error';

export interface AutosaveState {
  enabled: boolean;
  status: AutosaveStatus;
  isSaving: boolean;
  hasPendingChanges: boolean;
  error: unknown | null;
}

export interface AutosaveOptions<Snapshot> {
  save: (snapshot: Snapshot) => Promise<void>;
  delayMs?: number;
  enabled?: boolean;
  onStateChange?: (state: AutosaveState) => void;
  onSaved?: (snapshot: Snapshot) => void;
  onError?: (error: unknown, snapshot: Snapshot) => void;
}

export interface AutosaveController<Snapshot> {
  schedule: (snapshot: Snapshot) => void;
  flush: () => Promise<boolean>;
  cancel: () => void;
  setEnabled: (enabled: boolean) => void;
  getState: () => AutosaveState;
}
