import type {
  IntegrationAdapter,
  IntegrationProvider,
  ISyncOrchestrator,
  SyncResult,
} from './types';
import type { NotesBundle } from '@/lib/filesystem';

interface QueuedSync {
  provider: IntegrationProvider;
  bundle: NotesBundle;
  timestamp: number;
  retryCount: number;
}

const DEBOUNCE_DELAY = 2000; // 2 seconds
const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE = 1000; // Start with 1 second

/**
 * Sync orchestrator manages queuing, debouncing, and retrying sync operations
 * across multiple integration providers
 */
export class SyncOrchestrator implements ISyncOrchestrator {
  private adapters: Map<IntegrationProvider, IntegrationAdapter> = new Map();
  private syncQueue: Map<IntegrationProvider, QueuedSync> = new Map();
  private debounceTimers: Map<IntegrationProvider, NodeJS.Timeout> = new Map();
  private activeSyncs: Set<IntegrationProvider> = new Set();

  /**
   * Register an adapter with the orchestrator
   */
  registerAdapter(provider: IntegrationProvider, adapter: IntegrationAdapter): void {
    this.adapters.set(provider, adapter);
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(provider: IntegrationProvider): void {
    this.adapters.delete(provider);
    this.cancelPending(provider);
  }

  /**
   * Queue a sync operation with debounce
   */
  queueSync(provider: IntegrationProvider, bundle: NotesBundle): void {
    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(provider);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Update queue
    this.syncQueue.set(provider, {
      provider,
      bundle,
      timestamp: Date.now(),
      retryCount: 0,
    });

    // Set new debounce timer
    const timer = setTimeout(() => {
      void this.processSyncQueue(provider);
    }, DEBOUNCE_DELAY);

    this.debounceTimers.set(provider, timer);
  }

  /**
   * Process queued sync for a specific provider
   */
  private async processSyncQueue(provider: IntegrationProvider): Promise<void> {
    const queued = this.syncQueue.get(provider);
    if (!queued) {
      return;
    }

    // Check if already syncing
    if (this.activeSyncs.has(provider)) {
      console.log(`Sync already in progress for ${provider}, skipping`);
      return;
    }

    const adapter = this.adapters.get(provider);
    if (!adapter) {
      console.warn(`No adapter registered for ${provider}`);
      this.syncQueue.delete(provider);
      return;
    }

    // Check adapter status
    const status = adapter.getStatus();
    if (status !== 'connected') {
      console.log(`Provider ${provider} is not connected (status: ${status}), skipping sync`);
      this.syncQueue.delete(provider);
      return;
    }

    this.activeSyncs.add(provider);

    try {
      console.log(`Starting sync for ${provider}`);
      const result = await adapter.sync(queued.bundle);

      if (result.success) {
        console.log(`Sync successful for ${provider}: ${result.notessynced} notes synced`);
        this.syncQueue.delete(provider);
      } else {
        console.warn(`Sync had errors for ${provider}:`, result.errors);
        await this.handleSyncFailure(queued, result);
      }
    } catch (error) {
      console.error(`Sync error for ${provider}:`, error);
      await this.handleSyncFailure(queued, null, error as Error);
    } finally {
      this.activeSyncs.delete(provider);
    }
  }

  /**
   * Handle sync failure with retry logic
   */
  private async handleSyncFailure(
    queued: QueuedSync,
    result: SyncResult | null,
    error?: Error
  ): Promise<void> {
    queued.retryCount++;

    if (queued.retryCount < MAX_RETRIES) {
      // Calculate exponential backoff
      const backoffTime = RETRY_BACKOFF_BASE * Math.pow(2, queued.retryCount - 1);
      
      console.log(
        `Retrying sync for ${queued.provider} (attempt ${queued.retryCount + 1}/${MAX_RETRIES}) in ${backoffTime}ms`
      );

      // Re-queue with backoff
      setTimeout(() => {
        this.syncQueue.set(queued.provider, queued);
        void this.processSyncQueue(queued.provider);
      }, backoffTime);
    } else {
      console.error(`Max retries reached for ${queued.provider}, giving up`);
      this.syncQueue.delete(queued.provider);
    }
  }

  /**
   * Trigger immediate sync for all enabled integrations
   */
  async syncAll(bundle: NotesBundle): Promise<Map<IntegrationProvider, SyncResult>> {
    const results = new Map<IntegrationProvider, SyncResult>();

    const syncPromises = Array.from(this.adapters.entries()).map(async ([provider, adapter]) => {
      const status = adapter.getStatus();
      if (status !== 'connected') {
        console.log(`Skipping ${provider} - not connected (status: ${status})`);
        return;
      }

      try {
        console.log(`Syncing all to ${provider}`);
        const result = await adapter.sync(bundle);
        results.set(provider, result);

        if (result.success) {
          console.log(`Sync all successful for ${provider}: ${result.notessynced} notes`);
        } else {
          console.warn(`Sync all had errors for ${provider}:`, result.errors);
        }
      } catch (error) {
        console.error(`Sync all error for ${provider}:`, error);
        results.set(provider, {
          success: false,
          notessynced: 0,
          conflicts: [],
          errors: [
            {
              code: 'SYNC_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
              details: error,
            },
          ],
          duration: 0,
        });
      }
    });

    await Promise.allSettled(syncPromises);
    return results;
  }

  /**
   * Get count of pending syncs
   */
  getPendingCount(): number {
    return this.syncQueue.size;
  }

  /**
   * Cancel pending syncs for a specific provider or all
   */
  cancelPending(provider?: IntegrationProvider): void {
    if (provider) {
      // Cancel specific provider
      const timer = this.debounceTimers.get(provider);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(provider);
      }
      this.syncQueue.delete(provider);
    } else {
      // Cancel all
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();
      this.syncQueue.clear();
    }
  }

  /**
   * Check if a provider is currently syncing
   */
  isSyncing(provider: IntegrationProvider): boolean {
    return this.activeSyncs.has(provider);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cancelPending();
    this.adapters.clear();
    this.activeSyncs.clear();
  }
}

// Singleton instance
let orchestratorInstance: SyncOrchestrator | null = null;

/**
 * Get the sync orchestrator singleton
 */
export function getSyncOrchestrator(): SyncOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new SyncOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Reset the orchestrator instance (mainly for testing)
 */
export function resetSyncOrchestrator(): void {
  if (orchestratorInstance) {
    orchestratorInstance.destroy();
    orchestratorInstance = null;
  }
}
