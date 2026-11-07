import type { Adjustments } from '../adjustments/types';
import type { EffectSettings } from '../effects/catalog';
import type { Lut3D } from '../lut/cube';
import type { TextureSource } from './gl';

/** A two-channel float field of uv offsets, normally low resolution (sampled bilinearly on the GPU). */
export interface DisplacementField {
  width: number;
  height: number;
  /** RG pairs, row-major, `width * height * 2` floats, offsets in uv units. */
  data: Float32Array;
}

/** Portrait inputs for the renderer. Masks and makeup are Canvas 2D drawings in image space. */
export interface PortraitRenderInput {
  /** RGBA ImageData: R = skin, G = teeth, B = eyes, A = blemish spots (raw, not premultiplied). */
  mask: TextureSource | null;
  /** Increment whenever `mask` pixels change so the renderer re-uploads it. */
  maskVersion: number;
  /** Straight-alpha RGBA ImageData with lipstick, blush, eyebrows, contact lenses etc. */
  makeup: TextureSource | null;
  makeupVersion: number;
  displacement: DisplacementField | null;
  displacementVersion: number;
  /** Strengths 0..1. */
  smooth: number;
  whiten: number;
  teeth: number;
  eyes: number;
  blemish: number;
}

/** Everything the renderer needs for one frame. */
export interface RenderState {
  adjustments: Adjustments;
  /** LUT resolved by the caller (from `adjustments.lut.id` or the active filter's recipe). */
  lut: Lut3D | null;
  effect: EffectSettings | null;
  portrait: PortraitRenderInput | null;
}
