import { blobToCanvas, canvasToJpegBlob, canvasToPngBlob, limitCanvasSize } from './blob';
import { AiError, toAiError } from './errors';
import { GeminiProvider, type GeminiModelId } from './providers/gemini';
import { OpenAiProvider, type OpenAiModelId } from './providers/openai';
import { removeBackgroundLocally, type BackgroundModel } from './providers/local/backgroundRemoval';
import { inpaintLocally } from './providers/local/inpaint';
import { upscaleLocally } from './providers/local/upscale';
import type { AiTask, AiTaskOption } from './tasks';
import type { AspectRatio, ImageEditProvider, ProgressCallback } from './types';
import type { KeyVault, CloudProviderId } from './vault';

/** User preferences for AI, stored by the UI. */
export interface AiSettings {
  /** Which cloud provider to use for prompt-only tasks. */
  provider: CloudProviderId;
  geminiModel: GeminiModelId;
  openAiModel: OpenAiModelId;
  openAiQuality: 'low' | 'medium' | 'high';
  /** Local background model choice. */
  backgroundModel: BackgroundModel;
  /** Largest edge sent to cloud providers (keeps uploads small on mobile). */
  uploadMaxEdge: number;
}

/** Defaults: Gemini first (cheapest per edit, no server needed), OpenAI for masked edits. */
export function defaultAiSettings(): AiSettings {
  return {
    provider: 'gemini',
    geminiModel: 'gemini-3.1-flash-image',
    openAiModel: 'gpt-image-2.5-sunburst',
    openAiQuality: 'medium',
    backgroundModel: 'portrait',
    uploadMaxEdge: 2048,
  };
}

/** Input for `runAiTask`. */
export interface RunTaskInput {
  task: AiTask;
  /** The current rendered image. */
  image: HTMLCanvasElement;
  text?: string;
  option?: AiTaskOption;
  /** Mask canvas (same size as image): painted pixels have alpha > 0. */
  mask?: HTMLCanvasElement | null;
  settings: AiSettings;
  vault: KeyVault;
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}

/** Output: the new image and where it came from. */
export interface RunTaskOutput {
  canvas: HTMLCanvasElement;
  provider: CloudProviderId | 'local';
  model: string;
  note?: string;
}

/**
 * Decides which provider handles a task. Masked edits go to OpenAI when a key exists (it supports
 * real masks); otherwise the mask is turned into a description for Gemini.
 */
export function chooseProvider(
  task: AiTask,
  hasMask: boolean,
  settings: AiSettings,
  vault: KeyVault,
): CloudProviderId {
  if (hasMask && task.usesMask && vault.has('openai')) return 'openai';
  if (vault.has(settings.provider)) return settings.provider;
  if (vault.has('gemini')) return 'gemini';
  if (vault.has('openai')) return 'openai';
  return settings.provider;
}

/** Creates a provider instance from settings and the stored key. */
export function createProvider(
  id: CloudProviderId,
  settings: AiSettings,
  vault: KeyVault,
): ImageEditProvider {
  if (id === 'gemini') return new GeminiProvider(vault.get('gemini'), settings.geminiModel);
  return new OpenAiProvider(vault.get('openai'), settings.openAiModel, settings.openAiQuality);
}

/** Converts a painted mask (alpha > 0 = edit here) into OpenAI's convention (alpha 0 = edit here). */
export function invertMaskForOpenAi(
  mask: HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(mask, 0, 0, width, height);
  return out;
}

/** Runs any task end to end and returns the resulting canvas. Throws `AiError` on failure. */
export async function runAiTask(input: RunTaskInput): Promise<RunTaskOutput> {
  const { task, image, settings, vault, onProgress, signal } = input;
  try {
    if (task.runtime === 'local') {
      if (task.local === 'remove-background') {
        const canvas = await removeBackgroundLocally(image, settings.backgroundModel, onProgress);
        return {
          canvas,
          provider: 'local',
          model: settings.backgroundModel === 'portrait' ? 'MODNet' : 'BiRefNet-lite',
        };
      }
      if (task.local === 'upscale') {
        const canvas = await upscaleLocally(image, onProgress);
        return { canvas, provider: 'local', model: 'Swin2SR ×2' };
      }
      if (task.local === 'erase') {
        if (!input.mask)
          throw new AiError('unknown', 'Paint over the area you want to remove first.');
        const canvas = await inpaintLocally(image, input.mask, onProgress);
        return { canvas, provider: 'local', model: 'LaMa' };
      }
      throw new AiError('unsupported', 'This local task is not available.');
    }

    const hasMask = Boolean(input.mask);
    const providerId = chooseProvider(task, hasMask, settings, vault);
    if (!vault.has(providerId)) {
      throw new AiError(
        'missing-key',
        `This feature needs a ${providerId === 'gemini' ? 'Gemini' : 'OpenAI'} API key. Open Settings → AI keys to add one (it stays on this device).`,
      );
    }
    const provider = createProvider(providerId, settings, vault);
    const upload = limitCanvasSize(image, settings.uploadMaxEdge);
    const imageBlob =
      providerId === 'openai'
        ? await canvasToPngBlob(upload)
        : await canvasToJpegBlob(upload, 0.92);
    let prompt = task.buildPrompt({ text: input.text ?? '', option: input.option });
    let maskBlob: Blob | undefined;
    if (hasMask && input.mask) {
      if (provider.capabilities.masks) {
        maskBlob = await canvasToPngBlob(
          invertMaskForOpenAi(input.mask, upload.width, upload.height),
        );
      } else {
        prompt = `${prompt} The area to change is the region the user marked (roughly ${describeMaskRegion(input.mask)}).`;
      }
    }
    const aspectRatio: AspectRatio | undefined =
      task.id === 'ai-expand' && input.option ? (input.option.id as AspectRatio) : task.aspectRatio;
    const result = await provider.editImage({
      image: imageBlob,
      prompt,
      mask: maskBlob,
      aspectRatio,
      size: task.size,
      signal,
      onProgress,
      ...(providerId === 'openai' ? { width: upload.width, height: upload.height } : {}),
    } as Parameters<ImageEditProvider['editImage']>[0]);
    onProgress?.({ stage: 'Decoding result…' });
    const canvas = await blobToCanvas(result.blob);
    return { canvas, provider: result.provider, model: result.model, note: result.note };
  } catch (error) {
    throw toAiError(error);
  }
}

/** Describes where a mask sits ("upper left", "centre") so mask-less providers can target it. */
export function describeMaskRegion(mask: HTMLCanvasElement): string {
  const ctx = mask.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, mask.width, mask.height);
  let sx = 0,
    sy = 0,
    n = 0;
  for (let y = 0; y < mask.height; y += 4) {
    for (let x = 0; x < mask.width; x += 4) {
      if (data[(y * mask.width + x) * 4 + 3]! > 0) {
        sx += x;
        sy += y;
        n++;
      }
    }
  }
  if (n === 0) return 'the centre';
  const cx = sx / n / mask.width;
  const cy = sy / n / mask.height;
  const v = cy < 0.33 ? 'upper' : cy > 0.66 ? 'lower' : 'middle';
  const h = cx < 0.33 ? 'left' : cx > 0.66 ? 'right' : 'centre';
  return v === 'middle' && h === 'centre' ? 'the centre' : `${v} ${h}`;
}
