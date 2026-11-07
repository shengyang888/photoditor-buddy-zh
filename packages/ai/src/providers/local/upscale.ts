import { AiError } from '../../errors';
import type { ProgressCallback } from '../../types';
import { LOCAL_MODELS, loadTransformers, preferredDevice, progressBridge } from './runtime';

/** Tile edge used for super-resolution so large photos fit in memory. */
const TILE = 384;
const OVERLAP = 16;

/**
 * Doubles the resolution of a canvas with Swin2SR (free, in-browser). Large images are processed
 * in overlapping tiles and stitched back together. First use downloads roughly 150 MB.
 */
export async function upscaleLocally(
  source: HTMLCanvasElement,
  onProgress?: ProgressCallback,
): Promise<HTMLCanvasElement> {
  const tf = await loadTransformers();
  const device = await preferredDevice();
  let upscaler: Awaited<ReturnType<typeof tf.pipeline>>;
  try {
    upscaler = await tf.pipeline('image-to-image', LOCAL_MODELS.swin2sr, {
      device,
      progress_callback: progressBridge(onProgress, 'Upscale'),
    });
  } catch (error) {
    throw new AiError(
      'model-download',
      `Could not load the upscale model: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }
  const out = document.createElement('canvas');
  out.width = source.width * 2;
  out.height = source.height * 2;
  const octx = out.getContext('2d')!;
  const cols = Math.ceil(source.width / TILE);
  const rows = Math.ceil(source.height / TILE);
  let done = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = Math.max(0, c * TILE - OVERLAP);
      const y0 = Math.max(0, r * TILE - OVERLAP);
      const x1 = Math.min(source.width, (c + 1) * TILE + OVERLAP);
      const y1 = Math.min(source.height, (r + 1) * TILE + OVERLAP);
      const tile = document.createElement('canvas');
      tile.width = x1 - x0;
      tile.height = y1 - y0;
      tile
        .getContext('2d')!
        .drawImage(source, x0, y0, tile.width, tile.height, 0, 0, tile.width, tile.height);
      const input = await tf.RawImage.fromCanvas(tile);
      const result = (await (upscaler as unknown as (img: unknown) => Promise<unknown>)(input)) as
        | { width: number; height: number; rgba: () => { data: Uint8Array } }
        | { width: number; height: number; rgba: () => { data: Uint8Array } }[];
      const image = Array.isArray(result) ? result[0]! : result;
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = image.width;
      tileCanvas.height = image.height;
      const tctx = tileCanvas.getContext('2d')!;
      const data = tctx.createImageData(image.width, image.height);
      data.data.set(image.rgba().data);
      tctx.putImageData(data, 0, 0);
      // Crop away the overlap (scaled ×2) and paste into place.
      const innerX = (c * TILE - x0) * 2;
      const innerY = (r * TILE - y0) * 2;
      const innerW = Math.min(TILE, source.width - c * TILE) * 2;
      const innerH = Math.min(TILE, source.height - r * TILE) * 2;
      octx.drawImage(
        tileCanvas,
        innerX,
        innerY,
        innerW,
        innerH,
        c * TILE * 2,
        r * TILE * 2,
        innerW,
        innerH,
      );
      done++;
      onProgress?.({
        stage: `Upscaling… tile ${done}/${rows * cols}`,
        progress: done / (rows * cols),
      });
    }
  }
  return out;
}
