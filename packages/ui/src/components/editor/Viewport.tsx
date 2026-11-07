import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createDoodleLayer,
  createMosaicLayer,
  drawOverlays,
  hitTestLayer,
  layerBounds,
  type DoodleLayer,
  type MosaicLayer,
  type NormPoint,
  type OverlayLayer,
} from '@photoditor-buddy/core';
import { useEditorStore } from '../../store/editorStore';
import { useInteractionStore } from '../../store/interactionStore';
import { useRenderer } from '../../engine/useRenderer';
import { useElementSize } from '../../hooks/useElementSize';
import { CropOverlay } from './CropOverlay';

interface PointerInfo {
  id: number;
  x: number;
  y: number;
}

/**
 * The central canvas area: WebGL preview + Canvas 2D overlays, fitted and zoomable.
 * Pointer handling depends on the active tool (drag layers, paint strokes, paint masks, pan).
 */
export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRenderer();
  const size = useElementSize(containerRef);
  const snapshot = useEditorStore((s) => s.snapshot);
  const activeTool = useEditorStore((s) => s.activeTool);
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId);
  const selectLayer = useEditorStore((s) => s.selectLayer);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const updateLive = useEditorStore((s) => s.updateLive);
  const commit = useEditorStore((s) => s.commit);
  const compare = useEditorStore((s) => s.compare);
  const interaction = useInteractionStore();
  const [pointers, setPointers] = useState<Map<number, PointerInfo>>(new Map());
  const gestureRef = useRef<{
    kind: string;
    layerId?: string;
    start?: { x: number; y: number; layerX: number; layerY: number };
    pinch?: { dist: number; angle: number; scale: number; rotation: number; zoom: number };
    stroke?: NormPoint[];
    layerRef?: OverlayLayer;
  } | null>(null);
  const measureCtx = useMemo(() => document.createElement('canvas').getContext('2d')!, []);

  const preview = snapshot?.source.preview;
  const imageWidth = preview?.width ?? 1;
  const imageHeight = preview?.height ?? 1;

  // Fit the image inside the container, then apply user zoom/pan.
  const fitScale = useMemo(() => {
    if (!size.width || !size.height) return 1;
    const padding = 24;
    return Math.min((size.width - padding) / imageWidth, (size.height - padding) / imageHeight, 4);
  }, [size, imageWidth, imageHeight]);
  const scale = fitScale * interaction.zoom;
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;
  const left = (size.width - displayWidth) / 2 + interaction.pan.x;
  const top = (size.height - displayHeight) / 2 + interaction.pan.y;

  // Draw overlays (and selection outline) whenever they change.
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !snapshot) return;
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, imageWidth, imageHeight);
    if (compare) return;
    drawOverlays(ctx, snapshot.overlays, imageWidth, imageHeight, snapshot.source.preview);
    const selected = snapshot.overlays.find((l) => l.id === selectedLayerId);
    if (
      selected &&
      (activeTool === 'text' || activeTool === 'stickers' || activeTool === 'layers')
    ) {
      const bounds = layerBounds(selected, imageWidth, imageHeight, measureCtx);
      if (bounds) {
        ctx.save();
        ctx.translate(selected.x * imageWidth, selected.y * imageHeight);
        ctx.rotate((selected.rotation * Math.PI) / 180);
        ctx.strokeStyle = '#ffb454';
        ctx.lineWidth = Math.max(1, imageWidth / 600);
        ctx.setLineDash([imageWidth / 100, imageWidth / 150]);
        ctx.strokeRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);
        ctx.restore();
      }
    }
    // AI mask preview.
    if (activeTool === 'ai' && interaction.aiMask) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(interaction.aiMask, 0, 0, imageWidth, imageHeight);
      ctx.restore();
    }
    // Blemish spots.
    if (activeTool === 'beauty' && interaction.beautyMode === 'blemish') {
      ctx.strokeStyle = 'rgba(255,180,84,0.9)';
      ctx.lineWidth = Math.max(1, imageWidth / 800);
      for (const spot of snapshot.portrait.blemishSpots) {
        ctx.beginPath();
        ctx.arc(
          spot.x * imageWidth,
          spot.y * imageHeight,
          spot.radius * imageWidth,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    }
  }, [
    snapshot,
    selectedLayerId,
    activeTool,
    imageWidth,
    imageHeight,
    measureCtx,
    compare,
    interaction.aiMask,
    interaction.aiMaskVersion,
    interaction.beautyMode,
  ]);

  /** Converts a pointer event to image pixel coordinates. */
  const toImage = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: (clientX - rect.left - left) / scale, y: (clientY - rect.top - top) / scale };
    },
    [left, top, scale],
  );

  const paintMode = getPaintMode(activeTool, interaction.beautyMode, interaction.aiMaskPainting);

  const onPointerDown = (e: React.PointerEvent): void => {
    if (!snapshot || activeTool === 'crop') return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const next = new Map(pointers);
    next.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
    setPointers(next);
    const p = toImage(e.clientX, e.clientY);
    const norm = { x: p.x / imageWidth, y: p.y / imageHeight };

    if (next.size === 2) {
      // Start pinch: either transform the selected layer or zoom the view.
      const [a, b] = Array.from(next.values());
      const dist = Math.hypot(b!.x - a!.x, b!.y - a!.y);
      const angle = Math.atan2(b!.y - a!.y, b!.x - a!.x);
      const selected = snapshot.overlays.find((l) => l.id === selectedLayerId);
      if (
        selected &&
        (activeTool === 'text' || activeTool === 'stickers' || activeTool === 'layers')
      ) {
        gestureRef.current = {
          kind: 'pinch-layer',
          layerId: selected.id,
          pinch: {
            dist,
            angle,
            scale: selected.scale,
            rotation: selected.rotation,
            zoom: interaction.zoom,
          },
        };
      } else {
        gestureRef.current = {
          kind: 'pinch-view',
          pinch: { dist, angle, scale: 1, rotation: 0, zoom: interaction.zoom },
        };
      }
      return;
    }

    if (paintMode === 'layer') {
      const hit = [...snapshot.overlays]
        .reverse()
        .find(
          (l) =>
            (l.type === 'text' || l.type === 'sticker') &&
            !l.locked &&
            hitTestLayer(l, p.x, p.y, imageWidth, imageHeight, measureCtx),
        );
      if (hit) {
        selectLayer(hit.id);
        gestureRef.current = {
          kind: 'drag-layer',
          layerId: hit.id,
          start: { x: p.x, y: p.y, layerX: hit.x, layerY: hit.y },
        };
      } else {
        selectLayer(null);
        gestureRef.current = {
          kind: 'pan',
          start: {
            x: e.clientX,
            y: e.clientY,
            layerX: interaction.pan.x,
            layerY: interaction.pan.y,
          },
        };
      }
      return;
    }
    if (paintMode === 'doodle' || paintMode === 'mosaic') {
      gestureRef.current = { kind: paintMode, stroke: [norm] };
      appendStroke(paintMode, [norm], true);
      return;
    }
    if (paintMode === 'liquify') {
      gestureRef.current = { kind: 'liquify', stroke: [norm] };
      updateLive({
        portrait: {
          ...snapshot.portrait,
          liquify: [...snapshot.portrait.liquify, liquifyStroke([norm])],
        },
      });
      return;
    }
    if (paintMode === 'blemish') {
      const spots = [
        ...snapshot.portrait.blemishSpots,
        { x: norm.x, y: norm.y, radius: interaction.brushSize * 0.6 },
      ];
      commit({ portrait: { ...snapshot.portrait, blemishSpots: spots } });
      return;
    }
    if (paintMode === 'ai-mask') {
      gestureRef.current = { kind: 'ai-mask', stroke: [norm] };
      paintMask([norm]);
      return;
    }
    if (paintMode === 'effect-center') {
      if (snapshot.effect)
        commit({
          effect: {
            ...snapshot.effect,
            centerX: Math.min(1, Math.max(0, norm.x)),
            centerY: Math.min(1, Math.max(0, norm.y)),
          },
        });
      return;
    }
    gestureRef.current = {
      kind: 'pan',
      start: { x: e.clientX, y: e.clientY, layerX: interaction.pan.x, layerY: interaction.pan.y },
    };
  };

  const onPointerMove = (e: React.PointerEvent): void => {
    const g = gestureRef.current;
    if (!g || !snapshot) return;
    const next = new Map(pointers);
    if (next.has(e.pointerId))
      next.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
    setPointers(next);
    const p = toImage(e.clientX, e.clientY);
    const norm = { x: p.x / imageWidth, y: p.y / imageHeight };

    if ((g.kind === 'pinch-layer' || g.kind === 'pinch-view') && next.size >= 2 && g.pinch) {
      const [a, b] = Array.from(next.values());
      const dist = Math.hypot(b!.x - a!.x, b!.y - a!.y);
      const angle = Math.atan2(b!.y - a!.y, b!.x - a!.x);
      const ratio = dist / Math.max(1, g.pinch.dist);
      const deltaDeg = ((angle - g.pinch.angle) * 180) / Math.PI;
      if (g.kind === 'pinch-layer' && g.layerId) {
        updateLayer(
          g.layerId,
          { scale: Math.max(0.1, g.pinch.scale * ratio), rotation: g.pinch.rotation + deltaDeg },
          true,
        );
      } else {
        interaction.set({ zoom: Math.min(8, Math.max(1, g.pinch.zoom * ratio)) });
      }
      return;
    }
    if (g.kind === 'drag-layer' && g.layerId && g.start) {
      updateLayer(
        g.layerId,
        {
          x: g.start.layerX + (p.x - g.start.x) / imageWidth,
          y: g.start.layerY + (p.y - g.start.y) / imageHeight,
        },
        true,
      );
      return;
    }
    if (g.kind === 'pan' && g.start) {
      if (interaction.zoom <= 1) return;
      interaction.set({
        pan: {
          x: g.start.layerX + (e.clientX - g.start.x),
          y: g.start.layerY + (e.clientY - g.start.y),
        },
      });
      return;
    }
    if ((g.kind === 'doodle' || g.kind === 'mosaic') && g.stroke) {
      g.stroke.push(norm);
      appendStroke(g.kind, g.stroke, true);
      return;
    }
    if (g.kind === 'liquify' && g.stroke) {
      g.stroke.push(norm);
      updateLive({
        portrait: {
          ...snapshot.portrait,
          liquify: [...snapshot.portrait.liquify.slice(0, -1), liquifyStroke(g.stroke)],
        },
      });
      return;
    }
    if (g.kind === 'ai-mask' && g.stroke) {
      g.stroke.push(norm);
      paintMask(g.stroke.slice(-2));
    }
  };

  const onPointerUp = (e: React.PointerEvent): void => {
    const g = gestureRef.current;
    const next = new Map(pointers);
    next.delete(e.pointerId);
    setPointers(next);
    if (!g || !snapshot) return;
    if (next.size > 0 && (g.kind === 'pinch-layer' || g.kind === 'pinch-view')) return;
    if (g.kind === 'pinch-layer' && g.layerId) {
      const layer = snapshot.overlays.find((l) => l.id === g.layerId);
      if (layer) updateLayer(g.layerId, { scale: layer.scale, rotation: layer.rotation });
    } else if (g.kind === 'drag-layer' && g.layerId) {
      const layer = snapshot.overlays.find((l) => l.id === g.layerId);
      if (layer) updateLayer(g.layerId, { x: layer.x, y: layer.y });
    } else if ((g.kind === 'doodle' || g.kind === 'mosaic') && g.stroke) {
      appendStroke(g.kind, g.stroke, false);
    } else if (g.kind === 'liquify' && g.stroke) {
      commit({ portrait: { ...snapshot.portrait } });
    } else if (g.kind === 'ai-mask') {
      interaction.bumpMask();
    }
    gestureRef.current = null;
  };

  /** Adds/updates the in-progress doodle or mosaic stroke on the tool's layer. */
  function appendStroke(kind: 'doodle' | 'mosaic', points: NormPoint[], live: boolean): void {
    if (!snapshot) return;
    const g = gestureRef.current;
    let layer = snapshot.overlays.find((l) => l.type === kind) as
      DoodleLayer | MosaicLayer | undefined;
    let overlays = snapshot.overlays;
    if (!layer) {
      layer = kind === 'doodle' ? createDoodleLayer() : createMosaicLayer();
      overlays = [...overlays, layer];
    }
    const isNew = !g?.layerRef;
    const strokes = isNew ? layer.strokes : layer.strokes.slice(0, -1);
    const stroke =
      kind === 'doodle'
        ? {
            points: [...points],
            color: interaction.brushColor,
            width: interaction.brushSize,
            brush: interaction.brushKind,
            opacity: interaction.brushOpacity,
          }
        : {
            points: [...points],
            size: interaction.brushSize,
            style: interaction.mosaicStyle,
            block: interaction.mosaicBlock,
          };
    const updated = { ...layer, strokes: [...strokes, stroke] } as OverlayLayer;
    if (g) g.layerRef = updated;
    const nextOverlays = overlays.map((l) => (l.id === layer!.id ? updated : l));
    if (live) updateLive({ overlays: nextOverlays });
    else commit({ overlays: nextOverlays });
  }

  /** Builds a liquify stroke from the current brush settings. */
  function liquifyStroke(points: NormPoint[]) {
    return {
      points: [...points],
      radius: interaction.liquifyRadius,
      strength: interaction.liquifyStrength,
      mode: interaction.liquifyMode,
    };
  }

  /** Paints brush dabs into the AI mask canvas (created lazily at preview size). */
  function paintMask(points: NormPoint[]): void {
    if (!snapshot) return;
    let mask = interaction.aiMask;
    if (!mask || mask.width !== imageWidth || mask.height !== imageHeight) {
      mask = document.createElement('canvas');
      mask.width = imageWidth;
      mask.height = imageHeight;
      interaction.set({ aiMask: mask });
    }
    const ctx = mask.getContext('2d')!;
    ctx.strokeStyle = '#ff2d7a';
    ctx.fillStyle = '#ff2d7a';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = interaction.brushSize * imageWidth;
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(
        points[0]!.x * imageWidth,
        points[0]!.y * imageHeight,
        (interaction.brushSize * imageWidth) / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(points[0]!.x * imageWidth, points[0]!.y * imageHeight);
      for (const pt of points.slice(1)) ctx.lineTo(pt.x * imageWidth, pt.y * imageHeight);
      ctx.stroke();
    }
    interaction.bumpMask();
  }

  const onWheel = (e: React.WheelEvent): void => {
    if (!snapshot || activeTool === 'crop') return;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const zoom = Math.min(8, Math.max(1, interaction.zoom * factor));
    interaction.set({ zoom, ...(zoom === 1 ? { pan: { x: 0, y: 0 } } : {}) });
  };

  const cursor =
    paintMode === 'layer'
      ? 'move'
      : paintMode && paintMode !== 'pan'
        ? 'crosshair'
        : interaction.zoom > 1
          ? 'grab'
          : 'default';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-0 overflow-hidden bg-bg select-none"
      data-testid="viewport"
    >
      {snapshot && (
        <div className="absolute" style={{ left, top, width: displayWidth, height: displayHeight }}>
          <div className="absolute inset-0 checkerboard rounded-sm" />
          <canvas
            ref={glRef}
            className="absolute inset-0 w-full h-full"
            data-testid="preview-canvas"
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            data-testid="overlay-canvas"
          />
          {activeTool === 'crop' && <CropOverlay scale={scale} />}
        </div>
      )}
      {snapshot && activeTool !== 'crop' && (
        <div
          className="absolute inset-0"
          style={{ cursor, touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          data-testid="interaction-layer"
        />
      )}
      {compare && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-xs px-3 py-1 rounded-full">
          原图
        </div>
      )}
    </div>
  );
}

type PaintMode =
  | 'layer'
  | 'doodle'
  | 'mosaic'
  | 'liquify'
  | 'blemish'
  | 'ai-mask'
  | 'effect-center'
  | 'pan'
  | null;

function getPaintMode(tool: string | null, beautyMode: string, aiMaskPainting: boolean): PaintMode {
  switch (tool) {
    case 'text':
    case 'stickers':
    case 'layers':
      return 'layer';
    case 'doodle':
      return 'doodle';
    case 'mosaic':
      return 'mosaic';
    case 'beauty':
      return beautyMode === 'liquify' ? 'liquify' : beautyMode === 'blemish' ? 'blemish' : 'pan';
    case 'ai':
      return aiMaskPainting ? 'ai-mask' : 'pan';
    case 'effects':
      return 'effect-center';
    default:
      return 'pan';
  }
}
