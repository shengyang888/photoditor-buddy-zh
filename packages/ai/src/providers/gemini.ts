import { base64ToBlob, blobToBase64 } from '../blob';
import { AiError, errorFromStatus, toAiError } from '../errors';
import type {
  ImageEditProvider,
  ImageEditRequest,
  ImageEditResult,
  ProviderCapabilities,
} from '../types';

/** Gemini image models offered in Settings. Prices are per output image (USD, Sept 2026). */
export const GEMINI_MODELS = [
  {
    id: 'gemini-3.1-flash-image',
    label: 'Gemini 3.1 Flash Image（推荐）',
    price: '每张 1K 图约 $0.07',
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    label: 'Gemini 3.1 Flash Lite Image（最便宜，仅 1K）',
    price: '每张约 $0.03',
  },
  {
    id: 'gemini-3-pro-image',
    label: 'Gemini 3 Pro Image（画质最好）',
    price: '每张约 $0.13',
  },
] as const;

export type GeminiModelId = (typeof GEMINI_MODELS)[number]['id'];

/** Base URL of the Gemini REST API. Overridable for tests and proxies. */
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  inline_data?: { mime_type: string; data: string };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/** Builds the JSON body for a `generateContent` image-edit request. Exported for tests. */
export async function buildGeminiBody(
  request: ImageEditRequest,
  model: GeminiModelId,
): Promise<Record<string, unknown>> {
  const parts: GeminiPart[] = [{ text: request.prompt }];
  parts.push({
    inline_data: {
      mime_type: request.image.type || 'image/png',
      data: await blobToBase64(request.image),
    },
  });
  for (const ref of request.references ?? []) {
    parts.push({
      inline_data: { mime_type: ref.type || 'image/png', data: await blobToBase64(ref) },
    });
  }
  const imageConfig: Record<string, string> = {};
  if (request.aspectRatio) imageConfig.aspectRatio = request.aspectRatio;
  if (request.size && model !== 'gemini-3.1-flash-lite-image') imageConfig.imageSize = request.size;
  return {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      ...(Object.keys(imageConfig).length ? { imageConfig } : {}),
    },
  };
}

/**
 * Google Gemini image provider. Calls the REST API directly from the browser with the user's
 * key in the `x-goog-api-key` header; no server is involved.
 */
export class GeminiProvider implements ImageEditProvider {
  readonly id = 'gemini' as const;
  readonly label = 'Google Gemini';
  readonly capabilities: ProviderCapabilities = {
    masks: false,
    aspectRatio: true,
    sizes: ['1K', '2K', '4K'],
    references: true,
  };

  constructor(
    private readonly apiKey: string,
    private readonly model: GeminiModelId = 'gemini-3.1-flash-image',
    private readonly baseUrl: string = GEMINI_API_BASE,
    private readonly fetchImpl: typeof fetch = (input, init) => globalThis.fetch(input, init),
  ) {}

  async editImage(request: ImageEditRequest): Promise<ImageEditResult> {
    if (!this.apiKey)
      throw new AiError('missing-key', 'Add your Gemini API key in Settings first.');
    request.onProgress?.({ stage: 'Uploading to Gemini…' });
    const body = await buildGeminiBody(request, this.model);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/models/${this.model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify(body),
        signal: request.signal ?? null,
      });
    } catch (error) {
      throw toAiError(error);
    }
    if (!response.ok) throw errorFromStatus('Gemini', response.status, await response.text());
    request.onProgress?.({ stage: 'Receiving image…' });
    const json = (await response.json()) as GeminiResponse;
    if (json.promptFeedback?.blockReason) {
      throw new AiError(
        'safety',
        `Gemini blocked this request (${json.promptFeedback.blockReason}). Try another prompt or photo.`,
      );
    }
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    let note = '';
    for (const part of parts) {
      const inline =
        part.inlineData ??
        (part.inline_data
          ? { mimeType: part.inline_data.mime_type, data: part.inline_data.data }
          : undefined);
      if (inline?.data) {
        return {
          blob: base64ToBlob(inline.data, inline.mimeType || 'image/png'),
          provider: 'gemini',
          model: this.model,
          note: note || undefined,
        };
      }
      if (part.text) note += part.text;
    }
    const reason = json.candidates?.[0]?.finishReason;
    throw new AiError(
      'unknown',
      note
        ? `Gemini replied without an image: ${note.slice(0, 200)}`
        : `Gemini returned no image${reason ? ` (${reason})` : ''}. Try rephrasing.`,
    );
  }
}
