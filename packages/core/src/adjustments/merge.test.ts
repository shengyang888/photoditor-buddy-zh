import { describe, expect, it } from 'vitest';
import { defaultAdjustments } from './defaults';
import { applyPreset, cloneAdjustments, isNeutral } from './merge';

describe('applyPreset', () => {
  it('returns the base unchanged at intensity 0 and the preset at intensity 1', () => {
    const base = defaultAdjustments();
    const zero = applyPreset(base, { contrast: 40, hsl: { red: { saturation: 20 } } }, 0);
    expect(zero.contrast).toBe(0);
    expect(zero.hsl.red.saturation).toBe(0);
    const full = applyPreset(base, { contrast: 40, hsl: { red: { saturation: 20 } } }, 1);
    expect(full.contrast).toBe(40);
    expect(full.hsl.red.saturation).toBe(20);
    expect(full.hsl.red.hue).toBe(0);
  });

  it('interpolates halfway and never mutates the base', () => {
    const base = defaultAdjustments();
    base.contrast = 20;
    const half = applyPreset(
      base,
      { contrast: 60, splitToning: { highlightHue: 90, highlightSaturation: 50 } },
      0.5,
    );
    expect(half.contrast).toBe(40);
    expect(half.splitToning.highlightHue).toBe(90);
    expect(half.splitToning.highlightSaturation).toBe(25);
    expect(base.contrast).toBe(20);
    expect(base.splitToning.highlightSaturation).toBe(0);
  });

  it('blends curves towards identity by intensity', () => {
    const half = applyPreset(
      defaultAdjustments(),
      {
        curves: {
          rgb: [
            { x: 0, y: 0.2 },
            { x: 1, y: 1 },
          ],
        },
      },
      0.5,
    );
    expect(half.curves.rgb[0]!.y).toBeCloseTo(0.1);
  });

  it('detects neutral state and clones deeply', () => {
    const a = defaultAdjustments();
    expect(isNeutral(a)).toBe(true);
    const b = cloneAdjustments(a);
    b.hsl.blue.hue = 5;
    expect(isNeutral(a)).toBe(true);
    expect(isNeutral(b)).toBe(false);
  });
});

describe('stackPreset', () => {
  it('adds preset offsets on top of user adjustments and clamps', async () => {
    const { stackPreset } = await import('./merge');
    const base = defaultAdjustments();
    base.contrast = 30;
    base.grainSize = 50;
    const out = stackPreset(
      base,
      { contrast: 20, grainSize: 70, hsl: { red: { saturation: 10 } } },
      0.5,
    );
    expect(out.contrast).toBe(40);
    expect(out.grainSize).toBe(60); // neutral is 50, so +20 * 0.5
    expect(out.hsl.red.saturation).toBe(5);
    const clamped = stackPreset(base, { contrast: 100 }, 1);
    expect(clamped.contrast).toBe(100);
  });
});
