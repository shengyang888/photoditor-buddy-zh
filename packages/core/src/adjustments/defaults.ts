import type {
  AdjustmentDefinition,
  Adjustments,
  Curves,
  HslAdjustment,
  HslBand,
  ScalarAdjustmentKey,
} from './types';

/** The eight HSL bands in colour-wheel order. */
export const HSL_BANDS: readonly HslBand[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'aqua',
  'blue',
  'purple',
  'magenta',
];

/** Centre hue (degrees) of each HSL band. Used by the shader to weight adjustments. */
export const HSL_BAND_HUES: Record<HslBand, number> = {
  red: 0,
  orange: 30,
  yellow: 60,
  green: 120,
  aqua: 180,
  blue: 240,
  purple: 280,
  magenta: 320,
};

/** A straight identity curve (no change). */
export const IDENTITY_CURVE = (): { x: number; y: number }[] => [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

/** Fresh identity curves for all four channels. */
export function defaultCurves(): Curves {
  return {
    rgb: IDENTITY_CURVE(),
    red: IDENTITY_CURVE(),
    green: IDENTITY_CURVE(),
    blue: IDENTITY_CURVE(),
  };
}

/** Fresh zeroed HSL adjustment for every band. */
export function defaultHsl(): Record<HslBand, HslAdjustment> {
  const out = {} as Record<HslBand, HslAdjustment>;
  for (const band of HSL_BANDS) out[band] = { hue: 0, saturation: 0, luminance: 0 };
  return out;
}

/** Returns a brand-new `Adjustments` object with every parameter at its neutral value. */
export function defaultAdjustments(): Adjustments {
  return {
    exposure: 0,
    brightness: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    temperature: 0,
    tint: 0,
    saturation: 0,
    vibrance: 0,
    hue: 0,
    sharpen: 0,
    clarity: 0,
    structure: 0,
    dehaze: 0,
    denoise: 0,
    grain: 0,
    grainSize: 50,
    fade: 0,
    vignette: 0,
    vignetteFeather: 50,
    hsl: defaultHsl(),
    curves: defaultCurves(),
    splitToning: {
      highlightHue: 45,
      highlightSaturation: 0,
      shadowHue: 220,
      shadowSaturation: 0,
      balance: 0,
    },
    colorBalance: { shadows: [0, 0, 0], midtones: [0, 0, 0], highlights: [0, 0, 0] },
    lut: { id: null, intensity: 100 },
  };
}

/** Ordered list of every scalar slider. The UI renders exactly this list, grouped by `group`. */
export const ADJUSTMENT_DEFINITIONS: readonly AdjustmentDefinition[] = [
  {
    key: 'exposure',
    label: '曝光',
    group: 'light',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '整体亮度，如同改变相机曝光。',
  },
  {
    key: 'brightness',
    label: '亮度',
    group: 'light',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '提亮或压暗中间调，同时保护亮部与暗部。',
  },
  {
    key: 'contrast',
    label: '对比度',
    group: 'light',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '明暗区域之间的反差。',
  },
  {
    key: 'highlights',
    label: '高光',
    group: 'light',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '只恢复或增强最亮的区域。',
  },
  {
    key: 'shadows',
    label: '阴影',
    group: 'light',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '只提亮或加深最暗的区域。',
  },
  {
    key: 'whites',
    label: '白色',
    group: 'light',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '设定白点。',
  },
  {
    key: 'blacks',
    label: '黑色',
    group: 'light',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '设定黑点。',
  },
  {
    key: 'temperature',
    label: '色温',
    group: 'color',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '偏冷（蓝色）到偏暖（黄色）。',
  },
  {
    key: 'tint',
    label: '色调',
    group: 'color',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '绿色与品红之间的平衡。',
  },
  {
    key: 'saturation',
    label: '饱和度',
    group: 'color',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '所有色彩的浓淡程度。',
  },
  {
    key: 'vibrance',
    label: '自然饱和度',
    group: 'color',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '优先提升暗淡的色彩，对已鲜艳的色彩影响较小，并保护肤色。',
  },
  {
    key: 'hue',
    label: '色相偏移',
    group: 'color',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '让所有颜色沿色轮旋转。',
  },
  {
    key: 'sharpen',
    label: '锐化',
    group: 'detail',
    min: 0,
    max: 100,
    defaultValue: 0,
    description: '边缘更清晰。',
  },
  {
    key: 'clarity',
    label: '清晰度',
    group: 'detail',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '中间调对比，增强质感（负值则更柔和）。',
  },
  {
    key: 'structure',
    label: '结构',
    group: 'detail',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '强调细腻纹理。',
  },
  {
    key: 'dehaze',
    label: '去雾',
    group: 'detail',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '穿透雾霾；负值可营造雾感。',
  },
  {
    key: 'denoise',
    label: '降噪',
    group: 'detail',
    min: 0,
    max: 100,
    defaultValue: 0,
    description: '平滑颗粒噪点，同时保留边缘。',
  },
  {
    key: 'grain',
    label: '颗粒',
    group: 'effects',
    min: 0,
    max: 100,
    defaultValue: 0,
    description: '胶片风格颗粒。',
  },
  {
    key: 'grainSize',
    label: '颗粒大小',
    group: 'effects',
    min: 0,
    max: 100,
    defaultValue: 50,
    description: '颗粒的粗细。',
  },
  {
    key: 'fade',
    label: '褪色',
    group: 'effects',
    min: 0,
    max: 100,
    defaultValue: 0,
    description: '提亮黑色，营造哑光褪色胶片感。',
  },
  {
    key: 'vignette',
    label: '暗角',
    group: 'effects',
    min: -100,
    max: 100,
    defaultValue: 0,
    description: '压暗（或提亮）四角。',
  },
  {
    key: 'vignetteFeather',
    label: '暗角羽化',
    group: 'effects',
    min: 0,
    max: 100,
    defaultValue: 50,
    description: '暗角边缘的柔和程度。',
  },
];

/** Quick lookup from slider key to its definition. */
export const ADJUSTMENT_BY_KEY: Record<ScalarAdjustmentKey, AdjustmentDefinition> =
  Object.fromEntries(ADJUSTMENT_DEFINITIONS.map((d) => [d.key, d])) as Record<
    ScalarAdjustmentKey,
    AdjustmentDefinition
  >;

/** Human-readable labels for each HSL band. */
export const HSL_BAND_LABELS: Record<HslBand, string> = {
  red: '红',
  orange: '橙',
  yellow: '黄',
  green: '绿',
  aqua: '青',
  blue: '蓝',
  purple: '紫',
  magenta: '品红',
};
