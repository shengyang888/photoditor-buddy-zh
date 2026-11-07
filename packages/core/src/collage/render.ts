import type { CollageLayout } from './layouts';

/** Options for rendering a collage. */
export interface CollageOptions {
  layout: CollageLayout;
  images: (CanvasImageSource & { width: number; height: number })[];
  /** Output width in pixels; height follows the layout aspect. */
  width: number;
  background: string;
  /** Gap between photos as a fraction of the width (0..0.1). */
  gap: number;
  /** Corner radius as a fraction of the width. */
  radius: number;
  /** Per-slot pan offset (-1..1) and zoom (>=1) so users can reposition photos inside slots. */
  slotAdjust?: { pan: [number, number]; zoom: number }[];
  /** Poster layouts draw a soft shadow behind each photo. */
  shadow?: boolean;
}

/** Computes the source rectangle that covers a slot (like CSS `object-fit: cover`) with pan/zoom. */
export function coverRect(
  imageW: number,
  imageH: number,
  slotW: number,
  slotH: number,
  pan: [number, number] = [0, 0],
  zoom = 1,
): { sx: number; sy: number; sw: number; sh: number } {
  const scale = Math.max(slotW / imageW, slotH / imageH) * Math.max(1, zoom);
  const sw = slotW / scale;
  const sh = slotH / scale;
  const maxX = imageW - sw;
  const maxY = imageH - sh;
  const sx = maxX / 2 + (pan[0] * maxX) / 2;
  const sy = maxY / 2 + (pan[1] * maxY) / 2;
  return { sx: Math.max(0, Math.min(maxX, sx)), sy: Math.max(0, Math.min(maxY, sy)), sw, sh };
}

/** Renders the collage to a new canvas. Missing images leave their slot as a light placeholder. */
export function renderCollage(options: CollageOptions): HTMLCanvasElement {
  const { layout, images, width, background, gap, radius } = options;
  const height = Math.round(width / layout.aspect);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available.');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  const gapPx = gap * width;
  const radiusPx = radius * width;
  layout.slots.forEach((slot, i) => {
    const x = slot.x * width + gapPx / 2;
    const y = slot.y * height + gapPx / 2;
    const w = slot.w * width - gapPx;
    const h = slot.h * height - gapPx;
    if (w <= 0 || h <= 0) return;
    ctx.save();
    if (options.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = width * 0.02;
      ctx.shadowOffsetY = width * 0.006;
      ctx.fillStyle = '#ffffff';
      roundRectPath(ctx, x, y, w, h, radiusPx);
      ctx.fill();
      ctx.shadowColor = 'transparent';
    }
    roundRectPath(ctx, x, y, w, h, radiusPx);
    ctx.clip();
    const image = images[i];
    if (image) {
      const adjust = options.slotAdjust?.[i];
      const r = coverRect(image.width, image.height, w, h, adjust?.pan, adjust?.zoom);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, r.sx, r.sy, r.sw, r.sh, x, y, w, h);
    } else {
      ctx.fillStyle = 'rgba(127,127,127,0.25)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.font = `${Math.max(10, width * 0.03)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', x + w / 2, y + h / 2);
    }
    ctx.restore();
  });
  return canvas;
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
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Index of the slot under a point (collage pixels), or -1. */
export function slotAtPoint(
  layout: CollageLayout,
  width: number,
  height: number,
  px: number,
  py: number,
): number {
  return layout.slots.findIndex(
    (s) =>
      px >= s.x * width &&
      px <= (s.x + s.w) * width &&
      py >= s.y * height &&
      py <= (s.y + s.h) * height,
  );
}
