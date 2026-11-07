/**
 * Clamps `value` into the inclusive range [min, max].
 * Used everywhere a slider or computed value must stay inside a safe range.
 */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Linear interpolation between `a` and `b` by factor `t` (0 returns a, 1 returns b). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Maps `value` from range [inMin, inMax] to range [outMin, outMax] without clamping. */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Rounds `value` to `digits` decimal places. Keeps slider labels short. */
export function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Converts degrees to radians. */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
