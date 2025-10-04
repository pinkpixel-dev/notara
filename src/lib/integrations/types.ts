import type { Note, NoteTag, VisionBoard } from '@/types';
import type { NotesBundle } from '@/lib/filesystem';

/**
 * Integration provider identifiers
 */
export type IntegrationProvider = 'github' | 'google-drive' | 'dropbox';

/**
 * Integration connection status
 */
export type IntegrationStatus =
  | 'disconnected'    // Not connected
  | 'connecting'      // OAuth flow in progress
  | 'connected'       // Connected and idle
  | 'syncing'         // Active sync in progress
  | 'error'           // Error state
  | 'rate-limited';   // Hit API rate limit

/**
 * OAuth token structure
 */
export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;  // Unix timestamp
  scope?: string;
  tokenType?: string;
}

/**
 * Integration metadata and state
 */
export interface IntegrationState {
  provider: IntegrationProvider;
  status: IntegrationStatus;
  isEnabled: boolean;
  lastSyncAt?: string;  // ISO timestamp
  lastError?: IntegrationError;
  config?: IntegrationConfig;
  metrics?: IntegrationMetrics;
}

/**
 * Provider-specific configuration
 */
export interface IntegrationConfig {
  // GitHub
  repoOwner?: string;
  repoName?: string;
  branch?: string;
  userName?: string;
  userEmail?: string;
  
  // Google Drive
  folderId?: string;
  folderName?: string;
  
  // Dropbox
  folderPath?: string;
  
  // Shared
  autoSync?: boolean;
  syncInterval?: number;  // milliseconds
}

/**
 * Error information
 */
export interface IntegrationError {
  code: string;
  message: string;
  timestamp: string;
  details?: unknown;
}

/**
 * Sync metrics for monitoring
 */
export interface IntegrationMetrics {
  syncAttempts: number;
  syncSuccesses: number;
  syncFailures: number;
  averageSyncTime: number;  // milliseconds
  lastSyncDuration?: number;
  notesCount?: number;
}

/**
 * Sync conflict information
 */
export interface SyncConflict {
  noteId: string;
  localNote: Note;
  remoteNote: Note;
  localUpdatedAt: string;
  remoteUpdatedAt: string;
  contentHash?: {
    local: string;
    remote: string;
  };
}

/**
 * Sync result from an adapter
 */
export interface SyncResult {
  success: boolean;
  notessynced: number;
  conflicts: SyncConflict[];
  errors: IntegrationError[];
  duration: number;  // milliseconds
}

/**
 * Integration adapter interface - implemented by each provider
 */
export interface IntegrationAdapter {
  readonly provider: IntegrationProvider;
  
  /**
   * Initialize OAuth flow and obtain tokens
   */
  connect(): Promise<boolean>;
  
  /**
   * Revoke tokens and clean up connection
   */
  disconnect(): Promise<void>;
  
  /**
   * Sync notes bundle to remote provider
   */
  sync(bundle: NotesBundle): Promise<SyncResult>;
  
  /**
   * Get current connection status
   */
  getStatus(): IntegrationStatus;
  
  /**
   * Get integration configuration
   */
  getConfig(): IntegrationConfig | null;
  
  /**
   * Update integration configuration
   */
  updateConfig(config: Partial<IntegrationConfig>): Promise<void>;
  
  /**
   * Handle sync conflict with user preference
   */
  resolveConflict(conflict: SyncConflict, preferLocal: boolean): Promise<Note>;
  
  /**
   * Manual sync trigger
   */
  manualSync(): Promise<SyncResult>;
  
  /**
   * Test connection and permissions
   */
  testConnection(): Promise<boolean>;
}

/**
 * Token storage interface
 */
export interface ITokenVault {
  storeToken(provider: IntegrationProvider, accountId: string, token: OAuthToken): Promise<void>;
  getToken(provider: IntegrationProvider, accountId?: string): Promise<OAuthToken | null>;
  deleteToken(provider: IntegrationProvider, accountId?: string): Promise<void>;
  hasToken(provider: IntegrationProvider, accountId?: string): Promise<boolean>;
  clearAll(): Promise<void>;
}

/**
 * Sync orchestrator interface
 */
export interface ISyncOrchestrator {
  /**
   * Queue a sync operation with debounce
   */
  queueSync(provider: IntegrationProvider, bundle: NotesBundle): void;
  
  /**
   * Trigger immediate sync for all enabled integrations
   */
  syncAll(bundle: NotesBundle): Promise<Map<IntegrationProvider, SyncResult>>;
  
  /**
   * Get pending sync queue status
   */
  getPendingCount(): number;
  
  /**
   * Cancel pending syncs
   */
  cancelPending(provider?: IntegrationProvider): void;
}

/**
 * Integration context value interface
 */
export interface IIntegrationContext {
  // State
  integrations: Map<IntegrationProvider, IntegrationState>;
  isInitialized: boolean;
  
  // Actions
  connectIntegration(provider: IntegrationProvider): Promise<boolean>;
  disconnectIntegration(provider: IntegrationProvider): Promise<void>;
  getIntegrationState(provider: IntegrationProvider): IntegrationState | null;
  updateIntegrationConfig(provider: IntegrationProvider, config: Partial<IntegrationConfig>): Promise<void>;
  manualSync(provider: IntegrationProvider): Promise<SyncResult>;
  resolveConflict(provider: IntegrationProvider, conflict: SyncConflict, preferLocal: boolean): Promise<Note>;
  registerAdapter(provider: IntegrationProvider, adapter: IntegrationAdapter): void;
  
  // Feature flags
  isIntegrationEnabled(provider: IntegrationProvider): boolean;
  areIntegrationsEnabled(): boolean;
}
