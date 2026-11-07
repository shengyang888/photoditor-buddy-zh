import { clamp } from './clamp';

/** An RGB triple with each channel in the range 0..1. */
export type Rgb = [number, number, number];

/** An HSL triple: hue in degrees 0..360, saturation and lightness in 0..1. */
export type Hsl = [number, number, number];

/**
 * Converts an RGB colour (0..1 per channel) to HSL (hue 0..360, s/l 0..1).
 * Standard formula; used for HSL sliders, split toning previews and colour swatches.
 */
export function rgbToHsl([r, g, b]: Rgb): Hsl {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

/** Converts HSL (hue 0..360, s/l 0..1) back to RGB with channels in 0..1. */
export function hslToRgb([h, s, l]: Hsl): Rgb {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = (((h % 360) + 360) % 360) / 360;
  const channel = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [channel(hk + 1 / 3), channel(hk), channel(hk - 1 / 3)];
}

/** Parses `#rgb`, `#rrggbb` or `#rrggbbaa` into an RGB triple in 0..1. Invalid input returns black. */
export function hexToRgb(hex: string): Rgb {
  let value = hex.trim().replace(/^#/, '');
  if (value.length === 3 || value.length === 4) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)) return [0, 0, 0];
  const n = parseInt(value.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Formats an RGB triple (0..1) as a lowercase `#rrggbb` string. */
export function rgbToHex([r, g, b]: Rgb): string {
  const toByte = (v: number): string =>
    Math.round(clamp(v, 0, 1) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

/** Perceived luminance (Rec. 709 weights) of an RGB triple in 0..1. */
export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
