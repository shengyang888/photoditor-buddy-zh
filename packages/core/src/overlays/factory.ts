import {
  layerId,
  type DoodleLayer,
  type FrameLayer,
  type MosaicLayer,
  type StickerLayer,
  type TextLayer,
  type WatermarkLayer,
} from './types';

/** Creates a text layer centred on the image with sensible defaults. */
export function createTextLayer(text = 'Double-tap to edit'): TextLayer {
  return {
    id: layerId('text'),
    type: 'text',
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
    opacity: 1,
    text,
    fontFamily: 'Inter',
    fontSize: 0.06,
    color: '#ffffff',
    bold: true,
    italic: false,
    align: 'center',
    background: null,
    strokeColor: null,
    strokeWidth: 0,
    shadow: true,
    letterSpacing: 0,
    lineHeight: 1.2,
    curve: 0,
  };
}

/** Creates an emoji sticker. */
export function createEmojiSticker(emoji: string): StickerLayer {
  return {
    id: layerId('sticker'),
    type: 'sticker',
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
    opacity: 1,
    kind: 'emoji',
    emoji,
    size: 0.18,
    flipHorizontal: false,
  };
}

/** Creates an image sticker (custom PNG, cut-out, etc.). */
export function createImageSticker(
  image: CanvasImageSource & { width: number; height: number },
  imageUrl?: string,
): StickerLayer {
  const sticker: StickerLayer = {
    id: layerId('sticker'),
    type: 'sticker',
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
    opacity: 1,
    kind: 'image',
    image,
    size: 0.3,
    flipHorizontal: false,
  };
  if (imageUrl) sticker.imageUrl = imageUrl;
  return sticker;
}

/** Creates an empty doodle layer (strokes are appended while drawing). */
export function createDoodleLayer(): DoodleLayer {
  return {
    id: layerId('doodle'),
    type: 'doodle',
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
    opacity: 1,
    strokes: [],
  };
}

/** Creates an empty mosaic layer. */
export function createMosaicLayer(): MosaicLayer {
  return {
    id: layerId('mosaic'),
    type: 'mosaic',
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
    opacity: 1,
    strokes: [],
  };
}

/** Creates a frame layer. */
export function createFrameLayer(frameId = 'thin', color = '#ffffff'): FrameLayer {
  return {
    id: layerId('frame'),
    type: 'frame',
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
    opacity: 1,
    frameId,
    color,
    width: 0.03,
    radius: 0.05,
  };
}

/** Creates a watermark layer anchored bottom-right. */
export function createWatermarkLayer(text = '© photoditor-buddy'): WatermarkLayer {
  return {
    id: layerId('watermark'),
    type: 'watermark',
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
    opacity: 0.6,
    text,
    fontFamily: 'Inter',
    fontSize: 0.03,
    color: '#ffffff',
    anchor: 'bottom-right',
    tile: false,
    margin: 0.03,
  };
}
