import { describe, expect, it } from 'vitest';
import { ASPECT_PRESETS, clampCrop, fitAspect, roundCrop } from './crop';
import {
  homographyFromUnitSquare,
  identityQuad,
  invert3x3,
  quadFromPerspective,
  rotatedSize,
  straightenCoverScale,
} from './transform';

describe('crop helpers', () => {
  it('fits aspect ratios inside the image', () => {
    const square = fitAspect(1000, 500, 1);
    expect(square).toEqual({ x: 250, y: 0, width: 500, height: 500 });
    const wide = fitAspect(1000, 500, 4);
    expect(wide.width).toBe(1000);
    expect(wide.height).toBe(250);
    expect(fitAspect(300, 200, null)).toEqual({ x: 0, y: 0, width: 300, height: 200 });
    expect(ASPECT_PRESETS.find((p) => p.id === 'free')?.ratio).toBeNull();
  });

  it('clamps and rounds crops', () => {
    expect(clampCrop({ x: -50, y: -50, width: 2000, height: 20 }, 1000, 500)).toEqual({
      x: 0,
      y: 0,
      width: 1000,
      height: 20,
    });
    expect(clampCrop({ x: 900, y: 400, width: 300, height: 300 }, 1000, 500)).toEqual({
      x: 700,
      y: 200,
      width: 300,
      height: 300,
    });
    expect(roundCrop({ x: 0.4, y: 0.6, width: 10.2, height: 9.7 })).toEqual({
      x: 0,
      y: 1,
      width: 11,
      height: 9,
    });
  });
});

describe('transform helpers', () => {
  it('rotated size swaps on odd quarter turns', () => {
    expect(rotatedSize(100, 50, 1)).toEqual({ width: 50, height: 100 });
    expect(rotatedSize(100, 50, 2)).toEqual({ width: 100, height: 50 });
  });

  it('straighten scale is 1 at zero and grows with the angle', () => {
    expect(straightenCoverScale(100, 50, 0)).toBe(1);
    expect(straightenCoverScale(100, 50, 10)).toBeGreaterThan(1);
    expect(straightenCoverScale(100, 50, 10)).toBeCloseTo(straightenCoverScale(100, 50, -10), 9);
  });

  it('homography maps unit-square corners to the quad', () => {
    const quad = quadFromPerspective(40, 0);
    const h = homographyFromUnitSquare(quad)!;
    const apply = (u: number, v: number): [number, number] => {
      const w = h[6]! * u + h[7]! * v + h[8]!;
      return [(h[0]! * u + h[1]! * v + h[2]!) / w, (h[3]! * u + h[4]! * v + h[5]!) / w];
    };
    expect(apply(0, 0)[0]).toBeCloseTo(quad[0][0], 6);
    expect(apply(1, 0)[0]).toBeCloseTo(quad[1][0], 6);
    expect(apply(1, 1)[1]).toBeCloseTo(quad[2][1], 6);
    const inv = invert3x3(h)!;
    const [x, y] = [
      inv[0]! * quad[1][0] + inv[1]! * quad[1][1] + inv[2]!,
      inv[3]! * quad[1][0] + inv[4]! * quad[1][1] + inv[5]!,
    ];
    const w = inv[6]! * quad[1][0] + inv[7]! * quad[1][1] + inv[8]!;
    expect(x / w).toBeCloseTo(1, 6);
    expect(y / w).toBeCloseTo(0, 6);
    expect(homographyFromUnitSquare(identityQuad())).not.toBeNull();
  });
});
