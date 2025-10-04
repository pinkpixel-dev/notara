# 🔄 Notara Integration System

> **Status**: Phase 1 Complete | Phase 2 (GitHub) In Progress

## Overview

The Notara Integration System provides a secure, extensible framework for syncing your notes with external platforms. This system supports multiple providers through a common adapter pattern, secure token storage, and intelligent sync orchestration.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                   Integration System                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   GitHub     │  │ Google Drive │  │   Dropbox    │ │
│  │   Adapter    │  │   Adapter    │  │   Adapter    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│  ┌──────┴──────────────────┴──────────────────┴─────┐  │
│  │          Integration Context (State)              │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           │                             │
│  ┌────────────────────────┴──────────────────────────┐  │
│  │         Sync Orchestrator (Queue, Retry)          │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           │                             │
│  ┌────────────────────────┴──────────────────────────┐  │
│  │    Token Vault (Encrypted IndexedDB Storage)      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key Features

#### 🔒 Secure Token Storage
- **Web Crypto API encryption**: All OAuth tokens encrypted with AES-GCM
- **Device fingerprinting**: Encryption key derived from device characteristics
- **IndexedDB persistence**: Tokens stored client-side with zero backend dependency
- **Auto-expiry handling**: Automatically detects and manages expired tokens

#### 🔄 Intelligent Sync Orchestration
- **Debounced syncing**: Prevents excessive API calls during rapid edits
- **Queue management**: Manages concurrent sync operations safely
- **Exponential backoff**: Automatic retry with increasing delays on failures
- **Conflict detection**: Identifies when local and remote versions diverge

#### 🎨 Rich UI Components
- **Status indicators**: Real-time connection and sync status visualization
- **Integration cards**: User-friendly configuration interfaces
- **Error handling**: Clear error messages with actionable recovery steps
- **Metrics dashboard**: Track sync success rates and performance

#### 🧩 Extensible Adapter Pattern
- **Provider-agnostic**: Easy to add new integration providers
- **Common interface**: Consistent API across all adapters
- **Async-first**: Built for modern async/await patterns
- **Type-safe**: Full TypeScript coverage

## Supported Providers

| Provider      | Status          | OAuth | Sync  | Notes                    |
|---------------|-----------------|-------|-------|--------------------------|
| GitHub        | Phase 2 (OAuth) | ✅    | 🚧    | Repo-based markdown sync |
| Google Drive  | Phase 3 (Stub)  | ❌    | ❌    | Folder-based sync        |
| Dropbox       | Phase 3 (Stub)  | ❌    | ❌    | Folder-based sync        |

### Legend
- ✅ Implemented
- 🚧 In Progress
- ❌ Not Started

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Global integrations toggle
VITE_ENABLE_INTEGRATIONS=true

# Provider-specific toggles
VITE_ENABLE_GITHUB_INTEGRATION=true
VITE_ENABLE_GOOGLE_DRIVE_INTEGRATION=false
VITE_ENABLE_DROPBOX_INTEGRATION=false

# OAuth Credentials (Phase 2+)
VITE_GITHUB_OAUTH_CLIENT_ID=your_github_client_id
VITE_GOOGLE_DRIVE_API_KEY=your_google_api_key
VITE_DROPBOX_APP_KEY=your_dropbox_app_key
```

### Feature Flags

Integrations can be toggled at multiple levels:

1. **Global**: `VITE_ENABLE_INTEGRATIONS` - Master switch
2. **Per-Provider**: Individual provider flags
3. **Runtime**: Providers can be disconnected without disabling the flag

## Usage

### For Users

#### Connecting an Integration

1. Navigate to **Settings** → **Integrations**
2. Find the integration card (e.g., GitHub)
3. Click **Connect**
4. Complete the OAuth flow in the popup window
5. Configure provider-specific settings (e.g., GitHub repository details)
6. Your notes will now sync automatically!

#### Disconnecting

1. Go to the integration card in Settings
2. Click **Disconnect**
3. Confirm the disconnection
4. Your local notes remain untouched

#### Manual Sync

To force an immediate sync:
1. Go to the integration card
2. Click **Sync Now**
3. Watch the status indicator for progress

##### GitHub repository tips
- Create the target repository in GitHub first—Notara does not create repos automatically (yet).
- In **Repository Settings**, enter the owner (user or org), repository name, and branch, then press **Save Repository**.
- Sync controls stay disabled until owner and repository are provided, preventing accidental background sync failures.

### For Developers

#### Adding a New Provider

1. **Create the Adapter**:

```typescript
// src/lib/integrations/adapters/MyProviderAdapter.ts
import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationStatus,
  SyncResult,
} from '../types';

export class MyProviderAdapter implements IntegrationAdapter {
  readonly provider = 'my-provider' as const;
  private status: IntegrationStatus = 'disconnected';

  async connect(): Promise<boolean> {
    // Implement OAuth flow
    this.status = 'connected';
    return true;
  }

  async disconnect(): Promise<void> {
    // Clean up tokens and state
    this.status = 'disconnected';
  }

  async sync(bundle: NotesBundle): Promise<SyncResult> {
    // Implement sync logic
    return {
      success: true,
      notessynced: bundle.notes.length,
      conflicts: [],
      errors: [],
      duration: 0,
    };
  }

  // Implement remaining interface methods...
}
```

2. **Register the Adapter**:

```typescript
// src/context/IntegrationContext.tsx
import { MyProviderAdapter } from '@/lib/integrations/adapters/MyProviderAdapter';

// In IntegrationProvider, register on mount:
useEffect(() => {
  const myProviderAdapter = new MyProviderAdapter();
  adaptersRef.current.set('my-provider', myProviderAdapter);
}, []);
```

3. **Add Environment Variables**:

```bash
# .env
VITE_ENABLE_MY_PROVIDER_INTEGRATION=true
VITE_MY_PROVIDER_OAUTH_CLIENT_ID=your_client_id
```

4. **Update Types**:

```typescript
// src/lib/integrations/types.ts
export type IntegrationProvider = 
  | 'github'
  | 'google-drive'
  | 'dropbox'
  | 'my-provider'; // Add here
```

## API Reference

### IntegrationAdapter Interface

```typescript
interface IntegrationAdapter {
  readonly provider: IntegrationProvider;
  
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  sync(bundle: NotesBundle): Promise<SyncResult>;
  getStatus(): IntegrationStatus;
  getConfig(): IntegrationConfig | null;
  updateConfig(config: Partial<IntegrationConfig>): Promise<void>;
  resolveConflict(conflict: SyncConflict, preferLocal: boolean): Promise<Note>;
  manualSync(): Promise<SyncResult>;
  testConnection(): Promise<boolean>;
}
```

### IntegrationContext

```typescript
interface IIntegrationContext {
  integrations: Map<IntegrationProvider, IntegrationState>;
  isInitialized: boolean;
  
  connectIntegration(provider: IntegrationProvider): Promise<boolean>;
  disconnectIntegration(provider: IntegrationProvider): Promise<void>;
  getIntegrationState(provider: IntegrationProvider): IntegrationState | null;
  updateIntegrationConfig(provider: IntegrationProvider, config: Partial<IntegrationConfig>): Promise<void>;
  manualSync(provider: IntegrationProvider): Promise<SyncResult>;
  resolveConflict(provider: IntegrationProvider, conflict: SyncConflict, preferLocal: boolean): Promise<Note>;
  
  isIntegrationEnabled(provider: IntegrationProvider): boolean;
  areIntegrationsEnabled(): boolean;
}
```

### SyncOrchestrator

```typescript
class SyncOrchestrator {
  registerAdapter(provider: IntegrationProvider, adapter: IntegrationAdapter): void;
  enqueueSync(provider: IntegrationProvider, bundle: NotesBundle): Promise<void>;
  syncAll(bundle: NotesBundle): Promise<Map<IntegrationProvider, SyncResult>>;
  cancelAll(): void;
  getPendingCount(): number;
}
```

## Security Considerations

### Token Storage

✅ **What We Do**:
- Encrypt all tokens with AES-GCM before storage
- Derive encryption key from device fingerprint
- Store encrypted tokens in IndexedDB (client-side only)
- Never send tokens to our servers
- Auto-expire and remove stale tokens

❌ **What We Don't Do**:
- Store tokens in localStorage (vulnerable to XSS)
- Send tokens to backend servers
- Log token values in console or analytics
- Share tokens across devices

### OAuth Best Practices

- Use PKCE (Proof Key for Code Exchange) for OAuth flows
- Implement state parameter for CSRF protection
- Validate redirect URIs strictly
- Request minimal necessary scopes
- Handle token refresh securely

### Conflict Resolution

When conflicts are detected:
1. Show diff view to user
2. Let user choose: local, remote, or merge
3. Track conflict resolution metrics
4. Log conflicts for debugging (without sensitive data)

## Troubleshooting

### Common Issues

#### "Integration not connecting"

**Cause**: OAuth client ID not configured or invalid

**Solution**:
1. Check `.env` file has correct client ID
2. Verify OAuth app is configured correctly on provider's side
3. Check browser console for specific error messages
4. Ensure redirect URI matches OAuth app settings

#### "Sync failing repeatedly"

**Cause**: Token expired or network issues

**Solution**:
1. Disconnect and reconnect the integration
2. Check browser DevTools Network tab for API errors
3. Verify internet connection is stable
4. Check provider's API status page

#### "Conflicts showing up"

**Cause**: Notes edited in multiple locations

**Solution**:
1. Use conflict resolution UI to merge changes
2. Consider using single device for editing
3. Wait for sync completion before switching devices

#### "Permission denied errors"

**Cause**: OAuth scopes insufficient

**Solution**:
1. Disconnect integration
2. Reconnect to re-trigger OAuth with correct scopes
3. Check provider adapter for required scope list

### Debug Mode

Enable verbose logging:

```typescript
// In browser console
localStorage.setItem('notara:integrations:debug', 'true');
```

This will log:
- OAuth flow steps
- Sync queue operations
- Token vault operations
- Adapter lifecycle events

## Roadmap

### Phase 2: GitHub Integration (Current)
- [x] Adapter stub with OAuth structure
- [x] Implement GitHub OAuth flow (PKCE + popup callback)
- [x] Repository configuration fields in Settings (manual owner/name/branch entry)
- [ ] Repository picker UI with GitHub API search
- [ ] Markdown file creation/update
- [ ] Conflict detection and resolution
- [ ] Rate limiting handling
- [ ] Commit message customization

### Phase 3: Cloud Storage
- [ ] Google Drive OAuth and sync
- [ ] Dropbox OAuth and sync
- [ ] Folder structure management
- [ ] File format options (MD, JSON, ZIP)

### Phase 4: Advanced Features
- [ ] Two-way sync (import from providers)
- [ ] Selective sync (choose which notes/tags)
- [ ] Sync scheduling (hourly, daily, manual only)
- [ ] Sync history and rollback
- [ ] Multi-device conflict resolution strategies
- [ ] Webhook support for real-time sync

### Phase 5: Additional Providers
- [ ] Notion integration
- [ ] Obsidian sync bridge
- [ ] Joplin export/import
- [ ] WebDAV support
- [ ] S3-compatible storage

## Contributing

We welcome contributions to the integration system! Here's how:

1. **Pick a Provider**: Choose from roadmap or propose new one
2. **Implement Adapter**: Follow the adapter pattern
3. **Add Tests**: Include unit and integration tests
4. **Update Docs**: Document your provider
5. **Submit PR**: Include examples and migration notes

### Code Style

- Use TypeScript strict mode
- Follow existing patterns in codebase
- Add JSDoc comments for public APIs
- Include error handling for all async operations
- Log operations for debugging (without sensitive data)

## License

The Notara Integration System is part of Notara and licensed under [Apache 2.0](../LICENSE).

## Support

- 📖 [Full Documentation](../README.md)
- 💬 [Discord Community](#)
- 🐛 [Report Issues](https://github.com/yourusername/notara/issues)
- 📧 [Email Support](mailto:support@notara.app)

---

**Made with ❤️ by Pink Pixel**  
*Dream it, Pixel it™*
