import { base64ToBlob } from '../blob';
import { AiError, errorFromStatus, toAiError } from '../errors';
import type {
  ImageEditProvider,
  ImageEditRequest,
  ImageEditResult,
  ProviderCapabilities,
} from '../types';

/** OpenAI image models offered in Settings (Sept 2026). */
export const OPENAI_MODELS = [
  {
    id: 'gpt-image-2.5-sunburst',
    label: 'GPT Image 2.5 Sunburst（精修，推荐）',
    price: '每次中等编辑约 $0.02',
  },
  {
    id: 'gpt-image-2.5-flare',
    label: 'GPT Image 2.5 Flare（快速）',
    price: '每次中等编辑约 $0.02',
  },
  { id: 'gpt-image-2', label: 'GPT Image 2', price: '每次中等编辑约 $0.02' },
] as const;

export type OpenAiModelId = (typeof OPENAI_MODELS)[number]['id'];

export const OPENAI_API_BASE = 'https://api.openai.com/v1';

/** Picks the closest supported output size for the source aspect ratio. */
export function openAiSizeFor(
  width: number,
  height: number,
): '1024x1024' | '1536x1024' | '1024x1536' {
  const ratio = width / height;
  if (ratio > 1.2) return '1536x1024';
  if (ratio < 0.83) return '1024x1536';
  return '1024x1024';
}

/** Builds the multipart form for `/images/edits`. Exported for tests. */
export function buildOpenAiForm(
  request: ImageEditRequest,
  model: OpenAiModelId,
  size: string,
  quality: string,
): FormData {
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', request.prompt);
  form.append('image', request.image, 'image.png');
  if (request.mask) form.append('mask', request.mask, 'mask.png');
  for (const ref of request.references ?? []) form.append('image[]', ref, 'reference.png');
  form.append('size', size);
  form.append('quality', quality);
  form.append('n', '1');
  form.append('input_fidelity', 'high');
  return form;
}

/**
 * OpenAI image provider (masked edits). The browser calls api.openai.com directly with the
 * user's key as a bearer token. Results are requested as base64 to avoid CORS on result URLs.
 */
export class OpenAiProvider implements ImageEditProvider {
  readonly id = 'openai' as const;
  readonly label = 'OpenAI';
  readonly capabilities: ProviderCapabilities = {
    masks: true,
    aspectRatio: false,
    sizes: ['1K'],
    references: true,
  };

  constructor(
    private readonly apiKey: string,
    private readonly model: OpenAiModelId = 'gpt-image-2.5-sunburst',
    private readonly quality: 'low' | 'medium' | 'high' = 'medium',
    private readonly baseUrl: string = OPENAI_API_BASE,
    private readonly fetchImpl: typeof fetch = (input, init) => globalThis.fetch(input, init),
  ) {}

  async editImage(
    request: ImageEditRequest & { width?: number; height?: number },
  ): Promise<ImageEditResult> {
    if (!this.apiKey)
      throw new AiError('missing-key', 'Add your OpenAI API key in Settings first.');
    request.onProgress?.({ stage: 'Uploading to OpenAI…' });
    const size = openAiSizeFor(request.width ?? 1, request.height ?? 1);
    const form = buildOpenAiForm(request, this.model, size, this.quality);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/images/edits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
        signal: request.signal ?? null,
      });
    } catch (error) {
      throw toAiError(error);
    }
    if (!response.ok) throw errorFromStatus('OpenAI', response.status, await response.text());
    request.onProgress?.({ stage: 'Receiving image…' });
    const json = (await response.json()) as { data?: { b64_json?: string; url?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new AiError('unknown', 'OpenAI returned no image data.');
    return { blob: base64ToBlob(b64, 'image/png'), provider: 'openai', model: this.model };
  }
}
