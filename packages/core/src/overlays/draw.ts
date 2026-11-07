import { fontStack } from './catalog';
import type {
  DoodleLayer,
  FrameLayer,
  MosaicLayer,
  NormPoint,
  OverlayLayer,
  StickerLayer,
  TextLayer,
  WatermarkLayer,
} from './types';

/** Axis-aligned bounds of a layer in image pixels (before rotation). */
export interface LayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Draws every overlay layer, in order, on top of `base` and returns a new canvas of the same size.
 * Used for the on-screen overlay and for export (call with the full-resolution base).
 */
export function compositeOverlays(
  base: HTMLCanvasElement,
  layers: readonly OverlayLayer[],
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = base.width;
  out.height = base.height;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available.');
  ctx.drawImage(base, 0, 0);
  drawOverlays(ctx, layers, base.width, base.height, base);
  return out;
}

/** Draws layers onto an existing context whose size matches `width`×`height`. */
export function drawOverlays(
  ctx: CanvasRenderingContext2D,
  layers: readonly OverlayLayer[],
  width: number,
  height: number,
  base: HTMLCanvasElement | null,
): void {
  for (const layer of layers) {
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    switch (layer.type) {
      case 'text':
        drawText(ctx, layer, width, height);
        break;
      case 'sticker':
        drawSticker(ctx, layer, width, height);
        break;
      case 'doodle':
        drawDoodle(ctx, layer, width, height);
        break;
      case 'mosaic':
        if (base) drawMosaic(ctx, layer, width, height, base);
        break;
      case 'frame':
        drawFrame(ctx, layer, width, height);
        break;
      case 'watermark':
        drawWatermark(ctx, layer, width, height);
        break;
    }
    ctx.restore();
  }
}

/** Applies the layer's centre, rotation and scale to the context. */
function applyTransform(
  ctx: CanvasRenderingContext2D,
  layer: { x: number; y: number; rotation: number; scale: number },
  width: number,
  height: number,
): void {
  ctx.translate(layer.x * width, layer.y * height);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.scale(layer.scale, layer.scale);
}

/** Measures multi-line text and returns line metrics in pixels. */
export function measureText(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  width: number,
): {
  lines: string[];
  lineHeight: number;
  blockWidth: number;
  blockHeight: number;
  fontPx: number;
} {
  const fontPx = Math.max(4, layer.fontSize * width);
  ctx.font = `${layer.italic ? 'italic ' : ''}${layer.bold ? '700' : '400'} ${fontPx}px ${fontStack(layer.fontFamily)}`;
  ctx.letterSpacing = `${layer.letterSpacing * fontPx}px`;
  const lines = layer.text.split('\n');
  const lineHeight = fontPx * layer.lineHeight;
  const blockWidth = Math.max(...lines.map((l) => ctx.measureText(l || ' ').width), 1);
  return { lines, lineHeight, blockWidth, blockHeight: lineHeight * lines.length, fontPx };
}

function drawText(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  width: number,
  height: number,
): void {
  applyTransform(ctx, layer, width, height);
  const m = measureText(ctx, layer, width);
  ctx.textBaseline = 'middle';
  const pad = m.fontPx * 0.35;
  if (layer.background) {
    ctx.fillStyle = layer.background;
    roundRect(
      ctx,
      -m.blockWidth / 2 - pad,
      -m.blockHeight / 2 - pad * 0.5,
      m.blockWidth + pad * 2,
      m.blockHeight + pad,
      m.fontPx * 0.25,
    );
    ctx.fill();
  }
  if (layer.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = m.fontPx * 0.25;
    ctx.shadowOffsetY = m.fontPx * 0.08;
  }
  ctx.textAlign = layer.align;
  const alignX =
    layer.align === 'left' ? -m.blockWidth / 2 : layer.align === 'right' ? m.blockWidth / 2 : 0;
  m.lines.forEach((line, i) => {
    const y = -m.blockHeight / 2 + m.lineHeight * (i + 0.5);
    if (layer.curve !== 0 && m.lines.length === 1) {
      drawCurvedText(ctx, layer, line, m.fontPx, layer.curve);
      return;
    }
    if (layer.strokeColor && layer.strokeWidth > 0) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = layer.strokeWidth * m.fontPx;
      ctx.strokeStyle = layer.strokeColor;
      ctx.strokeText(line, alignX, y);
    }
    ctx.fillStyle = layer.color;
    ctx.fillText(line, alignX, y);
  });
}

/** Draws a single line along an arc. `curve` is -100..100 (negative bends downwards). */
function drawCurvedText(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  text: string,
  fontPx: number,
  curve: number,
): void {
  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0);
  const radius = Math.max(total / (Math.PI * (Math.abs(curve) / 100) * 1.2), fontPx);
  const dir = curve > 0 ? -1 : 1; // positive = smile shape (text bends up at the ends)
  const totalAngle = total / radius;
  let angle = -totalAngle / 2;
  ctx.textAlign = 'center';
  chars.forEach((ch, i) => {
    const w = widths[i]!;
    const a = angle + w / 2 / radius;
    ctx.save();
    ctx.rotate(a * -dir);
    ctx.translate(0, dir * radius);
    ctx.rotate(0);
    if (layer.strokeColor && layer.strokeWidth > 0) {
      ctx.lineWidth = layer.strokeWidth * fontPx;
      ctx.strokeStyle = layer.strokeColor;
      ctx.strokeText(ch, 0, -dir * radius + (dir > 0 ? 0 : 0));
    }
    ctx.fillStyle = layer.color;
    ctx.fillText(ch, 0, -dir * radius);
    ctx.restore();
    angle += w / radius;
  });
}

function drawSticker(
  ctx: CanvasRenderingContext2D,
  layer: StickerLayer,
  width: number,
  height: number,
): void {
  applyTransform(ctx, layer, width, height);
  if (layer.flipHorizontal) ctx.scale(-1, 1);
  const size = layer.size * width;
  if (layer.kind === 'emoji' && layer.emoji) {
    ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layer.emoji, 0, size * 0.05);
  } else if (layer.kind === 'image' && layer.image) {
    const ratio = layer.image.width / layer.image.height;
    const h = size;
    const w = h * ratio;
    ctx.drawImage(layer.image, -w / 2, -h / 2, w, h);
  }
}

/** Renders a smooth path through points using quadratic curves between midpoints. */
function tracePath(
  ctx: CanvasRenderingContext2D,
  points: NormPoint[],
  width: number,
  height: number,
): void {
  if (points.length === 0) return;
  ctx.beginPath();
  const first = points[0]!;
  ctx.moveTo(first.x * width, first.y * height);
  if (points.length === 1) {
    ctx.lineTo(first.x * width + 0.01, first.y * height);
    return;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!;
    const q = points[i + 1]!;
    const mx = ((p.x + q.x) / 2) * width;
    const my = ((p.y + q.y) / 2) * height;
    ctx.quadraticCurveTo(p.x * width, p.y * height, mx, my);
  }
  const last = points[points.length - 1]!;
  ctx.lineTo(last.x * width, last.y * height);
}

function drawDoodle(
  ctx: CanvasRenderingContext2D,
  layer: DoodleLayer,
  width: number,
  height: number,
): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of layer.strokes) {
    ctx.save();
    ctx.globalAlpha = layer.opacity * stroke.opacity;
    const w = Math.max(1, stroke.width * width);
    ctx.lineWidth = w;
    ctx.strokeStyle = stroke.color;
    ctx.setLineDash([]);
    if (stroke.brush === 'marker') {
      ctx.globalAlpha *= 0.5;
      ctx.lineCap = 'square';
    } else if (stroke.brush === 'neon') {
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = w * 1.5;
      tracePath(ctx, stroke.points, width, height);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = w * 0.4;
    } else if (stroke.brush === 'dashed') {
      ctx.setLineDash([w * 2, w * 1.5]);
    } else if (stroke.brush === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    }
    tracePath(ctx, stroke.points, width, height);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Mosaic: builds a fully mosaicked copy of the base once per style, then reveals it only
 * where the user painted. This keeps the brush cheap regardless of image size.
 */
function drawMosaic(
  ctx: CanvasRenderingContext2D,
  layer: MosaicLayer,
  width: number,
  height: number,
  base: HTMLCanvasElement,
): void {
  const byStyle = new Map<string, MosaicLayer['strokes']>();
  for (const s of layer.strokes) {
    const key = `${s.style}:${s.block.toFixed(4)}`;
    const list = byStyle.get(key) ?? [];
    list.push(s);
    byStyle.set(key, list);
  }
  for (const [, strokes] of byStyle) {
    const style = strokes[0]!.style;
    const block = Math.max(2, Math.round(strokes[0]!.block * width));
    const mosaic = buildMosaicSource(base, style, block);
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    const mctx = mask.getContext('2d')!;
    mctx.lineCap = 'round';
    mctx.lineJoin = 'round';
    mctx.strokeStyle = '#000';
    for (const s of strokes) {
      mctx.lineWidth = Math.max(2, s.size * width);
      tracePath(mctx, s.points, width, height);
      mctx.stroke();
    }
    mctx.globalCompositeOperation = 'source-in';
    mctx.drawImage(mosaic, 0, 0, width, height);
    ctx.drawImage(mask, 0, 0);
  }
}

/** Creates the mosaicked version of the whole image for one style. */
export function buildMosaicSource(
  base: HTMLCanvasElement,
  style: MosaicLayer['strokes'][number]['style'],
  block: number,
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = base.width;
  out.height = base.height;
  const ctx = out.getContext('2d')!;
  if (style === 'blur') {
    ctx.filter = `blur(${Math.max(2, block * 0.6)}px)`;
    ctx.drawImage(base, 0, 0);
    ctx.filter = 'none';
    return out;
  }
  const smallW = Math.max(1, Math.round(base.width / block));
  const smallH = Math.max(1, Math.round(base.height / block));
  const small = document.createElement('canvas');
  small.width = smallW;
  small.height = smallH;
  const sctx = small.getContext('2d')!;
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(base, 0, 0, smallW, smallH);
  if (style === 'pixel') {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, base.width, base.height);
    return out;
  }
  // Hex and crystal: draw one shape per cell coloured by the downsampled pixel.
  const data = sctx.getImageData(0, 0, smallW, smallH).data;
  for (let y = 0; y < smallH; y++) {
    for (let x = 0; x < smallW; x++) {
      const i = (y * smallW + x) * 4;
      ctx.fillStyle = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
      const cx = (x + 0.5) * block + (style === 'hex' && y % 2 ? block / 2 : 0);
      const cy = (y + 0.5) * block;
      const r = block * (style === 'hex' ? 0.6 : 0.75);
      ctx.beginPath();
      const sides = style === 'hex' ? 6 : 5;
      const rot = style === 'crystal' ? ((x * 7 + y * 13) % 6) * 0.5 : 0;
      for (let k = 0; k < sides; k++) {
        const a = rot + (k / sides) * Math.PI * 2;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  return out;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  layer: FrameLayer,
  width: number,
  height: number,
): void {
  const short = Math.min(width, height);
  const t = Math.max(1, layer.width * short);
  const radius = layer.radius * short;
  ctx.fillStyle = layer.color;
  ctx.strokeStyle = layer.color;
  switch (layer.frameId) {
    case 'thin':
    case 'thick': {
      ctx.lineWidth = t * (layer.frameId === 'thin' ? 0.5 : 1);
      ctx.strokeRect(
        ctx.lineWidth / 2,
        ctx.lineWidth / 2,
        width - ctx.lineWidth,
        height - ctx.lineWidth,
      );
      break;
    }
    case 'double': {
      ctx.lineWidth = t * 0.3;
      ctx.strokeRect(t * 0.15, t * 0.15, width - t * 0.3, height - t * 0.3);
      ctx.strokeRect(t * 0.8, t * 0.8, width - t * 1.6, height - t * 1.6);
      break;
    }
    case 'rounded': {
      // Fill everything outside a rounded rectangle.
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      roundRectPath(ctx, t, t, width - 2 * t, height - 2 * t, radius);
      ctx.fill('evenodd');
      break;
    }
    case 'polaroid': {
      ctx.fillRect(0, 0, width, t);
      ctx.fillRect(0, 0, t, height);
      ctx.fillRect(width - t, 0, t, height);
      ctx.fillRect(0, height - t * 3.2, width, t * 3.2);
      break;
    }
    case 'film': {
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, width, t * 1.6);
      ctx.fillRect(0, height - t * 1.6, width, t * 1.6);
      ctx.fillStyle = '#f2f2f2';
      const hole = t * 0.7;
      for (let x = hole; x < width - hole; x += hole * 2.2) {
        roundRectPath(ctx, x, t * 0.45, hole, hole * 0.7, hole * 0.15);
        ctx.fill();
        roundRectPath(ctx, x, height - t * 1.15, hole, hole * 0.7, hole * 0.15);
        ctx.fill();
      }
      break;
    }
    case 'inset':
    case 'glow': {
      const colour = layer.frameId === 'inset' ? 'rgba(0,0,0,' : 'rgba(255,255,255,';
      const size = t * 3;
      const sides: [number, number, number, number][] = [
        [0, 0, width, size],
        [0, height - size, width, size],
        [0, 0, size, height],
        [width - size, 0, size, height],
      ];
      sides.forEach(([x, y, w, h], i) => {
        const g =
          i === 0
            ? ctx.createLinearGradient(0, 0, 0, size)
            : i === 1
              ? ctx.createLinearGradient(0, height, 0, height - size)
              : i === 2
                ? ctx.createLinearGradient(0, 0, size, 0)
                : ctx.createLinearGradient(width, 0, width - size, 0);
        g.addColorStop(0, `${colour}0.85)`);
        g.addColorStop(1, `${colour}0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
      });
      break;
    }
    case 'dashed': {
      ctx.lineWidth = t * 0.4;
      ctx.setLineDash([t * 1.2, t * 0.8]);
      ctx.strokeRect(t * 0.6, t * 0.6, width - t * 1.2, height - t * 1.2);
      break;
    }
    case 'torn': {
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      const step = Math.max(6, t * 0.5);
      const jag = (n: number): number => (Math.sin(n * 12.9898) * 43758.5453) % 1;
      ctx.moveTo(t, t);
      for (let x = t; x < width - t; x += step) ctx.lineTo(x, t + Math.abs(jag(x)) * t * 0.8);
      for (let y = t; y < height - t; y += step)
        ctx.lineTo(width - t - Math.abs(jag(y + 1)) * t * 0.8, y);
      for (let x = width - t; x > t; x -= step)
        ctx.lineTo(x, height - t - Math.abs(jag(x + 2)) * t * 0.8);
      for (let y = height - t; y > t; y -= step) ctx.lineTo(t + Math.abs(jag(y + 3)) * t * 0.8, y);
      ctx.closePath();
      ctx.fill('evenodd');
      break;
    }
    case 'stamp': {
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      const r = t * 0.45;
      const stepX = width / Math.max(4, Math.round(width / (r * 2.6)));
      const stepY = height / Math.max(4, Math.round(height / (r * 2.6)));
      ctx.moveTo(t, t);
      ctx.lineTo(width - t, t);
      ctx.lineTo(width - t, height - t);
      ctx.lineTo(t, height - t);
      ctx.closePath();
      ctx.fill('evenodd');
      ctx.fillStyle = layer.color;
      for (let x = stepX / 2; x < width; x += stepX) {
        ctx.beginPath();
        ctx.arc(x, t, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, height - t, r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let y = stepY / 2; y < height; y += stepY) {
        ctx.beginPath();
        ctx.arc(t, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(width - t, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'gradient': {
      const size = t * 4;
      const g = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) / 2 - size,
        width / 2,
        height / 2,
        Math.max(width, height) / 1.2,
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, layer.color);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      break;
    }
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  layer: WatermarkLayer,
  width: number,
  height: number,
): void {
  const fontPx = Math.max(6, layer.fontSize * width);
  ctx.font = `600 ${fontPx}px ${fontStack(layer.fontFamily)}`;
  ctx.fillStyle = layer.color;
  ctx.textBaseline = 'middle';
  const margin = layer.margin * width;
  if (layer.tile) {
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.textAlign = 'center';
    const tw = ctx.measureText(layer.text).width + fontPx * 2;
    const th = fontPx * 3;
    const diag = Math.hypot(width, height);
    for (let y = -diag; y < diag; y += th) {
      for (let x = -diag; x < diag; x += tw) ctx.fillText(layer.text, x, y);
    }
    return;
  }
  const [v, h] = layer.anchor === 'center' ? ['middle', 'center'] : layer.anchor.split('-');
  ctx.textAlign = h === 'left' ? 'left' : h === 'right' ? 'right' : 'center';
  const x = h === 'left' ? margin : h === 'right' ? width - margin : width / 2;
  const y =
    v === 'top' ? margin + fontPx / 2 : v === 'bottom' ? height - margin - fontPx / 2 : height / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = fontPx * 0.15;
  ctx.fillText(layer.text, x, y);
}

/**
 * Bounding box (image pixels, unrotated) of a text or sticker layer, used for selection handles
 * and hit testing. Doodle, mosaic, frame and watermark layers are not draggable.
 */
export function layerBounds(
  layer: OverlayLayer,
  width: number,
  height: number,
  measureCtx: CanvasRenderingContext2D,
): LayerBounds | null {
  if (layer.type === 'text') {
    const m = measureText(measureCtx, layer, width);
    const pad = m.fontPx * 0.35;
    const w = (m.blockWidth + pad * 2) * layer.scale;
    const h = (m.blockHeight + pad) * layer.scale;
    return { x: layer.x * width - w / 2, y: layer.y * height - h / 2, width: w, height: h };
  }
  if (layer.type === 'sticker') {
    const size = layer.size * width * layer.scale;
    const ratio =
      layer.kind === 'image' && layer.image ? layer.image.width / layer.image.height : 1;
    return {
      x: layer.x * width - (size * ratio) / 2,
      y: layer.y * height - size / 2,
      width: size * ratio,
      height: size,
    };
  }
  return null;
}

/** True when point (image pixels) lies inside the layer's rotated bounds. */
export function hitTestLayer(
  layer: OverlayLayer,
  px: number,
  py: number,
  width: number,
  height: number,
  measureCtx: CanvasRenderingContext2D,
): boolean {
  const bounds = layerBounds(layer, width, height, measureCtx);
  if (!bounds) return false;
  const cx = layer.x * width;
  const cy = layer.y * height;
  const a = (-layer.rotation * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  const rx = dx * Math.cos(a) - dy * Math.sin(a);
  const ry = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(rx) <= bounds.width / 2 && Math.abs(ry) <= bounds.height / 2;
}
