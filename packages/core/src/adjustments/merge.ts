import { ADJUSTMENT_BY_KEY, defaultAdjustments } from './defaults';
import type { Adjustments, HslAdjustment, HslBand, ScalarAdjustmentKey } from './types';
import { clamp } from '../math/clamp';

/** A partial preset: any subset of adjustments, nested objects may also be partial. */
export type AdjustmentPreset = {
  [K in keyof Adjustments]?: K extends 'hsl'
    ? Partial<Record<HslBand, Partial<HslAdjustment>>>
    : Adjustments[K] extends object
      ? Partial<Adjustments[K]>
      : Adjustments[K];
};

/**
 * Deep-clones an `Adjustments` object so edits never leak into history snapshots.
 * Structured cloning is fast enough here (the object is tiny) and keeps this dependency-free.
 */
export function cloneAdjustments(source: Adjustments): Adjustments {
  return structuredClone(source);
}

/**
 * Blends `preset` on top of `base` by `intensity` (0..1).
 * Every numeric field moves from the base value towards the preset value; nested
 * HSL, curves, split toning and colour balance are handled explicitly.
 * Used for "filter strength" sliders: intensity 0 returns `base` unchanged.
 */
export function applyPreset(
  base: Adjustments,
  preset: AdjustmentPreset,
  intensity = 1,
): Adjustments {
  const t = clamp(intensity, 0, 1);
  const out = cloneAdjustments(base);
  const mix = (a: number, b: number): number => a + (b - a) * t;

  for (const key of Object.keys(preset) as (keyof AdjustmentPreset)[]) {
    const value = preset[key];
    if (value === undefined) continue;
    if (typeof value === 'number') {
      (out as unknown as Record<string, number>)[key] = mix(
        out[key as keyof Adjustments] as number,
        value,
      );
      continue;
    }
    if (key === 'hsl') {
      const hsl = value as Partial<Adjustments['hsl']>;
      for (const band of Object.keys(hsl) as (keyof Adjustments['hsl'])[]) {
        const target = hsl[band];
        if (!target) continue;
        const current = out.hsl[band];
        current.hue = mix(current.hue, target.hue ?? current.hue);
        current.saturation = mix(current.saturation, target.saturation ?? current.saturation);
        current.luminance = mix(current.luminance, target.luminance ?? current.luminance);
      }
      continue;
    }
    if (key === 'curves') {
      const curves = value as Partial<Adjustments['curves']>;
      for (const channel of ['rgb', 'red', 'green', 'blue'] as const) {
        const points = curves[channel];
        if (!points) continue;
        // Blend curve points towards identity by intensity: y moves from x (identity) to preset y.
        out.curves[channel] = points.map((p) => ({ x: p.x, y: p.x + (p.y - p.x) * t }));
      }
      continue;
    }
    if (key === 'splitToning') {
      const st = value as Partial<Adjustments['splitToning']>;
      if (st.highlightHue !== undefined) out.splitToning.highlightHue = st.highlightHue;
      if (st.shadowHue !== undefined) out.splitToning.shadowHue = st.shadowHue;
      out.splitToning.highlightSaturation = mix(
        out.splitToning.highlightSaturation,
        st.highlightSaturation ?? out.splitToning.highlightSaturation,
      );
      out.splitToning.shadowSaturation = mix(
        out.splitToning.shadowSaturation,
        st.shadowSaturation ?? out.splitToning.shadowSaturation,
      );
      out.splitToning.balance = mix(out.splitToning.balance, st.balance ?? out.splitToning.balance);
      continue;
    }
    if (key === 'colorBalance') {
      const cb = value as Partial<Adjustments['colorBalance']>;
      for (const range of ['shadows', 'midtones', 'highlights'] as const) {
        const target = cb[range];
        if (!target) continue;
        const current = out.colorBalance[range];
        out.colorBalance[range] = [
          mix(current[0], target[0]),
          mix(current[1], target[1]),
          mix(current[2], target[2]),
        ];
      }
      continue;
    }
    if (key === 'lut') {
      const lut = value as Partial<Adjustments['lut']>;
      if (lut.id !== undefined) out.lut.id = lut.id;
      out.lut.intensity = mix(out.lut.intensity, lut.intensity ?? out.lut.intensity);
    }
  }
  return out;
}

/** True when every parameter equals its neutral default (no visible change). */
export function isNeutral(adjustments: Adjustments): boolean {
  return JSON.stringify(adjustments) === JSON.stringify(defaultAdjustments());
}

/**
 * Stacks a filter preset ON TOP of the user's own adjustments (additive), scaled by `intensity`.
 * This is how "filter strength" behaves in phone editors: the user's exposure/contrast tweaks are
 * kept and the filter's offsets are added to them. Values are clamped to each slider's range.
 */
export function stackPreset(
  base: Adjustments,
  preset: AdjustmentPreset,
  intensity = 1,
): Adjustments {
  const t = clamp(intensity, 0, 1);
  const out = cloneAdjustments(base);
  const add = (key: ScalarAdjustmentKey, value: number): void => {
    const def = ADJUSTMENT_BY_KEY[key];
    const neutral = def.defaultValue;
    out[key] = clamp(out[key] + (value - neutral) * t, def.min, def.max);
  };
  for (const key of Object.keys(preset) as (keyof AdjustmentPreset)[]) {
    const value = preset[key];
    if (value === undefined) continue;
    if (typeof value === 'number') {
      add(key as ScalarAdjustmentKey, value);
      continue;
    }
    if (key === 'hsl') {
      const hsl = value as Partial<Record<HslBand, Partial<HslAdjustment>>>;
      for (const band of Object.keys(hsl) as HslBand[]) {
        const target = hsl[band];
        if (!target) continue;
        const current = out.hsl[band];
        current.hue = clamp(current.hue + (target.hue ?? 0) * t, -100, 100);
        current.saturation = clamp(current.saturation + (target.saturation ?? 0) * t, -100, 100);
        current.luminance = clamp(current.luminance + (target.luminance ?? 0) * t, -100, 100);
      }
      continue;
    }
    if (key === 'curves') {
      const curves = value as Partial<Adjustments['curves']>;
      for (const channel of ['rgb', 'red', 'green', 'blue'] as const) {
        const points = curves[channel];
        if (!points) continue;
        out.curves[channel] = points.map((p) => ({ x: p.x, y: p.x + (p.y - p.x) * t }));
      }
      continue;
    }
    if (key === 'splitToning') {
      const st = value as Partial<Adjustments['splitToning']>;
      if (st.highlightHue !== undefined && (st.highlightSaturation ?? 0) > 0)
        out.splitToning.highlightHue = st.highlightHue;
      if (st.shadowHue !== undefined && (st.shadowSaturation ?? 0) > 0)
        out.splitToning.shadowHue = st.shadowHue;
      out.splitToning.highlightSaturation = clamp(
        out.splitToning.highlightSaturation + (st.highlightSaturation ?? 0) * t,
        0,
        100,
      );
      out.splitToning.shadowSaturation = clamp(
        out.splitToning.shadowSaturation + (st.shadowSaturation ?? 0) * t,
        0,
        100,
      );
      out.splitToning.balance = clamp(out.splitToning.balance + (st.balance ?? 0) * t, -100, 100);
      continue;
    }
    if (key === 'colorBalance') {
      const cb = value as Partial<Adjustments['colorBalance']>;
      for (const range of ['shadows', 'midtones', 'highlights'] as const) {
        const target = cb[range];
        if (!target) continue;
        const current = out.colorBalance[range];
        out.colorBalance[range] = [
          clamp(current[0] + target[0] * t, -100, 100),
          clamp(current[1] + target[1] * t, -100, 100),
          clamp(current[2] + target[2] * t, -100, 100),
        ];
      }
    }
  }
  return out;
}
