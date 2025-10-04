import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationStatus,
  OAuthToken,
  SyncConflict,
  SyncResult,
} from '../types';
import type { Note } from '@/types';
import type { NotesBundle } from '@/lib/filesystem';
import { getTokenVault } from '../tokenVault';
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchGitHubUser,
  getRedirectUri,
  revokeGitHubToken,
  testGitHubToken,
} from '../oauth/github';

const CONFIG_STORAGE_KEY = 'notara_integration_config_github';

/**
 * GitHub Integration Adapter
 * 
 * Phase 1: Stub implementation with OAuth flow structure
 * Phase 2: Full implementation with file sync
 * 
 * This adapter syncs notes as markdown files to a GitHub repository.
 */
export class GitHubAdapter implements IntegrationAdapter {
  readonly provider = 'github' as const;
  
  private status: IntegrationStatus = 'disconnected';
  private config: IntegrationConfig | null = null;

  constructor() {
    void this.initialize();
  }

  /**
   * Initialize adapter and check for existing token
   */
  private async initialize(): Promise<void> {
    try {
      const vault = await getTokenVault();
      const hasToken = await vault.hasToken(this.provider);
      
      if (hasToken) {
        const token = await vault.getToken(this.provider);
        if (token && !vault.isTokenExpired(token)) {
          this.status = 'connected';
          // Load saved config
          this.loadConfig();
        }
      }
    } catch (error) {
      // Silently fail during initialization - vault might not be ready yet
      console.debug('[GitHub] Adapter initialization pending vault readiness');
    }
  }

  /**
   * OAuth connection flow with popup window
   */
  async connect(): Promise<boolean> {
    this.status = 'connecting';

    try {
      const clientId = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID;
      if (!clientId) {
        throw new Error('GitHub OAuth Client ID not configured. Please add VITE_GITHUB_OAUTH_CLIENT_ID to your .env file.');
      }

      // Build authorization URL
      const redirectUri = getRedirectUri();
      const authUrl = await buildAuthorizationUrl(clientId, redirectUri);

      // Open popup window
      const popup = this.openOAuthPopup(authUrl);
      if (!popup) {
        throw new Error('Failed to open OAuth popup. Please allow popups for this site.');
      }

      // Wait for OAuth callback
      const authCode = await this.waitForAuthCode(popup);

      // Exchange code for token
      console.log('[GitHub] Exchanging authorization code for token...');
      const tokenResponse = await exchangeCodeForToken(authCode, clientId, redirectUri);

      // Fetch user info
      const user = await fetchGitHubUser(tokenResponse.access_token);
      console.log('[GitHub] Connected as:', user.login);

      // Store token securely with account ID
      const vault = await getTokenVault();
      const token: OAuthToken = {
        provider: this.provider,
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type || 'bearer',
        scope: tokenResponse.scope,
        expiresAt: undefined, // GitHub tokens don't expire unless revoked
      };
      // Use GitHub username as the account identifier
      await vault.storeToken(this.provider, user.login, token);

      // Update status and config
      this.status = 'connected';
      const existingConfig = this.config ?? {};
      this.config = {
        ...existingConfig,
        userName: user.login,
        userEmail: user.email || undefined,
        branch: existingConfig.branch ?? 'main',
      };

      // Save config to localStorage
      this.saveConfig();

      console.log('[GitHub] OAuth flow completed successfully');
      return true;
    } catch (error) {
      console.error('[GitHub] Connection failed:', error);
      this.status = 'error';
      return false;
    }
  }

  /**
   * Open OAuth popup window
   */
  private openOAuthPopup(url: string): Window | null {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    return window.open(
      url,
      'github_oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );
  }

  /**
   * Wait for OAuth callback with authorization code
   */
  private waitForAuthCode(popup: Window): Promise<string> {
    return new Promise((resolve, reject) => {
      // One-shot guard to prevent double token exchange (e.g., from HMR or route re-renders)
      let settled = false;
      
      const timeout = setTimeout(() => {
        if (!settled) {
          cleanup();
          reject(new Error('OAuth flow timed out after 5 minutes'));
        }
      }, 5 * 60 * 1000); // 5 minute timeout

      const handleMessage = (event: MessageEvent) => {
        // Prevent duplicate exchanges
        if (settled) {
          return;
        }
        
        // Verify origin for security
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data.type === 'github_oauth_success' && event.data.code) {
          settled = true;
          cleanup();
          resolve(event.data.code);
        } else if (event.data.type === 'github_oauth_error') {
          settled = true;
          cleanup();
          reject(new Error(event.data.error || 'OAuth authorization failed'));
        }
      };

      const checkPopupClosed = setInterval(() => {
        if (popup.closed && !settled) {
          settled = true;
          cleanup();
          reject(new Error('OAuth popup was closed before completing authorization'));
        }
      }, 1000);

      const cleanup = () => {
        clearTimeout(timeout);
        clearInterval(checkPopupClosed);
        window.removeEventListener('message', handleMessage);
        if (!popup.closed) {
          popup.close();
        }
      };

      window.addEventListener('message', handleMessage);
    });
  }

  /**
   * Save config to localStorage
   */
  private saveConfig(): void {
    if (this.config) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    }
  }

  /**
   * Load config from localStorage
   */
  private loadConfig(): void {
    try {
      let stored = localStorage.getItem(CONFIG_STORAGE_KEY);

      if (!stored) {
        const legacy = localStorage.getItem('github_integration_config');
        if (legacy) {
          stored = legacy;
          localStorage.setItem(CONFIG_STORAGE_KEY, legacy);
          localStorage.removeItem('github_integration_config');
        }
      }

      if (stored) {
        this.config = JSON.parse(stored);
        if (this.config && !this.config.branch) {
          this.config.branch = 'main';
        }
      }
    } catch (error) {
      console.error('[GitHub] Failed to load config:', error);
    }
  }

  /**
   * Disconnect and revoke token
   */
  async disconnect(): Promise<void> {
    try {
      const vault = await getTokenVault();
      const token = await vault.getToken(this.provider);

      if (token) {
        // Revoke token on GitHub
        try {
          await revokeGitHubToken(token.accessToken);
          console.log('[GitHub] Token revoked successfully');
        } catch (error) {
          console.warn('[GitHub] Token revocation failed (token may already be invalid):', error);
        }

        // Delete from vault
        await vault.deleteToken(this.provider);
      }

      // Clear config
      localStorage.removeItem('github_integration_config');

      this.status = 'disconnected';
      this.config = null;
    } catch (error) {
      console.error('[GitHub] Disconnect failed:', error);
      throw error;
    }
  }

  /**
   * Sync notes bundle to GitHub
   * 
   * Phase 2 TODO:
   * 1. Convert notes to markdown files with frontmatter
   * 2. Create/update files in repo via GitHub API
   * 3. Handle rate limiting
   * 4. Detect conflicts
   * 5. Commit changes
   */
  async sync(bundle: NotesBundle): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      if (this.status !== 'connected') {
        throw new Error('GitHub adapter not connected');
      }

      if (!this.config?.repoOwner || !this.config?.repoName) {
        throw new Error('GitHub repository not configured');
      }

      // Phase 1: Stub implementation
      // TODO Phase 2: Implement actual sync
      console.log(`[GitHub] Syncing ${bundle.notes.length} notes (Phase 2 implementation pending)`);

      // Phase 2: Sync logic
      // const vault = await getTokenVault();
      // const token = await vault.getToken(this.provider);
      // const synced = await this.syncNotesToGitHub(bundle, token!, this.config);

      const duration = Date.now() - startTime;

      return {
        success: true,
        notessynced: 0, // Phase 2: bundle.notes.length
        conflicts: [],
        errors: [],
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[GitHub] Sync failed:', error);

      return {
        success: false,
        notessynced: 0,
        conflicts: [],
        errors: [
          {
            code: 'SYNC_ERROR',
            message: error instanceof Error ? error.message : 'Unknown sync error',
            timestamp: new Date().toISOString(),
            details: error,
          },
        ],
        duration,
      };
    }
  }

  /**
   * Get current status
   */
  getStatus(): IntegrationStatus {
    return this.status;
  }

  /**
   * Get current config
   */
  getConfig(): IntegrationConfig | null {
    return this.config;
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<IntegrationConfig>): Promise<void> {
    const nextConfig: IntegrationConfig = {
      ...(this.config ?? {}),
      ...config,
    };

    if (!nextConfig.branch) {
      nextConfig.branch = 'main';
    }

    this.config = nextConfig;
    this.saveConfig();
  }

  /**
   * Resolve sync conflict
   * 
   * Phase 2 TODO:
   * 1. Compare timestamps and content hashes
   * 2. If preferLocal, overwrite remote
   * 3. If !preferLocal, use remote version
   * 4. Optionally keep conflict history
   */
  async resolveConflict(conflict: SyncConflict, preferLocal: boolean): Promise<Note> {
    // Phase 1: Simple resolution - always prefer local or remote
    return preferLocal ? conflict.localNote : conflict.remoteNote;
  }

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<SyncResult> {
    // For now, this just calls sync with empty bundle
    // Phase 2: Get current notes bundle from context
    return this.sync({ notes: [], tags: [], visionBoards: [] });
  }

  /**
   * Test connection and permissions
   */
  async testConnection(): Promise<boolean> {
    try {
      const vault = await getTokenVault();
      const token = await vault.getToken(this.provider);

      if (!token || vault.isTokenExpired(token)) {
        return false;
      }

      // TODO Phase 2: Make test API call to GitHub
      // const response = await fetch('https://api.github.com/user', {
      //   headers: { Authorization: `Bearer ${token.accessToken}` }
      // });
      // return response.ok;

      return this.status === 'connected';
    } catch (error) {
      console.error('[GitHub] Connection test failed:', error);
      return false;
    }
  }
}
