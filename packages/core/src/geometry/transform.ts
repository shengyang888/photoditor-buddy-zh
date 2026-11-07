import { degToRad } from '../math/clamp';
import { roundCrop, type CropRect } from './crop';

/** Geometry edits that get baked into a new source image when the user taps Apply. */
export interface GeometryEdit {
  /** Quarter-turn rotations, 0..3 (clockwise). */
  rotation: 0 | 1 | 2 | 3;
  flipHorizontal: boolean;
  flipVertical: boolean;
  /** Fine straighten angle in degrees, -45..45. */
  straighten: number;
  /** Crop in the coordinate space *after* rotation/flip/straighten. Null keeps everything. */
  crop: CropRect | null;
}

/** Neutral geometry (no change). */
export function defaultGeometry(): GeometryEdit {
  return { rotation: 0, flipHorizontal: false, flipVertical: false, straighten: 0, crop: null };
}

/** Size of the canvas after quarter-turn rotation (swap on odd turns). */
export function rotatedSize(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  return rotation % 2 === 1 ? { width: height, height: width } : { width, height };
}

/**
 * Scale needed so that an image rotated by `angleDeg` still covers its original frame with no
 * empty corners (used for straighten, which auto-zooms like phone editors).
 */
export function straightenCoverScale(width: number, height: number, angleDeg: number): number {
  const a = Math.abs(degToRad(angleDeg));
  if (a === 0) return 1;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const w = width;
  const h = height;
  // The rotated frame must contain the original rectangle: solve for the scale on both axes.
  const scaleX = (w * cos + h * sin) / w;
  const scaleY = (w * sin + h * cos) / h;
  return Math.max(scaleX, scaleY);
}

/**
 * Applies rotation, flips, straighten (with auto-zoom) and crop to `source` and returns a new
 * canvas. Uses Canvas 2D because these are exact affine operations and this keeps export
 * independent of WebGL limits.
 */
export function bakeGeometry(
  source: CanvasImageSource & { width: number; height: number },
  edit: GeometryEdit,
): HTMLCanvasElement {
  const { width: rw, height: rh } = rotatedSize(source.width, source.height, edit.rotation);
  const stage = document.createElement('canvas');
  stage.width = rw;
  stage.height = rh;
  const ctx = stage.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(rw / 2, rh / 2);
  ctx.rotate((edit.rotation * Math.PI) / 2);
  ctx.scale(edit.flipHorizontal ? -1 : 1, edit.flipVertical ? -1 : 1);
  if (edit.straighten !== 0) {
    const scale = straightenCoverScale(source.width, source.height, edit.straighten);
    ctx.rotate(degToRad(edit.straighten));
    ctx.scale(scale, scale);
  }
  ctx.drawImage(source, -source.width / 2, -source.height / 2);

  if (!edit.crop) return stage;
  const crop = roundCrop(edit.crop);
  const out = document.createElement('canvas');
  out.width = crop.width;
  out.height = crop.height;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Canvas 2D is not available.');
  octx.drawImage(stage, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return out;
}

/** Four corner points (top-left, top-right, bottom-right, bottom-left) in 0..1 image coordinates. */
export type Quad = [[number, number], [number, number], [number, number], [number, number]];

/** Identity quad (no perspective change). */
export function identityQuad(): Quad {
  return [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
}

/**
 * Solves the 3×3 homography that maps the unit square corners to `quad`.
 * Returns the matrix in row-major order (9 numbers) or null when the quad is degenerate.
 */
export function homographyFromUnitSquare(quad: Quad): number[] | null {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-12) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const f = y0;
  return [a, b, c, d, e, f, g, h, 1];
}

/** Inverts a 3×3 row-major matrix. Returns null when singular. */
export function invert3x3(m: number[]): number[] | null {
  const [a, b, c, d, e, f, g, h, i] = m as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const inv = [
    A,
    -(b * i - c * h),
    b * f - c * e,
    B,
    a * i - c * g,
    -(a * f - c * d),
    C,
    -(a * h - b * g),
    a * e - b * d,
  ];
  return inv.map((v) => v / det);
}

/**
 * Perspective correction on the CPU: for each destination pixel, find the source pixel through
 * the inverse homography and bilinearly sample it. Runs in a few hundred milliseconds for a
 * preview-sized image and keeps this feature independent of WebGL.
 */
export function bakePerspective(source: HTMLCanvasElement, quad: Quad): HTMLCanvasElement {
  const width = source.width;
  const height = source.height;
  const forward = homographyFromUnitSquare(quad);
  const inverse = forward ? invert3x3(forward) : null;
  if (!inverse) return source;
  const sctx = source.getContext('2d');
  if (!sctx) throw new Error('Canvas 2D is not available.');
  const src = sctx.getImageData(0, 0, width, height);
  const out = new ImageData(width, height);
  const s = src.data;
  const o = out.data;
  const [a, b, c, d, e, f, g, h, i] = inverse as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height;
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      const w = g * u + h * v + i;
      const su = (a * u + b * v + c) / w;
      const sv = (d * u + e * v + f) / w;
      const sx = su * width - 0.5;
      const sy = sv * height - 0.5;
      const idx = (y * width + x) * 4;
      if (sx < 0 || sy < 0 || sx > width - 1 || sy > height - 1) {
        o[idx + 3] = 0;
        continue;
      }
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, width - 1);
      const y1 = Math.min(y0 + 1, height - 1);
      const fx = sx - x0;
      const fy = sy - y0;
      for (let ch = 0; ch < 4; ch++) {
        const p00 = s[(y0 * width + x0) * 4 + ch]!;
        const p10 = s[(y0 * width + x1) * 4 + ch]!;
        const p01 = s[(y1 * width + x0) * 4 + ch]!;
        const p11 = s[(y1 * width + x1) * 4 + ch]!;
        o[idx + ch] = (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy;
      }
    }
  }
  const result = document.createElement('canvas');
  result.width = width;
  result.height = height;
  result.getContext('2d')!.putImageData(out, 0, 0);
  return result;
}

/**
 * Turns the two perspective sliders (vertical, horizontal, each -100..100) into a corner quad.
 * Positive vertical tilts the top edge inwards (fixes buildings leaning back).
 */
export function quadFromPerspective(vertical: number, horizontal: number): Quad {
  const v = (vertical / 100) * 0.25;
  const h = (horizontal / 100) * 0.25;
  const topInset = v > 0 ? v : 0;
  const bottomInset = v < 0 ? -v : 0;
  const leftInset = h > 0 ? h : 0;
  const rightInset = h < 0 ? -h : 0;
  return [
    [topInset + leftInset * 0, 0 + leftInset],
    [1 - topInset, 0 + rightInset],
    [1 - bottomInset, 1 - rightInset],
    [bottomInset, 1 - leftInset],
  ];
}
