import type { NormPoint } from '../overlays/types';

/** Reshape sliders. All values are -100..100 (0 = untouched) except where noted. */
export interface ReshapeSettings {
  /** Narrows (positive) or widens the lower face. */
  faceSlim: number;
  /** Sharpens (positive) or softens the jaw corners. */
  jaw: number;
  /** Lengthens (positive) or shortens the chin. */
  chin: number;
  /** Narrows (positive) or widens the nose. */
  noseWidth: number;
  /** Enlarges (positive) or shrinks the eyes. */
  eyeSize: number;
  /** Moves the eyes apart (positive) or closer. */
  eyeDistance: number;
  /** Lifts (positive) the outer eye corners. */
  eyeLift: number;
  /** Enlarges (positive) or shrinks the mouth. */
  mouthSize: number;
  /** Raises (positive) the hairline / lengthens the forehead. */
  forehead: number;
  /** Shrinks the whole head (positive) — "small head" effect. */
  headSize: number;
}

/** Skin and feature sliders, 0..100. */
export interface SkinSettings {
  smooth: number;
  whiten: number;
  teeth: number;
  eyes: number;
  /** Spot-heal strength for tapped blemishes. */
  blemish: number;
}

/** One makeup item: colour + strength. */
export interface MakeupItem {
  color: string;
  /** 0..100 */
  opacity: number;
}

export interface MakeupSettings {
  lipstick: MakeupItem;
  blush: MakeupItem;
  eyebrows: MakeupItem;
  eyeshadow: MakeupItem;
  contacts: MakeupItem;
  eyeliner: MakeupItem;
}

/** A liquify brush stroke: pushes pixels along the drag direction. */
export interface LiquifyStroke {
  points: NormPoint[];
  /** Radius as a fraction of image width. */
  radius: number;
  /** 0..1 */
  strength: number;
  mode: 'push' | 'bulge' | 'pinch' | 'restore';
}

/** All portrait settings kept in the editor state. */
export interface PortraitSettings {
  skin: SkinSettings;
  reshape: ReshapeSettings;
  makeup: MakeupSettings;
  /** Blemish spots the user tapped, in 0..1 coordinates with radius as a fraction of width. */
  blemishSpots: { x: number; y: number; radius: number }[];
  liquify: LiquifyStroke[];
}

/** Neutral portrait settings. */
export function defaultPortraitSettings(): PortraitSettings {
  return {
    skin: { smooth: 0, whiten: 0, teeth: 0, eyes: 0, blemish: 100 },
    reshape: {
      faceSlim: 0,
      jaw: 0,
      chin: 0,
      noseWidth: 0,
      eyeSize: 0,
      eyeDistance: 0,
      eyeLift: 0,
      mouthSize: 0,
      forehead: 0,
      headSize: 0,
    },
    makeup: {
      lipstick: { color: '#c2185b', opacity: 0 },
      blush: { color: '#f48fb1', opacity: 0 },
      eyebrows: { color: '#3e2723', opacity: 0 },
      eyeshadow: { color: '#6d4c41', opacity: 0 },
      contacts: { color: '#5d8aa8', opacity: 0 },
      eyeliner: { color: '#1a1a1a', opacity: 0 },
    },
    blemishSpots: [],
    liquify: [],
  };
}

/** Metadata for the reshape sliders (drives the UI). */
export const RESHAPE_DEFINITIONS: readonly {
  key: keyof ReshapeSettings;
  label: string;
  description: string;
}[] = [
  { key: 'faceSlim', label: '瘦脸', description: '收窄脸颊与下半张脸。' },
  { key: 'jaw', label: '下颌线', description: '让下颌线更清晰或更柔和。' },
  { key: 'chin', label: '下巴', description: '拉长或缩短下巴。' },
  { key: 'headSize', label: '小头', description: '让整个头部略微变小。' },
  { key: 'forehead', label: '额头', description: '抬高或降低发际线。' },
  { key: 'noseWidth', label: '鼻宽', description: '让鼻子变窄或变宽。' },
  { key: 'eyeSize', label: '眼睛大小', description: '放大或缩小双眼。' },
  { key: 'eyeDistance', label: '眼距', description: '让双眼分开或靠近。' },
  { key: 'eyeLift', label: '眼角上扬', description: '上扬眼角。' },
  { key: 'mouthSize', label: '嘴巴大小', description: '放大或缩小嘴巴。' },
];

/** Metadata for the skin sliders. */
export const SKIN_DEFINITIONS: readonly {
  key: keyof SkinSettings;
  label: string;
  description: string;
}[] = [
  {
    key: 'smooth',
    label: '磨皮',
    description: '柔化毛孔与细纹，同时保留边缘。',
  },
  { key: 'whiten', label: '提亮肤色', description: '提亮并均匀肤色。' },
  { key: 'teeth', label: '美白牙齿', description: '去除牙齿的黄色。' },
  { key: 'eyes', label: '明亮双眼', description: '让眼睛更有神、更有对比。' },
];

/** Metadata for makeup items. */
export const MAKEUP_DEFINITIONS: readonly {
  key: keyof MakeupSettings;
  label: string;
  swatches: string[];
}[] = [
  {
    key: 'lipstick',
    label: '口红',
    swatches: [
      '#c2185b',
      '#e53935',
      '#ad1457',
      '#ff7043',
      '#8e24aa',
      '#d81b60',
      '#6d4c41',
      '#f06292',
    ],
  },
  {
    key: 'blush',
    label: '腮红',
    swatches: ['#f48fb1', '#ff8a80', '#ffab91', '#ce93d8', '#f8bbd0', '#ffcc80'],
  },
  {
    key: 'eyebrows',
    label: '眉毛',
    swatches: ['#3e2723', '#212121', '#5d4037', '#795548', '#8d6e63', '#4e342e'],
  },
  {
    key: 'eyeshadow',
    label: '眼影',
    swatches: ['#6d4c41', '#7b1fa2', '#0277bd', '#ef6c00', '#5d4037', '#c62828', '#455a64'],
  },
  {
    key: 'contacts',
    label: '美瞳',
    swatches: ['#5d8aa8', '#6b8e23', '#8b5a2b', '#708090', '#4b0082', '#2e8b57'],
  },
  { key: 'eyeliner', label: '眼线', swatches: ['#1a1a1a', '#3e2723', '#1a237e', '#004d40'] },
];
