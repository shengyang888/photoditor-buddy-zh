/** Machine-readable reasons an AI call can fail. The UI maps these to actions (e.g. "open Settings"). */
export type AiErrorCode =
  | 'missing-key'
  | 'invalid-key'
  | 'quota'
  | 'safety'
  | 'network'
  | 'unsupported'
  | 'no-image'
  | 'model-download'
  | 'cancelled'
  | 'unknown';

/** Error thrown by every provider. `message` is always safe to show to end users. */
export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

/** Converts an HTTP status from a cloud provider into a friendly `AiError`. */
export function errorFromStatus(provider: string, status: number, body: string): AiError {
  const detail = body.slice(0, 300);
  if (status === 401 || status === 403)
    return new AiError(
      'invalid-key',
      `${provider} rejected the API key. Open Settings and check the key.`,
      detail,
    );
  if (status === 429)
    return new AiError(
      'quota',
      `${provider} rate limit or quota reached. Wait a moment or check billing.`,
      detail,
    );
  if (status === 400 && /safety|blocked|policy|moderation/i.test(body))
    return new AiError(
      'safety',
      `${provider} declined this request for safety reasons. Try a different prompt or image.`,
      detail,
    );
  if (status === 400)
    return new AiError(
      'unknown',
      `${provider} did not accept the request: ${extractMessage(body) || 'bad request'}.`,
      detail,
    );
  if (status >= 500)
    return new AiError(
      'network',
      `${provider} is having trouble right now (HTTP ${status}). Please try again.`,
      detail,
    );
  return new AiError(
    'unknown',
    `${provider} returned HTTP ${status}: ${extractMessage(body) || 'unknown error'}.`,
    detail,
  );
}

/** Pulls a human message out of a JSON error body when possible. */
export function extractMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
    if (typeof parsed.error === 'string') return parsed.error;
    return parsed.error?.message ?? parsed.message ?? '';
  } catch {
    return '';
  }
}

/** Wraps unexpected errors so the UI always gets an `AiError`. */
export function toAiError(error: unknown, fallback = 'Something went wrong.'): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return new AiError(
      'network',
      'Could not reach the AI service. Check your internet connection.',
      error,
    );
  }
  if (error instanceof DOMException && error.name === 'AbortError')
    return new AiError('cancelled', 'Cancelled.', error);
  return new AiError('unknown', error instanceof Error ? error.message : fallback, error);
}
