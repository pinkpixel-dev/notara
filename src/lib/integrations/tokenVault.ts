import { openDB, type IDBPDatabase } from 'idb';
import type { IntegrationProvider, OAuthToken, ITokenVault } from './types';

const DB_NAME = 'notara-integrations';
const DB_VERSION = 2; // Bump version to recreate tokens store with proper keyPath
const TOKENS_STORE = 'tokens';
const SALT_STORE = 'salt';

interface EncryptedToken {
  key: string; // Composite key: "provider:accountId"
  provider: IntegrationProvider;
  accountId: string; // GitHub login, email, or numeric ID
  encrypted: ArrayBuffer;
  iv: number[]; // Store as array for IndexedDB compatibility
  timestamp: number;
}

/**
 * Secure token storage using Web Crypto API for encryption
 * and IndexedDB for persistence
 */
export class TokenVault implements ITokenVault {
  private db: IDBPDatabase | null = null;
  private cryptoKey: CryptoKey | null = null;
  private salt: Uint8Array | null = null;

  /**
   * Initialize the token vault and crypto key
   */
  async initialize(): Promise<void> {
    // Check if Web Crypto API is available
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API is not available. Please ensure you are using HTTPS or localhost.');
    }

    await this.openDatabase();
    await this.initializeCryptoKey();
  }

  /**
   * Open or create the IndexedDB database
   */
  private async openDatabase(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Recreate tokens store with proper keyPath
        if (db.objectStoreNames.contains(TOKENS_STORE)) {
          db.deleteObjectStore(TOKENS_STORE);
        }
        const tokensStore = db.createObjectStore(TOKENS_STORE, { keyPath: 'key' });
        // Add index for looking up tokens by provider
        tokensStore.createIndex('by_provider', 'provider', { unique: false });
        
        // Salt store for key derivation
        if (!db.objectStoreNames.contains(SALT_STORE)) {
          db.createObjectStore(SALT_STORE);
        }
      },
    });
  }

  /**
   * Get or create a salt for key derivation
   */
  private async getOrCreateSalt(): Promise<Uint8Array> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let salt = await this.db.get(SALT_STORE, 'crypto-salt');
    
    if (!salt) {
      // Generate new salt
      salt = window.crypto.getRandomValues(new Uint8Array(16));
      await this.db.put(SALT_STORE, salt, 'crypto-salt');
    }

    return salt;
  }

  /**
   * Derive a crypto key from device-specific data
   */
  private async initializeCryptoKey(): Promise<void> {
    this.salt = await this.getOrCreateSalt();

    // Create a device fingerprint (basic approach)
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset().toString(),
      screen.width.toString(),
      screen.height.toString(),
    ].join('|');

    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(fingerprint),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.cryptoKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt token data
   */
  private async encryptToken(token: OAuthToken): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    if (!this.cryptoKey) {
      throw new Error('Crypto key not initialized');
    }

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(token));

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey,
      data
    );

    return { encrypted, iv };
  }

  /**
   * Decrypt token data
   */
  private async decryptToken(encrypted: ArrayBuffer, iv: Uint8Array): Promise<OAuthToken> {
    if (!this.cryptoKey) {
      throw new Error('Crypto key not initialized');
    }

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey,
      encrypted
    );

    const decoder = new TextDecoder();
    const json = decoder.decode(decrypted);
    return JSON.parse(json) as OAuthToken;
  }

  /**
   * Store an encrypted token
   * @param provider - Integration provider (e.g., 'github', 'google-drive')
   * @param accountId - Account identifier (e.g., GitHub username, email)
   * @param token - OAuth token to encrypt and store
   */
  async storeToken(provider: IntegrationProvider, accountId: string, token: OAuthToken): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const { encrypted, iv } = await this.encryptToken(token);

    const record: EncryptedToken = {
      key: `${provider}:${accountId}`, // Composite key for IndexedDB
      provider,
      accountId,
      encrypted,
      iv: Array.from(iv), // Convert Uint8Array to regular array for IndexedDB
      timestamp: Date.now(),
    };

    await this.db.put(TOKENS_STORE, record);
  }

  /**
   * Retrieve and decrypt a token
   * @param provider - Integration provider
   * @param accountId - Account identifier (optional, will get first token if not provided)
   */
  async getToken(provider: IntegrationProvider, accountId?: string): Promise<OAuthToken | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    let record: EncryptedToken | undefined;

    if (accountId) {
      // Get specific account token
      const key = `${provider}:${accountId}`;
      record = await this.db.get(TOKENS_STORE, key) as EncryptedToken | undefined;
    } else {
      // Get first token for provider (backward compatibility)
      const index = this.db.transaction(TOKENS_STORE).objectStore(TOKENS_STORE).index('by_provider');
      const cursor = await index.openCursor(IDBKeyRange.only(provider));
      if (cursor) {
        record = cursor.value as EncryptedToken;
      }
    }
    
    if (!record) {
      return null;
    }

    try {
      // Convert array back to Uint8Array
      const iv = new Uint8Array(record.iv);
      return await this.decryptToken(record.encrypted, iv);
    } catch (error) {
      console.error(`Failed to decrypt token for ${provider}:`, error);
      // If decryption fails, delete the corrupted token
      await this.deleteToken(provider, record.accountId);
      return null;
    }
  }

  /**
   * Delete a token
   * @param provider - Integration provider
   * @param accountId - Account identifier (optional, will delete all provider tokens if not provided)
   */
  async deleteToken(provider: IntegrationProvider, accountId?: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    if (accountId) {
      // Delete specific account token
      const key = `${provider}:${accountId}`;
      await this.db.delete(TOKENS_STORE, key);
    } else {
      // Delete all tokens for provider
      const tx = this.db.transaction(TOKENS_STORE, 'readwrite');
      const index = tx.objectStore(TOKENS_STORE).index('by_provider');
      let cursor = await index.openCursor(IDBKeyRange.only(provider));
      
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      
      await tx.done;
    }
  }

  /**
   * Check if a token exists
   * @param provider - Integration provider
   * @param accountId - Account identifier (optional)
   */
  async hasToken(provider: IntegrationProvider, accountId?: string): Promise<boolean> {
    // Be forgiving: try to initialize on-demand
    if (!this.db) {
      try {
        await this.initialize();
      } catch (e) {
        console.warn('[TokenVault] Auto-init failed in hasToken:', e);
        return false;
      }
    }
    if (!this.db) return false;

    if (accountId) {
      const key = `${provider}:${accountId}`;
      const record = await this.db.get(TOKENS_STORE, key);
      return record !== undefined;
    } else {
      try {
        // Check if any token exists for provider
        const tx = this.db.transaction(TOKENS_STORE);
        const index = tx.objectStore(TOKENS_STORE).index('by_provider');
        const cursor = await index.openCursor(IDBKeyRange.only(provider));
        await tx.done;
        return cursor !== null;
      } catch (e) {
        // If the index or store isn't ready yet, fail closed (no token)
        console.warn('[TokenVault] Index lookup failed in hasToken:', e);
        return false;
      }
    }
  }

  /**
   * Clear all stored tokens
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const tx = this.db.transaction(TOKENS_STORE, 'readwrite');
    await tx.objectStore(TOKENS_STORE).clear();
    await tx.done;
  }

  /**
   * Check if a token is expired
   */
  isTokenExpired(token: OAuthToken): boolean {
    if (!token.expiresAt) {
      return false;
    }

    // Add 5 minute buffer
    const buffer = 5 * 60 * 1000;
    return Date.now() >= (token.expiresAt - buffer);
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.cryptoKey = null;
    this.salt = null;
  }
}

// Singleton instance
let vaultInstance: TokenVault | null = null;

/**
 * Get the token vault singleton instance
 */
export async function getTokenVault(): Promise<TokenVault> {
  if (!vaultInstance) {
    vaultInstance = new TokenVault();
    await vaultInstance.initialize();
  }
  return vaultInstance;
}

/**
 * Close and reset the token vault
 */
export async function closeTokenVault(): Promise<void> {
  if (vaultInstance) {
    await vaultInstance.close();
    vaultInstance = null;
  }
}

/**
 * Reset token vault by deleting the database (dev/debug only)
 */
export async function resetTokenVault(): Promise<void> {
  if (vaultInstance) {
    await vaultInstance.close();
    vaultInstance = null;
  }
  
  return new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => {
      console.log('[TokenVault] Database deleted successfully');
      resolve();
    };
    req.onerror = () => {
      console.warn('[TokenVault] Database deletion error');
      resolve();
    };
    req.onblocked = () => {
      console.warn('[TokenVault] Database deletion blocked');
      resolve();
    };
  });
}
