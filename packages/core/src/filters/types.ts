import type { AdjustmentPreset } from '../adjustments/merge';

/** Category names shown as tabs in the Filters panel. Order here is the order in the UI. */
export type FilterCategory =
  | '胶片'
  | '复古'
  | '黑白'
  | '日系'
  | '韩系'
  | '电影感'
  | '日落'
  | '珍珠'
  | '人像'
  | '美食'
  | '风景'
  | '街头'
  | '霓虹'
  | '粉彩'
  | '氛围'
  | '交叉冲印'
  | '双色调'
  | '四季'
  | '旅行'
  | '复古数码'
  | '极简';

/** Recipe for a generated 3D LUT that a preset can carry in addition to slider values. */
export type LutRecipe =
  | { kind: 'duotone'; shadow: string; highlight: string }
  | { kind: 'gradientMap'; stops: [string, string, string] }
  | { kind: 'crossProcess'; strength: number };

/** One filter (a named look). Applying it means blending `preset` onto the current adjustments. */
export interface FilterDefinition {
  id: string;
  name: string;
  category: FilterCategory;
  preset: AdjustmentPreset;
  lut?: LutRecipe;
}
