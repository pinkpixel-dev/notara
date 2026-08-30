import type {
  AutosaveController,
  AutosaveOptions,
  AutosaveState,
  AutosaveStatus,
} from './autosave-types';

export const DEFAULT_AUTOSAVE_DELAY_MS = 1_500;

interface PendingSnapshot<Snapshot> {
  value: Snapshot;
}

class AutosaveScheduler<Snapshot> implements AutosaveController<Snapshot> {
  private readonly save: AutosaveOptions<Snapshot>['save'];
  private readonly delayMs: number;
  private readonly onStateChange?: AutosaveOptions<Snapshot>['onStateChange'];
  private readonly onSaved?: AutosaveOptions<Snapshot>['onSaved'];
  private readonly onError?: AutosaveOptions<Snapshot>['onError'];
  private enabled: boolean;
  private pending: PendingSnapshot<Snapshot> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private drainPromise: Promise<boolean> | null = null;
  private isSaving = false;
  private error: unknown | null = null;

  constructor(options: AutosaveOptions<Snapshot>) {
    this.save = options.save;
    this.delayMs = options.delayMs ?? DEFAULT_AUTOSAVE_DELAY_MS;
    this.enabled = options.enabled ?? true;
    this.onStateChange = options.onStateChange;
    this.onSaved = options.onSaved;
    this.onError = options.onError;
  }

  schedule = (snapshot: Snapshot): void => {
    if (!this.enabled) {
      return;
    }

    this.pending = { value: snapshot };
    this.error = null;

    if (this.isSaving || this.drainPromise) {
      this.emitState();
      return;
    }

    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.startDrain();
    }, this.delayMs);
    this.emitState();
  };

  flush = (): Promise<boolean> => {
    if (!this.enabled) {
      return Promise.resolve(false);
    }

    this.clearTimer();
    if (this.drainPromise) {
      return this.drainPromise;
    }
    if (!this.pending) {
      this.emitState();
      return Promise.resolve(true);
    }
    return this.startDrain();
  };

  cancel = (): void => {
    this.clearTimer();
    this.pending = null;
    this.error = null;
    this.emitState();
  };

  setEnabled = (enabled: boolean): void => {
    if (this.enabled === enabled) {
      return;
    }

    this.enabled = enabled;
    this.clearTimer();
    this.pending = null;
    this.error = null;
    this.emitState();
  };

  getState = (): AutosaveState => ({
    enabled: this.enabled,
    status: this.status(),
    isSaving: this.isSaving,
    hasPendingChanges: this.pending !== null,
    error: this.error,
  });

  private startDrain = (): Promise<boolean> => {
    if (this.drainPromise) {
      return this.drainPromise;
    }

    const operation = this.drain();
    this.drainPromise = operation;
    void operation.finally(() => {
      if (this.drainPromise === operation) {
        this.drainPromise = null;
      }
    });
    return operation;
  };

  private drain = async (): Promise<boolean> => {
    while (this.enabled && this.pending) {
      const snapshot = this.pending;
      this.pending = null;
      this.isSaving = true;
      this.emitState();

      try {
        await this.save(snapshot.value);
      } catch (error) {
        this.pending ??= snapshot;
        this.error = error;
        this.isSaving = false;
        this.onError?.(error, snapshot.value);
        this.emitState();
        return false;
      }

      this.isSaving = false;
      this.error = null;
      this.onSaved?.(snapshot.value);
    }

    this.isSaving = false;
    this.emitState();
    return true;
  };

  private status = (): AutosaveStatus => {
    if (!this.enabled) {
      return 'disabled';
    }
    if (this.isSaving) {
      return 'saving';
    }
    if (this.error) {
      return 'error';
    }
    if (this.timer) {
      return 'scheduled';
    }
    return 'idle';
  };

  private clearTimer = (): void => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  };

  private emitState = (): void => {
    this.onStateChange?.(this.getState());
  };
}

export const createAutosaveController = <Snapshot>(
  options: AutosaveOptions<Snapshot>
): AutosaveController<Snapshot> => new AutosaveScheduler(options);

export type {
  AutosaveController,
  AutosaveOptions,
  AutosaveState,
  AutosaveStatus,
} from './autosave-types';
