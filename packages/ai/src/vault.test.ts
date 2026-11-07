import { beforeEach, describe, expect, it } from 'vitest';
import { KeyVault, looksLikeKey } from './vault';

describe('KeyVault', () => {
  beforeEach(() => localStorage.clear());

  it('stores, reads, and clears keys per provider', () => {
    const vault = new KeyVault();
    expect(vault.has('gemini')).toBe(false);
    vault.set('gemini', '  AIzaTestKey1234567890abcdefghij  ');
    expect(vault.get('gemini')).toBe('AIzaTestKey1234567890abcdefghij');
    expect(vault.has('gemini')).toBe(true);
    // A fresh instance reads the same storage.
    expect(new KeyVault().get('gemini')).toBe('AIzaTestKey1234567890abcdefghij');
    // Stored value is not plain text.
    expect(localStorage.getItem('photoditor-buddy:keys')).not.toContain('AIzaTestKey');
    vault.set('gemini', '');
    expect(vault.has('gemini')).toBe(false);
    vault.set('openai', 'sk-abc');
    vault.clear();
    expect(new KeyVault().has('openai')).toBe(false);
  });

  it('works without storage (private mode)', () => {
    const vault = new KeyVault(null);
    vault.set('openai', 'sk-xyz');
    expect(vault.get('openai')).toBe('sk-xyz');
  });

  it('checks key formats loosely', () => {
    expect(looksLikeKey('gemini', 'AIzaSyA1234567890abcdefghijklmnop')).toBe(true);
    expect(looksLikeKey('gemini', 'hello')).toBe(false);
    expect(looksLikeKey('openai', 'sk-proj-abcdefghijklmnopqrstuvwxyz')).toBe(true);
  });
});
