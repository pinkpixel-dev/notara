import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  IIntegrationContext,
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationMetrics,
  IntegrationProvider,
  IntegrationState,
  ITokenVault,
  SyncConflict,
  SyncResult,
} from '@/lib/integrations/types';
import type { Note } from '@/types';
import { getTokenVault } from '@/lib/integrations/tokenVault';
import { GitHubAdapter } from '@/lib/integrations/adapters/GitHubAdapter';
import { GoogleDriveAdapter } from '@/lib/integrations/adapters/GoogleDriveAdapter';
import { DropboxAdapter } from '@/lib/integrations/adapters/DropboxAdapter';

const IntegrationContext = createContext<IIntegrationContext | undefined>(undefined);

const DEFAULT_METRICS: IntegrationMetrics = {
  syncAttempts: 0,
  syncSuccesses: 0,
  syncFailures: 0,
  averageSyncTime: 0,
};

/**
 * Check if integrations feature is enabled
 */
const areIntegrationsEnabled = (): boolean => {
  return import.meta.env.VITE_ENABLE_INTEGRATIONS === 'true';
};

/**
 * Check if a specific integration is enabled
 */
const isProviderEnabled = (provider: IntegrationProvider): boolean => {
  if (!areIntegrationsEnabled()) {
    return false;
  }

  switch (provider) {
    case 'github':
      return import.meta.env.VITE_ENABLE_GITHUB_INTEGRATION === 'true';
    case 'google-drive':
      return import.meta.env.VITE_ENABLE_GOOGLE_DRIVE_INTEGRATION === 'true';
    case 'dropbox':
      return import.meta.env.VITE_ENABLE_DROPBOX_INTEGRATION === 'true';
    default:
      return false;
  }
};

const PROVIDERS: IntegrationProvider[] = ['github', 'google-drive', 'dropbox'];

const createBaseStates = (): Map<IntegrationProvider, IntegrationState> => {
  const map = new Map<IntegrationProvider, IntegrationState>();

  for (const provider of PROVIDERS) {
    const enabled = isProviderEnabled(provider);

    map.set(provider, {
      provider,
      status: 'disconnected',
      isEnabled: enabled,
      metrics: { ...DEFAULT_METRICS },
    });
  }

  return map;
};

export const IntegrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [integrations, setIntegrations] = useState<Map<IntegrationProvider, IntegrationState>>(
    () => createBaseStates()
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const adaptersRef = useRef<Map<IntegrationProvider, IntegrationAdapter>>(new Map());

  /**
   * Initialize integration states
   */
  useEffect(() => {
    console.log('[Integrations] Checking if enabled:', areIntegrationsEnabled());
    
    if (!areIntegrationsEnabled()) {
      console.log('[Integrations] Feature disabled, skipping initialization');
      setIsInitialized(true);
      return;
    }

    console.log('[Integrations] Starting initialization...');
    
    const initializeIntegrations = async () => {
      try {
        const initialStates = createBaseStates();

        // Initialize the vault once; if it fails we still populate disconnected states below
        let vault: ITokenVault | null = null;
        try {
          vault = await getTokenVault();
        } catch (e) {
          console.warn('[Integrations] TokenVault init failed; falling back to disconnected:', e);
          vault = null;
        }

        for (const provider of PROVIDERS) {
          const enabled = isProviderEnabled(provider);

          if (!enabled) {
            console.log(`[Integrations] ${provider}: enabled=${enabled}`);
            continue;
          }

          // Check if we have a stored token (fail gracefully)
          let hasToken = false;
          if (vault) {
            try {
              hasToken = await vault.hasToken(provider);
            } catch (e) {
              console.warn(`[Integrations] hasToken failed for ${provider}; treating as disconnected:`, e);
              hasToken = false;
            }
          }

          console.log(`[Integrations] ${provider}: enabled=${enabled}, hasToken=${hasToken}`);

          // Load saved config if connected
          let config: IntegrationConfig | undefined;
          if (hasToken) {
            const configKey = `notara_integration_config_${provider}`;
            const savedConfig = localStorage.getItem(configKey);
            if (savedConfig) {
              try {
                config = JSON.parse(savedConfig) as IntegrationConfig;
              } catch (e) {
                console.error(`[Integrations] Failed to parse config for ${provider}:`, e);
              }
            }
          }

          if (hasToken) {
            initialStates.set(provider, {
              provider,
              status: 'connected',
              isEnabled: true,
              metrics: { ...DEFAULT_METRICS },
              config,
            });
          }
        }

        console.log('[Integrations] Initial states:', Array.from(initialStates.entries()));

        setIntegrations(initialStates);
        setIsInitialized(true);
      } catch (error) {
        console.error('[Integrations] Initialization failed:', error);
        setIsInitialized(true);
      }
    };

    void initializeIntegrations();
  }, []);

  /**
   * Register adapters on mount
   */
  useEffect(() => {
    if (!areIntegrationsEnabled()) {
      return;
    }

    // Register adapters
    const githubAdapter = new GitHubAdapter();
    const googleDriveAdapter = new GoogleDriveAdapter();
    const dropboxAdapter = new DropboxAdapter();

    adaptersRef.current.set('github', githubAdapter);
    adaptersRef.current.set('google-drive', googleDriveAdapter);
    adaptersRef.current.set('dropbox', dropboxAdapter);

    console.log('[Integrations] Registered adapters:', [
      'github',
      'google-drive',
      'dropbox',
    ]);
  }, []);

  /**
   * Register an adapter for a provider
   */
  const registerAdapter = useCallback((provider: IntegrationProvider, adapter: IntegrationAdapter) => {
    adaptersRef.current.set(provider, adapter);
  }, []);

  /**
   * Get adapter for a provider
   */
  const getAdapter = useCallback(
    (provider: IntegrationProvider): IntegrationAdapter | null => {
      return adaptersRef.current.get(provider) ?? null;
    },
    []
  );

  /**
   * Update integration state
   */
  const updateIntegrationState = useCallback(
    (provider: IntegrationProvider, updates: Partial<IntegrationState>) => {
      setIntegrations((prev) => {
        const current = prev.get(provider);
        if (!current) {
          return prev;
        }

        const updated = new Map(prev);
        updated.set(provider, { ...current, ...updates });
        return updated;
      });
    },
    []
  );

  /**
   * Connect to an integration
   */
  const connectIntegration = useCallback(
    async (provider: IntegrationProvider): Promise<boolean> => {
      if (!isProviderEnabled(provider)) {
        console.warn(`Integration ${provider} is not enabled`);
        return false;
      }

      updateIntegrationState(provider, { status: 'connecting' });

      try {
        const adapter = getAdapter(provider);
        if (!adapter) {
          throw new Error(`No adapter registered for ${provider}`);
        }

        const success = await adapter.connect();

        if (success) {
          const updatedConfig = adapter.getConfig();
          updateIntegrationState(provider, {
            status: 'connected',
            lastSyncAt: new Date().toISOString(),
            config: updatedConfig ?? undefined,
          });
        } else {
          updateIntegrationState(provider, {
            status: 'disconnected',
            lastError: {
              code: 'CONNECTION_FAILED',
              message: 'Failed to connect to integration',
              timestamp: new Date().toISOString(),
            },
          });
        }

        return success;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateIntegrationState(provider, {
          status: 'error',
          lastError: {
            code: 'CONNECTION_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString(),
            details: error,
          },
        });
        return false;
      }
    },
    [getAdapter, updateIntegrationState]
  );

  /**
   * Disconnect from an integration
   */
  const disconnectIntegration = useCallback(
    async (provider: IntegrationProvider): Promise<void> => {
      try {
        const adapter = getAdapter(provider);
        if (adapter) {
          await adapter.disconnect();
        }

        // Clear token
        const vault = await getTokenVault();
        await vault.deleteToken(provider);

        updateIntegrationState(provider, {
          status: 'disconnected',
          lastError: undefined,
          config: undefined,
        });
      } catch (error) {
        console.error(`Error disconnecting ${provider}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateIntegrationState(provider, {
          status: 'error',
          lastError: {
            code: 'DISCONNECT_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString(),
            details: error,
          },
        });
      }
    },
    [getAdapter, updateIntegrationState]
  );

  /**
   * Get integration state for a provider
   */
  const getIntegrationState = useCallback(
    (provider: IntegrationProvider): IntegrationState | null => {
      return integrations.get(provider) ?? null;
    },
    [integrations]
  );

  /**
   * Update integration configuration
   */
  const updateIntegrationConfig = useCallback(
    async (provider: IntegrationProvider, config: Partial<IntegrationConfig>): Promise<void> => {
      try {
        const adapter = getAdapter(provider);
        if (!adapter) {
          throw new Error(`No adapter registered for ${provider}`);
        }

        await adapter.updateConfig(config);

        const adapterConfig = adapter.getConfig();
        const adapterStatus = adapter.getStatus();
        const repoConfigured = Boolean(adapterConfig?.repoOwner && adapterConfig?.repoName);

        updateIntegrationState(provider, {
          config: adapterConfig ?? undefined,
          status: adapterStatus,
          ...(repoConfigured ? { lastError: undefined } : {}),
        });
      } catch (error) {
        console.error(`Error updating config for ${provider}:`, error);
        throw error;
      }
    },
    [getAdapter, updateIntegrationState]
  );

  /**
   * Manually trigger sync for a provider
   */
  const manualSync = useCallback(
    async (provider: IntegrationProvider): Promise<SyncResult> => {
      const adapter = getAdapter(provider);
      if (!adapter) {
        throw new Error(`No adapter registered for ${provider}`);
      }

      const state = getIntegrationState(provider);
      if (!state || state.status !== 'connected') {
        throw new Error(`Integration ${provider} is not connected`);
      }

      updateIntegrationState(provider, { status: 'syncing' });

      try {
        const result = await adapter.manualSync();

        // Update metrics
        const currentMetrics = state.metrics ?? DEFAULT_METRICS;
        const updatedMetrics: IntegrationMetrics = {
          syncAttempts: currentMetrics.syncAttempts + 1,
          syncSuccesses: result.success ? currentMetrics.syncSuccesses + 1 : currentMetrics.syncSuccesses,
          syncFailures: result.success ? currentMetrics.syncFailures : currentMetrics.syncFailures + 1,
          averageSyncTime:
            (currentMetrics.averageSyncTime * currentMetrics.syncAttempts + result.duration) /
            (currentMetrics.syncAttempts + 1),
          lastSyncDuration: result.duration,
          notesCount: result.notessynced,
        };

        updateIntegrationState(provider, {
          status: result.success ? 'connected' : 'error',
          lastSyncAt: new Date().toISOString(),
          metrics: updatedMetrics,
          lastError: result.errors.length > 0 ? result.errors[0] : undefined,
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateIntegrationState(provider, {
          status: 'error',
          lastError: {
            code: 'SYNC_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString(),
            details: error,
          },
        });
        throw error;
      }
    },
    [getAdapter, getIntegrationState, updateIntegrationState]
  );

  /**
   * Resolve a sync conflict
   */
  const resolveConflict = useCallback(
    async (
      provider: IntegrationProvider,
      conflict: SyncConflict,
      preferLocal: boolean
    ): Promise<Note> => {
      const adapter = getAdapter(provider);
      if (!adapter) {
        throw new Error(`No adapter registered for ${provider}`);
      }

      return adapter.resolveConflict(conflict, preferLocal);
    },
    [getAdapter]
  );

  const value = useMemo<IIntegrationContext>(
    () => ({
      integrations,
      isInitialized,
      connectIntegration,
      disconnectIntegration,
      getIntegrationState,
      updateIntegrationConfig,
      manualSync,
      resolveConflict,
      registerAdapter,
      isIntegrationEnabled: isProviderEnabled,
      areIntegrationsEnabled,
    }),
    [
      integrations,
      isInitialized,
      connectIntegration,
      disconnectIntegration,
      getIntegrationState,
      updateIntegrationConfig,
      manualSync,
      resolveConflict,
      registerAdapter,
    ]
  );

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
};

export const useIntegrations = (): IIntegrationContext => {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegrations must be used within an IntegrationProvider');
  }
  return context;
};
