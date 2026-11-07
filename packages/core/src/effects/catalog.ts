import type { EFFECT_IDS } from '../render/shaders/effects';

/** Identifier of a creative effect. */
export type EffectId = keyof typeof EFFECT_IDS;

/** Blur focus shapes for the Blur / Bokeh tool. */
export type BlurShape = 'whole' | 'radial' | 'linear';

/** Live settings of the active creative effect. Only one effect is active at a time (like Meitu). */
export interface EffectSettings {
  id: EffectId;
  /** Main strength 0..100. */
  amount: number;
  /** Secondary parameter 0..100 (meaning depends on the effect, see `paramLabel`). */
  param: number;
  /** Focus centre in 0..1 image coordinates (blur, swirl). */
  centerX: number;
  centerY: number;
  /** Angle in degrees for the linear blur band. */
  angle: number;
  shape: BlurShape;
}

/** UI metadata for one effect. */
export interface EffectDefinition {
  id: EffectId;
  name: string;
  description: string;
  amountLabel: string;
  /** Label for the secondary slider; omit when the effect has none. */
  paramLabel?: string;
  /** Effects that let the user tap the image to move the focus centre. */
  hasCenter?: boolean;
  /** Effects that use the large blur texture. */
  needsBlur?: boolean;
  defaultAmount: number;
  defaultParam: number;
}

/** Neutral settings for an effect id. */
export function defaultEffectSettings(id: EffectId): EffectSettings {
  const def = EFFECT_DEFINITIONS.find((e) => e.id === id);
  return {
    id,
    amount: def?.defaultAmount ?? 50,
    param: def?.defaultParam ?? 50,
    centerX: 0.5,
    centerY: 0.5,
    angle: 0,
    shape: 'whole',
  };
}

/** Every creative effect shown in the Effects panel (blur is exposed through its own Blur tool too). */
export const EFFECT_DEFINITIONS: readonly EffectDefinition[] = [
  {
    id: 'blur',
    name: '模糊 / 虚化',
    description: '整体柔化，或保留一处清晰的圆形或带状焦点。',
    amountLabel: '模糊',
    paramLabel: '焦点大小',
    hasCenter: true,
    needsBlur: true,
    defaultAmount: 60,
    defaultParam: 40,
  },
  {
    id: 'bloom',
    name: '泛光',
    description: '亮部漫开的梦幻光晕。',
    amountLabel: '泛光',
    paramLabel: '阈值',
    needsBlur: true,
    defaultAmount: 50,
    defaultParam: 50,
  },
  {
    id: 'glow',
    name: '柔光',
    description: '整张照片罩上一层轻柔的雾感。',
    amountLabel: '强度',
    needsBlur: true,
    defaultAmount: 50,
    defaultParam: 50,
  },
  {
    id: 'vignetteBlur',
    name: '边缘虚化',
    description: '中央保持清晰，向四角逐渐虚化。',
    amountLabel: '强度',
    needsBlur: true,
    defaultAmount: 60,
    defaultParam: 50,
  },
  {
    id: 'pixelate',
    name: '马赛克',
    description: '整幅画面打上块状马赛克。',
    amountLabel: '方块大小',
    defaultAmount: 30,
    defaultParam: 50,
  },
  {
    id: 'rgbSplit',
    name: 'RGB 错位',
    description: '红蓝通道横向错开。',
    amountLabel: '偏移',
    defaultAmount: 40,
    defaultParam: 50,
  },
  {
    id: 'chromatic',
    name: '色散',
    description: '镜头式的彩色边缘，越靠近边缘越明显。',
    amountLabel: '强度',
    defaultAmount: 50,
    defaultParam: 50,
  },
  {
    id: 'glitch',
    name: '故障风',
    description: '信号错乱的切片与色彩撕裂。',
    amountLabel: '强度',
    paramLabel: '切片数',
    defaultAmount: 50,
    defaultParam: 40,
  },
  {
    id: 'vhs',
    name: 'VHS',
    description: '像旧录像带一样的扫描线、噪点与色彩溢出。',
    amountLabel: '强度',
    defaultAmount: 60,
    defaultParam: 50,
  },
  {
    id: 'halftone',
    name: '半调',
    description: '报纸风格的圆点图案。',
    amountLabel: '强度',
    paramLabel: '圆点大小',
    defaultAmount: 100,
    defaultParam: 60,
  },
  {
    id: 'dotScreen',
    name: '网点',
    description: '漫画风格的圆点叠加在色彩上。',
    amountLabel: '强度',
    paramLabel: '圆点大小',
    defaultAmount: 70,
    defaultParam: 60,
  },
  {
    id: 'crossHatch',
    name: '交叉排线',
    description: '阴影处的钢笔素描排线。',
    amountLabel: '强度',
    paramLabel: '线条间距',
    defaultAmount: 100,
    defaultParam: 50,
  },
  {
    id: 'sketch',
    name: '素描',
    description: '铅笔线条画。',
    amountLabel: '强度',
    paramLabel: '线条力度',
    defaultAmount: 100,
    defaultParam: 50,
  },
  {
    id: 'emboss',
    name: '浮雕',
    description: '凸起的雕刻金属质感。',
    amountLabel: '强度',
    defaultAmount: 100,
    defaultParam: 50,
  },
  {
    id: 'oilPaint',
    name: '油画',
    description: '画笔般的平滑质感。',
    amountLabel: '笔触大小',
    defaultAmount: 50,
    defaultParam: 50,
  },
  {
    id: 'posterize',
    name: '海报化',
    description: '色彩压成扁平色块。',
    amountLabel: '强度',
    defaultAmount: 60,
    defaultParam: 50,
  },
  {
    id: 'solarize',
    name: '日光化',
    description: '最亮的色调部分反转。',
    amountLabel: '强度',
    defaultAmount: 50,
    defaultParam: 50,
  },
  {
    id: 'threshold',
    name: '阈值',
    description: '纯黑白剪影效果。',
    amountLabel: '强度',
    paramLabel: '阈值',
    defaultAmount: 100,
    defaultParam: 50,
  },
  {
    id: 'invert',
    name: '反色',
    description: '负片效果。',
    amountLabel: '强度',
    defaultAmount: 100,
    defaultParam: 50,
  },
  {
    id: 'kaleidoscope',
    name: '万花筒',
    description: '镜像拼成对称扇形。',
    amountLabel: '强度',
    paramLabel: '扇区数',
    defaultAmount: 100,
    defaultParam: 30,
  },
  {
    id: 'mirror',
    name: '镜像',
    description: '一半画面镜像到另一半。',
    amountLabel: '强度',
    paramLabel: '镜像轴',
    defaultAmount: 100,
    defaultParam: 0,
  },
  {
    id: 'swirl',
    name: '漩涡',
    description: '围绕一点扭曲画面，可点按移动中心。',
    amountLabel: '扭曲',
    paramLabel: '半径',
    hasCenter: true,
    defaultAmount: 40,
    defaultParam: 50,
  },
  {
    id: 'fisheye',
    name: '鱼眼',
    description: '鼓起的广角镜头效果。',
    amountLabel: '强度',
    defaultAmount: 60,
    defaultParam: 50,
  },
  {
    id: 'frostedGlass',
    name: '磨砂玻璃',
    description: '像隔着磨砂玻璃看照片。',
    amountLabel: '强度',
    defaultAmount: 50,
    defaultParam: 50,
  },
];

/** Looks up an effect definition; undefined for unknown ids. */
export function findEffect(id: string): EffectDefinition | undefined {
  return EFFECT_DEFINITIONS.find((e) => e.id === id);
}
