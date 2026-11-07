import type { CurvePoint } from './types';
import { clamp } from '../math/clamp';

/**
 * Sorts curve points by x and removes duplicates so the interpolator is well defined.
 * Guarantees an endpoint at x=0 and x=1 (added as identity if missing).
 */
export function normaliseCurve(points: CurvePoint[]): CurvePoint[] {
  const sorted = [...points]
    .map((p) => ({ x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1) }))
    .sort((a, b) => a.x - b.x)
    .filter((p, i, arr) => i === 0 || p.x !== arr[i - 1]!.x);
  if (sorted.length === 0)
    return [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
  if (sorted[0]!.x > 0) sorted.unshift({ x: 0, y: sorted[0]!.y });
  if (sorted[sorted.length - 1]!.x < 1) sorted.push({ x: 1, y: sorted[sorted.length - 1]!.y });
  return sorted;
}

/**
 * Evaluates a monotone cubic spline (Fritsch–Carlson) through `points` at input `x`.
 * Monotone interpolation never overshoots, so a curve made of a few points cannot
 * produce colour inversions between them.
 */
export function evaluateCurve(points: CurvePoint[], x: number): number {
  const pts = normaliseCurve(points);
  const n = pts.length;
  if (n === 1) return pts[0]!.y;
  if (n === 2) {
    const [a, b] = [pts[0]!, pts[1]!];
    return clamp(a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y), 0, 1);
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1]! - xs[i]!;
    delta[i] = (ys[i + 1]! - ys[i]!) / h[i]!;
  }
  const m: number[] = new Array<number>(n).fill(0);
  m[0] = delta[0]!;
  m[n - 1] = delta[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    const d0 = delta[i - 1]!;
    const d1 = delta[i]!;
    m[i] = d0 * d1 <= 0 ? 0 : (d0 + d1) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    const d = delta[i]!;
    if (d === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / d;
    const b = m[i + 1]! / d;
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * d;
      m[i + 1] = tau * b * d;
    }
  }
  const xc = clamp(x, 0, 1);
  let i = 0;
  while (i < n - 2 && xc > xs[i + 1]!) i++;
  const hi = h[i]!;
  const t = (xc - xs[i]!) / hi;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return clamp(h00 * ys[i]! + h10 * hi * m[i]! + h01 * ys[i + 1]! + h11 * hi * m[i + 1]!, 0, 1);
}

/**
 * Builds a 256-entry lookup table (0..255 → 0..255) for a curve.
 * The renderer uploads this as a texture so the GPU does a single fetch per pixel.
 */
export function buildCurveTable(points: CurvePoint[]): Uint8Array {
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; i++) table[i] = Math.round(evaluateCurve(points, i / 255) * 255);
  return table;
}

/** True when the curve is (numerically) the identity, so the renderer can skip it. */
export function isIdentityCurve(points: CurvePoint[]): boolean {
  const pts = normaliseCurve(points);
  return pts.every((p) => Math.abs(p.x - p.y) < 1e-6);
}
