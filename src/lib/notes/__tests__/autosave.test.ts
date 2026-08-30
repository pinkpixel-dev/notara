import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAutosaveController } from '../autosave';
import type { AutosaveState } from '../autosave';

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

const deferred = (): Deferred => {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

afterEach(() => {
  vi.useRealTimers();
});

describe('autosave scheduling', () => {
  it('saves only the latest snapshot after a trailing delay', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (): Promise<void> => undefined);
    const autosave = createAutosaveController({ save });

    autosave.schedule('first');
    await vi.advanceTimersByTimeAsync(1_000);
    autosave.schedule('latest');
    await vi.advanceTimersByTimeAsync(1_499);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith('latest');
  });

  it('serializes writes and follows an active write with the latest snapshot', async () => {
    vi.useFakeTimers();
    const writes: Deferred[] = [];
    const save = vi.fn((_snapshot: string): Promise<void> => {
      const write = deferred();
      writes.push(write);
      return write.promise;
    });
    const autosave = createAutosaveController({ save });

    autosave.schedule('first');
    await vi.advanceTimersByTimeAsync(1_500);
    expect(save).toHaveBeenCalledTimes(1);

    autosave.schedule('second');
    autosave.schedule('latest');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(save).toHaveBeenCalledTimes(1);

    writes[0].resolve();
    await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenLastCalledWith('latest');

    writes[1].resolve();
    await autosave.flush();
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('flushes the latest snapshot immediately and cancels the delay', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (): Promise<void> => undefined);
    const autosave = createAutosaveController({ save });

    autosave.schedule('first');
    autosave.schedule('latest');
    await expect(autosave.flush()).resolves.toBe(true);
    expect(save).toHaveBeenCalledWith('latest');

    await vi.advanceTimersByTimeAsync(2_000);
    expect(save).toHaveBeenCalledOnce();
  });

  it('cancels a scheduled save without disabling later changes', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (): Promise<void> => undefined);
    const autosave = createAutosaveController({ save });

    autosave.schedule('discarded');
    autosave.cancel();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(save).not.toHaveBeenCalled();

    autosave.schedule('kept');
    await vi.advanceTimersByTimeAsync(1_500);
    expect(save).toHaveBeenCalledWith('kept');
  });

  it('cancels a queued follow-up without interrupting the active write', async () => {
    vi.useFakeTimers();
    const activeWrite = deferred();
    const save = vi.fn((): Promise<void> => activeWrite.promise);
    const autosave = createAutosaveController({ save });

    autosave.schedule('active');
    await vi.advanceTimersByTimeAsync(1_500);
    autosave.schedule('discarded');
    autosave.cancel();

    activeWrite.resolve();
    await vi.waitFor(() => expect(autosave.getState().isSaving).toBe(false));
    await vi.advanceTimersByTimeAsync(2_000);
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith('active');
  });

  it('discards pending changes while disabled', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (): Promise<void> => undefined);
    const autosave = createAutosaveController({ save });

    autosave.schedule('discarded');
    autosave.setEnabled(false);
    autosave.schedule('ignored');
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(autosave.flush()).resolves.toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(autosave.getState().status).toBe('disabled');

    autosave.setEnabled(true);
    autosave.schedule('kept');
    await vi.advanceTimersByTimeAsync(1_500);
    expect(save).toHaveBeenCalledWith('kept');
  });

  it('reports an error without looping and retries on a manual flush', async () => {
    vi.useFakeTimers();
    const error = new Error('disk unavailable');
    const save = vi
      .fn<(snapshot: string) => Promise<void>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValue(undefined);
    const onError = vi.fn();
    const onSaved = vi.fn();
    const states: AutosaveState[] = [];
    const autosave = createAutosaveController({
      save,
      onError,
      onSaved,
      onStateChange: (state) => states.push(state),
    });

    autosave.schedule('draft');
    await vi.advanceTimersByTimeAsync(1_500);
    expect(save).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(error, 'draft');
    expect(autosave.getState()).toMatchObject({
      status: 'error',
      hasPendingChanges: true,
      error,
    });

    await vi.advanceTimersByTimeAsync(10_000);
    expect(save).toHaveBeenCalledOnce();

    await expect(autosave.flush()).resolves.toBe(true);
    expect(save).toHaveBeenCalledTimes(2);
    expect(onSaved).toHaveBeenCalledWith('draft');
    expect(autosave.getState()).toMatchObject({
      status: 'idle',
      hasPendingChanges: false,
      error: null,
    });
    expect(states.map((state) => state.status)).toContain('saving');
  });
});
