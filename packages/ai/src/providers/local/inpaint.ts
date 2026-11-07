import type * as OrtModule from 'onnxruntime-web';
import { AiError } from '../../errors';
import type { ProgressCallback } from '../../types';

/** LaMa ONNX weights (Apache-2.0). ~208 MB, fixed 512×512 input. */
export const LAMA_MODEL_URL = 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx';
const SIZE = 512;

type OrtSession = {
  inputNames: string[];
  outputNames: string[];
  run: (
    feeds: Record<string, unknown>,
  ) => Promise<Record<string, { data: Float32Array; dims: number[] }>>;
};
type Ort = typeof OrtModule;
let sessionPromise: Promise<{ ort: Ort; session: OrtSession }> | null = null;

async function loadLama(onProgress?: ProgressCallback): Promise<{ ort: Ort; session: OrtSession }> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import('onnxruntime-web');
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
      onProgress?.({ stage: 'Downloading eraser model (208 MB, once)…' });
      const cache = await caches.open('photoditor-buddy-models');
      let response = await cache.match(LAMA_MODEL_URL);
      if (!response) {
        response = await fetch(LAMA_MODEL_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await cache.put(LAMA_MODEL_URL, response.clone());
      }
      const buffer = await response.arrayBuffer();
      onProgress?.({ stage: 'Starting eraser model…' });
      const session = (await ort.InferenceSession.create(buffer, {
        executionProviders: ['webgpu', 'wasm'],
      })) as unknown as OrtSession;
      return { ort, session };
    })().catch((error: unknown) => {
      sessionPromise = null;
      throw new AiError(
        'model-download',
        `Could not load the eraser model: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    });
  }
  return sessionPromise;
}

/**
 * Removes whatever is under the white pixels of `mask` using LaMa, fully in the browser.
 * The region is processed at 512×512 around the mask and blended back, so the rest of the
 * photo keeps its full resolution.
 */
export async function inpaintLocally(
  source: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  onProgress?: ProgressCallback,
): Promise<HTMLCanvasElement> {
  const { ort, session } = await loadLama(onProgress);
  const bounds = maskBounds(mask);
  if (!bounds) throw new AiError('unknown', 'Paint over the area you want to remove first.');
  // Square crop around the mask, at least SIZE px, padded by 25%.
  const pad = Math.max(bounds.w, bounds.h) * 0.25;
  const side = Math.max(SIZE, Math.max(bounds.w, bounds.h) + pad * 2);
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const x0 = Math.round(Math.max(0, Math.min(source.width - side, cx - side / 2)));
  const y0 = Math.round(Math.max(0, Math.min(source.height - side, cy - side / 2)));
  const cropW = Math.min(side, source.width - x0);
  const cropH = Math.min(side, source.height - y0);

  const imgTile = document.createElement('canvas');
  imgTile.width = SIZE;
  imgTile.height = SIZE;
  imgTile.getContext('2d')!.drawImage(source, x0, y0, cropW, cropH, 0, 0, SIZE, SIZE);
  const maskTile = document.createElement('canvas');
  maskTile.width = SIZE;
  maskTile.height = SIZE;
  maskTile.getContext('2d')!.drawImage(mask, x0, y0, cropW, cropH, 0, 0, SIZE, SIZE);

  const img = imgTile.getContext('2d')!.getImageData(0, 0, SIZE, SIZE).data;
  const msk = maskTile.getContext('2d')!.getImageData(0, 0, SIZE, SIZE).data;
  const imageTensor = new Float32Array(3 * SIZE * SIZE);
  const maskTensor = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    imageTensor[i] = img[i * 4]! / 255;
    imageTensor[SIZE * SIZE + i] = img[i * 4 + 1]! / 255;
    imageTensor[2 * SIZE * SIZE + i] = img[i * 4 + 2]! / 255;
    maskTensor[i] = msk[i * 4 + 3]! > 127 ? 1 : 0;
  }
  onProgress?.({ stage: 'Erasing…' });
  const [imageName, maskName] = session.inputNames;
  if (!imageName || !maskName) throw new AiError('unknown', 'Unexpected eraser model inputs.');
  const feeds = {
    [imageName]: new ort.Tensor('float32', imageTensor, [1, 3, SIZE, SIZE]),
    [maskName]: new ort.Tensor('float32', maskTensor, [1, 1, SIZE, SIZE]),
  };
  const results = await session.run(feeds);
  const output = results[session.outputNames[0]!];
  if (!output) throw new AiError('unknown', 'The eraser model returned nothing.');
  const data = output.data;
  // The model outputs 0..1 (some exports use 0..255); detect and normalise.
  let max = 0;
  for (let i = 0; i < data.length; i += 97) max = Math.max(max, data[i]!);
  const scale = max > 1.5 ? 1 : 255;
  const outImage = new ImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    outImage.data[i * 4] = clamp255(data[i]! * scale);
    outImage.data[i * 4 + 1] = clamp255(data[SIZE * SIZE + i]! * scale);
    outImage.data[i * 4 + 2] = clamp255(data[2 * SIZE * SIZE + i]! * scale);
    outImage.data[i * 4 + 3] = 255;
  }
  const outTile = document.createElement('canvas');
  outTile.width = SIZE;
  outTile.height = SIZE;
  outTile.getContext('2d')!.putImageData(outImage, 0, 0);

  // Blend the inpainted tile back only where the mask is (feathered), keeping original pixels elsewhere.
  const result = document.createElement('canvas');
  result.width = source.width;
  result.height = source.height;
  const rctx = result.getContext('2d')!;
  rctx.drawImage(source, 0, 0);
  const patch = document.createElement('canvas');
  patch.width = cropW;
  patch.height = cropH;
  const pctx = patch.getContext('2d')!;
  pctx.filter = 'blur(2px)';
  pctx.drawImage(mask, x0, y0, cropW, cropH, 0, 0, cropW, cropH);
  pctx.filter = 'none';
  pctx.globalCompositeOperation = 'source-in';
  pctx.drawImage(outTile, 0, 0, SIZE, SIZE, 0, 0, cropW, cropH);
  rctx.drawImage(patch, x0, y0);
  return result;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/** Bounding box of non-transparent pixels in a mask canvas, or null when empty. */
export function maskBounds(
  mask: HTMLCanvasElement,
): { x: number; y: number; w: number; h: number } | null {
  const ctx = mask.getContext('2d')!;
  const { data } = ctx.getImageData(0, 0, mask.width, mask.height);
  let minX = mask.width,
    minY = mask.height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (data[(y * mask.width + x) * 4 + 3]! > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
