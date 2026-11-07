/** Cloud providers a user can bring a key for. */
export type CloudProviderId = 'gemini' | 'openai';

/** Storage key in localStorage. Keys never leave the browser except in requests to the provider itself. */
const STORAGE_KEY = 'photoditor-buddy:keys';

/**
 * Stores API keys in the browser's localStorage, lightly obfuscated (base64) so they are not
 * readable at a glance. This is NOT encryption: anyone with access to the device profile can
 * decode them, which is the accepted trade-off of a bring-your-own-key web app.
 */
export class KeyVault {
  private cache: Partial<Record<CloudProviderId, string>> | null = null;

  constructor(private readonly storage: Storage | null = safeStorage()) {}

  /** Returns the stored key or an empty string. */
  get(provider: CloudProviderId): string {
    return this.load()[provider] ?? '';
  }

  /** True when a non-empty key is stored. */
  has(provider: CloudProviderId): boolean {
    return this.get(provider).trim().length > 0;
  }

  /** Saves (or clears with an empty string) the key for a provider. */
  set(provider: CloudProviderId, key: string): void {
    const keys = this.load();
    const trimmed = key.trim();
    if (trimmed) keys[provider] = trimmed;
    else delete keys[provider];
    this.persist(keys);
  }

  /** Removes every stored key. */
  clear(): void {
    this.persist({});
  }

  private load(): Partial<Record<CloudProviderId, string>> {
    if (this.cache) return this.cache;
    let keys: Partial<Record<CloudProviderId, string>> = {};
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (raw) keys = JSON.parse(decode(raw)) as Partial<Record<CloudProviderId, string>>;
    } catch {
      keys = {};
    }
    this.cache = keys;
    return keys;
  }

  private persist(keys: Partial<Record<CloudProviderId, string>>): void {
    this.cache = keys;
    try {
      if (Object.keys(keys).length === 0) this.storage?.removeItem(STORAGE_KEY);
      else this.storage?.setItem(STORAGE_KEY, encode(JSON.stringify(keys)));
    } catch {
      // Private mode or blocked storage: keys live in memory for this session only.
    }
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function encode(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

function decode(text: string): string {
  return decodeURIComponent(escape(atob(text)));
}

/** Rough format checks so users get instant feedback when pasting a key. */
export function looksLikeKey(provider: CloudProviderId, key: string): boolean {
  const k = key.trim();
  if (provider === 'gemini') return /^AIza[0-9A-Za-z_-]{20,}$/.test(k);
  if (provider === 'openai') return /^sk-[A-Za-z0-9_-]{20,}$/.test(k);
  return k.length > 10;
}
