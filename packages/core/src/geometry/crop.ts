/** A crop rectangle in source pixel coordinates. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A named aspect-ratio preset for the Crop tool. `ratio` is width/height; null means free. */
export interface AspectPreset {
  id: string;
  label: string;
  ratio: number | null;
}

/** Crop presets shown as chips. Covers social formats and print/ID sizes. */
export const ASPECT_PRESETS: readonly AspectPreset[] = [
  { id: 'free', label: '自由', ratio: null },
  { id: 'original', label: '原图', ratio: -1 },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '2:3', label: '2:3', ratio: 2 / 3 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '21:9', label: '21:9', ratio: 21 / 9 },
  { id: 'story', label: '故事', ratio: 9 / 16 },
  { id: 'cover', label: '封面', ratio: 820 / 312 },
  { id: 'a4', label: 'A4', ratio: 210 / 297 },
  { id: 'id-35x45', label: '证件照 35×45', ratio: 35 / 45 },
  { id: 'id-2x2', label: '证件照 2×2 英寸', ratio: 1 },
  { id: 'id-33x48', label: '证件照 33×48', ratio: 33 / 48 },
];

/**
 * Largest centred rectangle with the given aspect ratio that fits inside `width`×`height`.
 * `ratio` null (free) returns the whole image.
 */
export function fitAspect(width: number, height: number, ratio: number | null): CropRect {
  if (ratio === null || ratio <= 0) return { x: 0, y: 0, width, height };
  let w = width;
  let h = w / ratio;
  if (h > height) {
    h = height;
    w = h * ratio;
  }
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}

/** Clamps a crop rectangle so it stays inside the image and keeps a minimum size. */
export function clampCrop(rect: CropRect, width: number, height: number, minSize = 16): CropRect {
  const w = Math.min(Math.max(rect.width, minSize), width);
  const h = Math.min(Math.max(rect.height, minSize), height);
  const x = Math.min(Math.max(rect.x, 0), width - w);
  const y = Math.min(Math.max(rect.y, 0), height - h);
  return { x, y, width: w, height: h };
}

/** Rounds a crop rectangle to whole pixels (canvas APIs need integers). */
export function roundCrop(rect: CropRect): CropRect {
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  return {
    x,
    y,
    width: Math.max(1, Math.round(rect.x + rect.width) - x),
    height: Math.max(1, Math.round(rect.y + rect.height) - y),
  };
}
