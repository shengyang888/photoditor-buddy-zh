import { describe, expect, it } from 'vitest';
import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from './color';
import { clamp, remap } from './clamp';

describe('colour maths', () => {
  it('round-trips rgb → hsl → rgb', () => {
    for (const rgb of [
      [1, 0, 0],
      [0.2, 0.4, 0.6],
      [0.5, 0.5, 0.5],
      [0.9, 0.1, 0.7],
    ] as [number, number, number][]) {
      const back = hslToRgb(rgbToHsl(rgb));
      back.forEach((v, i) => expect(v).toBeCloseTo(rgb[i]!, 6));
    }
  });

  it('parses and formats hex', () => {
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToRgb('#0f0')).toEqual([0, 1, 0]);
    expect(hexToRgb('nonsense')).toEqual([0, 0, 0]);
    expect(rgbToHex([1, 0.5, 0])).toBe('#ff8000');
  });

  it('clamp and remap behave', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(remap(50, 0, 100, -1, 1)).toBe(0);
  });
});
