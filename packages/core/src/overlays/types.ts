/** A point in normalised image coordinates (0..1 on each axis). */
export interface NormPoint {
  x: number;
  y: number;
}

/** Fields shared by every overlay layer. Positions are relative to the image so they survive resizing. */
export interface BaseLayer {
  id: string;
  type: 'text' | 'sticker' | 'doodle' | 'mosaic' | 'frame' | 'watermark';
  /** Centre of the layer in 0..1 image coordinates. */
  x: number;
  y: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Uniform scale multiplier (1 = natural size). */
  scale: number;
  /** 0..1 */
  opacity: number;
  /** Locked layers ignore drags. */
  locked?: boolean;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontFamily: string;
  /** Font size as a fraction of image width (0.06 ≈ a headline). */
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  /** Optional pill background behind the text. */
  background: string | null;
  strokeColor: string | null;
  /** Outline thickness as a fraction of font size. */
  strokeWidth: number;
  shadow: boolean;
  letterSpacing: number;
  lineHeight: number;
  /** Curves the text on an arc; 0 = straight, ±100 = strong bend. */
  curve: number;
}

export interface StickerLayer extends BaseLayer {
  type: 'sticker';
  /** Emoji character(s) or an image data URL. */
  kind: 'emoji' | 'image';
  emoji?: string;
  image?: CanvasImageSource & { width: number; height: number };
  imageUrl?: string;
  /** Size (height) as a fraction of image width. */
  size: number;
  flipHorizontal: boolean;
}

/** Brush types available in Doodle. */
export type BrushKind = 'pen' | 'marker' | 'neon' | 'dashed' | 'eraser';

export interface DoodleStroke {
  points: NormPoint[];
  color: string;
  /** Width as a fraction of image width. */
  width: number;
  brush: BrushKind;
  opacity: number;
}

export interface DoodleLayer extends BaseLayer {
  type: 'doodle';
  strokes: DoodleStroke[];
}

/** Mosaic styles. */
export type MosaicStyle = 'pixel' | 'blur' | 'hex' | 'crystal';

export interface MosaicStroke {
  points: NormPoint[];
  /** Brush size as a fraction of image width. */
  size: number;
  style: MosaicStyle;
  /** Block size as a fraction of image width (pixel/hex/crystal). */
  block: number;
}

export interface MosaicLayer extends BaseLayer {
  type: 'mosaic';
  strokes: MosaicStroke[];
}

export interface FrameLayer extends BaseLayer {
  type: 'frame';
  frameId: string;
  color: string;
  /** Thickness as a fraction of the shorter image edge. */
  width: number;
  /** Corner radius as a fraction of the shorter edge (rounded frames). */
  radius: number;
}

export type WatermarkAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface WatermarkLayer extends BaseLayer {
  type: 'watermark';
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  anchor: WatermarkAnchor;
  /** Repeat the watermark diagonally across the whole image. */
  tile: boolean;
  /** Distance from the edge as a fraction of image width. */
  margin: number;
}

export type OverlayLayer =
  TextLayer | StickerLayer | DoodleLayer | MosaicLayer | FrameLayer | WatermarkLayer;

/** Generates a short unique id for layers. */
export function layerId(prefix = 'layer'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
