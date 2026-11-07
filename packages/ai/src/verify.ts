import { GEMINI_API_BASE } from './providers/gemini';
import { OPENAI_API_BASE } from './providers/openai';
import type { CloudProviderId } from './vault';

/**
 * Checks a key with a free, read-only request (model listing). Returns a friendly message.
 * No image is generated, so this costs nothing.
 */
export async function verifyKey(
  provider: CloudProviderId,
  key: string,
  fetchImpl: typeof fetch = (input, init) => globalThis.fetch(input, init),
): Promise<{ ok: boolean; message: string }> {
  try {
    const response =
      provider === 'gemini'
        ? await fetchImpl(`${GEMINI_API_BASE}/models?pageSize=1`, {
            headers: { 'x-goog-api-key': key },
          })
        : await fetchImpl(`${OPENAI_API_BASE}/models`, {
            headers: { Authorization: `Bearer ${key}` },
          });
    if (response.ok) return { ok: true, message: 'Key works.' };
    if (response.status === 401 || response.status === 403 || response.status === 400)
      return {
        ok: false,
        message: 'The key was rejected. Copy it again from the provider website.',
      };
    if (response.status === 429)
      return { ok: true, message: 'Key accepted, but you are rate limited right now.' };
    return { ok: false, message: `Unexpected response (HTTP ${response.status}).` };
  } catch {
    return { ok: false, message: 'Could not reach the provider. Check your internet connection.' };
  }
}
