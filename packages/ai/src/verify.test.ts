import { describe, expect, it } from 'vitest';
import { verifyKey } from './verify';

describe('verifyKey', () => {
  it('reports ok for 200 and rejection for 401', async () => {
    const ok = await verifyKey(
      'gemini',
      'k',
      (async () => new Response('{}', { status: 200 })) as unknown as typeof fetch,
    );
    expect(ok.ok).toBe(true);
    const bad = await verifyKey(
      'openai',
      'k',
      (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch,
    );
    expect(bad.ok).toBe(false);
    const down = await verifyKey('openai', 'k', (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch);
    expect(down.ok).toBe(false);
  });
});
