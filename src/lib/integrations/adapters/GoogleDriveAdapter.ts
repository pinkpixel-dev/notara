import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationStatus,
  SyncConflict,
  SyncResult,
} from '../types';
import type { Note } from '@/types';
import type { NotesBundle } from '@/lib/filesystem';
import { getTokenVault } from '../tokenVault';

/**
 * Google Drive Integration Adapter
 * 
 * Phase 3: Full implementation pending
 * 
 * This adapter syncs notes as files in Google Drive folder.
 */
export class GoogleDriveAdapter implements IntegrationAdapter {
  readonly provider = 'googleDrive' as const;
  
  private status: IntegrationStatus = 'disconnected';
  private config: IntegrationConfig | null = null;

  constructor() {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const vault = await getTokenVault();
      const hasToken = await vault.hasToken(this.provider);
      
      if (hasToken) {
        const token = await vault.getToken(this.provider);
        if (token && !vault.isTokenExpired(token)) {
          this.status = 'connected';
        }
      }
    } catch (error) {
      // Silently fail during initialization - vault might not be ready yet
      console.debug('[Google Drive] Adapter initialization pending vault readiness');
    }
  }

  async connect(): Promise<boolean> {
    this.status = 'connecting';
    console.log('[Google Drive] OAuth flow not yet implemented (Phase 3)');
    this.status = 'disconnected';
    return false;
  }

  async disconnect(): Promise<void> {
    try {
      const vault = await getTokenVault();
      await vault.deleteToken(this.provider);
      this.status = 'disconnected';
      this.config = null;
    } catch (error) {
      console.error('[Google Drive] Disconnect failed:', error);
      throw error;
    }
  }

  async sync(bundle: NotesBundle): Promise<SyncResult> {
    const startTime = Date.now();
    const duration = Date.now() - startTime;

    return {
      success: false,
      notessynced: 0,
      conflicts: [],
      errors: [
        {
          code: 'NOT_IMPLEMENTED',
          message: 'Google Drive sync not yet implemented (Phase 3)',
          timestamp: new Date().toISOString(),
        },
      ],
      duration,
    };
  }

  getStatus(): IntegrationStatus {
    return this.status;
  }

  getConfig(): IntegrationConfig | null {
    return this.config;
  }

  async updateConfig(config: Partial<IntegrationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async resolveConflict(conflict: SyncConflict, preferLocal: boolean): Promise<Note> {
    return preferLocal ? conflict.localNote : conflict.remoteNote;
  }

  async manualSync(): Promise<SyncResult> {
    return this.sync({ notes: [], tags: [], visionBoards: [] });
  }

  async testConnection(): Promise<boolean> {
    return this.status === 'connected';
  }
}
