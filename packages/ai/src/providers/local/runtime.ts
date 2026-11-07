import type * as Transformers from '@huggingface/transformers';
import type { ProgressCallback } from '../../types';

/** Model ids used by the free, in-browser features. All are MIT/Apache licensed. */
export const LOCAL_MODELS = {
  /** Portrait background removal, ~25 MB, Apache-2.0. */
  modnet: 'Xenova/modnet',
  /** General background removal, higher quality, larger download, MIT. */
  birefnet: 'onnx-community/BiRefNet_lite',
  /** 2× super-resolution, Apache-2.0. */
  swin2sr: 'Xenova/swin2SR-lightweight-x2-64',
} as const;

/** Detects WebGPU so heavy models run on the GPU when possible. */
export async function preferredDevice(): Promise<'webgpu' | 'wasm'> {
  try {
    const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } };
    if (nav.gpu && (await nav.gpu.requestAdapter())) return 'webgpu';
  } catch {
    // fall through
  }
  return 'wasm';
}

type TransformersModule = typeof Transformers;
let transformersPromise: Promise<TransformersModule> | null = null;

/** Loads Transformers.js once (dynamic import keeps it out of the main bundle). */
export function loadTransformers(): Promise<TransformersModule> {
  if (!transformersPromise) {
    transformersPromise = import('@huggingface/transformers').then((mod) => {
      // Models are fetched from the Hugging Face Hub and cached in the browser (Cache API).
      mod.env.allowLocalModels = false;
      mod.env.useBrowserCache = true;
      return mod;
    });
  }
  return transformersPromise;
}

/** Converts Transformers.js download callbacks into our progress shape. */
export function progressBridge(onProgress: ProgressCallback | undefined, label: string) {
  return (event: { status?: string; progress?: number; file?: string }): void => {
    if (!onProgress) return;
    if (event.status === 'progress' && typeof event.progress === 'number') {
      onProgress({ stage: `${label}: downloading model…`, progress: event.progress / 100 });
    } else if (event.status === 'ready') {
      onProgress({ stage: `${label}: model ready` });
    }
  };
}
