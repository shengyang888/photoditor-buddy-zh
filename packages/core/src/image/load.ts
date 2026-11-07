/** Supported input image MIME types. HEIC is accepted where the browser can decode it (Safari). */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
  'image/heic',
  'image/heif',
];

/** Largest edge (in pixels) used for on-screen preview. Full resolution is used only for export. */
export const PREVIEW_MAX_EDGE = 2048;

/** Result of decoding a file: the bitmap plus the original metadata we need later. */
export interface LoadedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  fileName: string;
  mimeType: string;
}

/**
 * Decodes a `File`/`Blob` into an `ImageBitmap`, honouring EXIF orientation so phone photos
 * are not sideways. Throws a friendly error for unsupported or corrupt files.
 */
export async function loadImageFromBlob(blob: Blob, fileName = 'image'): Promise<LoadedImage> {
  if (blob.size === 0) throw new Error('The selected file is empty.');
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    return {
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      fileName,
      mimeType: blob.type || 'image/png',
    };
  } catch {
    throw new Error(
      `Could not read "${fileName}". Please use a JPG, PNG, WebP, GIF, BMP or AVIF photo.`,
    );
  }
}

/** Fetches a URL (same-origin or CORS-enabled) and decodes it. Used by the SDK `loadImage(url)` call. */
export async function loadImageFromUrl(url: string): Promise<LoadedImage> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error(`Could not download image (${response.status}).`);
  const blob = await response.blob();
  const name = url.split('/').pop()?.split('?')[0] || 'image';
  return loadImageFromBlob(blob, name);
}

/** Computes the size that fits `width`×`height` inside a square of `maxEdge`, never upscaling. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number; scale: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height, scale: 1 };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/**
 * Draws a bitmap onto a fresh canvas at the given size using high-quality resampling.
 * Returns an `HTMLCanvasElement` so the result can be used both by WebGL and Canvas 2D code.
 */
export function bitmapToCanvas(
  source: ImageBitmap | HTMLCanvasElement | HTMLImageElement | OffscreenCanvas,
  width = source.width,
  height = source.height,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/** Creates a downscaled preview canvas (longest edge ≤ `PREVIEW_MAX_EDGE`). */
export function makePreviewCanvas(
  source: ImageBitmap | HTMLCanvasElement,
  maxEdge = PREVIEW_MAX_EDGE,
): HTMLCanvasElement {
  const size = fitWithin(source.width, source.height, maxEdge);
  return bitmapToCanvas(source, size.width, size.height);
}

/** Converts a canvas to an `ImageBitmap` (used when a baked geometry edit becomes the new source). */
export async function canvasToBitmap(canvas: HTMLCanvasElement): Promise<ImageBitmap> {
  return createImageBitmap(canvas);
}
