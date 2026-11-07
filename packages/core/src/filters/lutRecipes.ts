import { generateLut, type Lut3D } from '../lut/cube';
import { hexToRgb, luminance } from '../math/color';
import { clamp } from '../math/clamp';
import type { LutRecipe } from './types';

/**
 * Turns a `LutRecipe` into a concrete 3D LUT. Results are cached by a JSON key because
 * building a 33³ table costs a few milliseconds and filters are previewed many times.
 */
const cache = new Map<string, Lut3D>();

export function buildRecipeLut(recipe: LutRecipe, size = 33): Lut3D {
  const key = JSON.stringify(recipe) + size;
  const cached = cache.get(key);
  if (cached) return cached;
  let lut: Lut3D;
  switch (recipe.kind) {
    case 'duotone': {
      const shadow = hexToRgb(recipe.shadow);
      const highlight = hexToRgb(recipe.highlight);
      lut = generateLut('duotone', size, (r, g, b) => {
        const l = luminance([r, g, b]);
        return [
          shadow[0] + (highlight[0] - shadow[0]) * l,
          shadow[1] + (highlight[1] - shadow[1]) * l,
          shadow[2] + (highlight[2] - shadow[2]) * l,
        ];
      });
      break;
    }
    case 'gradientMap': {
      const [a, b, c] = recipe.stops.map(hexToRgb);
      lut = generateLut('gradient-map', size, (r, g, bl) => {
        const l = luminance([r, g, bl]);
        const from = l < 0.5 ? a! : b!;
        const to = l < 0.5 ? b! : c!;
        const t = l < 0.5 ? l * 2 : (l - 0.5) * 2;
        return [
          from[0] + (to[0] - from[0]) * t,
          from[1] + (to[1] - from[1]) * t,
          from[2] + (to[2] - from[2]) * t,
        ];
      });
      break;
    }
    case 'crossProcess': {
      const k = recipe.strength;
      // Classic cross-process: red gains contrast, green a slight lift, blue is crushed into cyan shadows / yellow highlights.
      lut = generateLut('cross-process', size, (r, g, b) => {
        const sr = clamp(0.5 + (r - 0.5) * (1 + 0.5 * k), 0, 1);
        const sg = clamp(g + 0.08 * k * (0.5 - Math.abs(g - 0.5)), 0, 1);
        const sb = clamp(0.5 + (b - 0.5) * (1 - 0.35 * k) + 0.1 * k * (b - 0.5), 0, 1);
        return [sr, sg, sb];
      });
      break;
    }
  }
  cache.set(key, lut);
  return lut;
}
