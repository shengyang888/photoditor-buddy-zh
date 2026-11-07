/** The eight hue bands exposed by the HSL panel, matching Lightroom-style editors. */
export type HslBand =
  'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue' | 'purple' | 'magenta';

/** Per-band HSL offsets. Each value is in -100..100. */
export interface HslAdjustment {
  hue: number;
  saturation: number;
  luminance: number;
}

/** A point on a tone curve. Both coordinates are in 0..1 (input → output). */
export interface CurvePoint {
  x: number;
  y: number;
}

/** Tone curves. `rgb` applies to all channels first, then the per-channel curves. */
export interface Curves {
  rgb: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

/** Split toning: tint shadows and highlights with separate hues. */
export interface SplitToning {
  /** Hue in degrees 0..360 applied to highlights. */
  highlightHue: number;
  /** Highlight tint strength 0..100. */
  highlightSaturation: number;
  /** Hue in degrees 0..360 applied to shadows. */
  shadowHue: number;
  /** Shadow tint strength 0..100. */
  shadowSaturation: number;
  /** Balance -100 (favour shadows) .. 100 (favour highlights). */
  balance: number;
}

/** Colour balance offsets per tonal range. Each channel value is in -100..100. */
export interface ColorBalance {
  shadows: [number, number, number];
  midtones: [number, number, number];
  highlights: [number, number, number];
}

/** Reference to a loaded 3D LUT plus how strongly to apply it (0..100). */
export interface LutSetting {
  id: string | null;
  intensity: number;
}

/**
 * Every non-destructive colour and detail parameter of the editor.
 * All scalar sliders are integers in -100..100 (or 0..100 where noted) so the UI can
 * render them uniformly; the shader maps them to physically sensible ranges.
 */
export interface Adjustments {
  // Light
  exposure: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  // Colour
  temperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
  hue: number;
  // Detail
  sharpen: number; // 0..100
  clarity: number;
  structure: number;
  dehaze: number;
  denoise: number; // 0..100
  // Effects (creative)
  grain: number; // 0..100
  grainSize: number; // 0..100
  fade: number; // 0..100
  vignette: number;
  vignetteFeather: number; // 0..100
  // Advanced
  hsl: Record<HslBand, HslAdjustment>;
  curves: Curves;
  splitToning: SplitToning;
  colorBalance: ColorBalance;
  lut: LutSetting;
}

/** Grouping used by the UI to organise sliders into tabs. */
export type AdjustmentGroup = 'light' | 'color' | 'detail' | 'effects';

/** Metadata describing a single scalar slider. Drives the UI automatically. */
export interface AdjustmentDefinition {
  key: ScalarAdjustmentKey;
  label: string;
  group: AdjustmentGroup;
  min: number;
  max: number;
  defaultValue: number;
  /** One short sentence for the help tooltip. */
  description: string;
}

/** Keys of `Adjustments` whose value is a single number. */
export type ScalarAdjustmentKey = {
  [K in keyof Adjustments]: Adjustments[K] extends number ? K : never;
}[keyof Adjustments];
