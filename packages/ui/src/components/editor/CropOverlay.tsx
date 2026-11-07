import { useRef } from 'react';
import { clampCrop, fitAspect, ASPECT_PRESETS, type CropRect } from '@photoditor-buddy/core';
import { useEditorStore } from '../../store/editorStore';
import { useInteractionStore } from '../../store/interactionStore';

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'move';

/**
 * Crop rectangle with eight handles and a rule-of-thirds grid, drawn over the preview.
 * Coordinates are in preview pixels; `scale` converts to screen pixels.
 */
export function CropOverlay({ scale }: { scale: number }) {
  const snapshot = useEditorStore((s) => s.snapshot);
  const draft = useInteractionStore((s) => s.cropDraft);
  const set = useInteractionStore((s) => s.set);
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; rect: CropRect } | null>(
    null,
  );
  if (!snapshot || !draft) return null;
  const rotated = draft.rotation % 2 === 1;
  const width = rotated ? snapshot.source.preview.height : snapshot.source.preview.width;
  const height = rotated ? snapshot.source.preview.width : snapshot.source.preview.height;
  const rect = draft.crop;
  const preset = ASPECT_PRESETS.find((p) => p.id === draft.presetId);
  const ratio = preset?.ratio === -1 ? width / height : (preset?.ratio ?? null);

  const startDrag = (handle: Handle, e: React.PointerEvent): void => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { handle, startX: e.clientX, startY: e.clientY, rect: { ...rect } };
  };
  const onMove = (e: React.PointerEvent): void => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    let next: CropRect = { ...d.rect };
    if (d.handle === 'move') {
      next.x += dx;
      next.y += dy;
    } else {
      if (d.handle.includes('e')) next.width += dx;
      if (d.handle.includes('s')) next.height += dy;
      if (d.handle.includes('w')) {
        next.x += dx;
        next.width -= dx;
      }
      if (d.handle.includes('n')) {
        next.y += dy;
        next.height -= dy;
      }
      if (ratio) {
        // Keep the aspect ratio by deriving one side from the other, anchored at the opposite edge.
        const fromWidth = d.handle === 'e' || d.handle === 'w' || d.handle.length === 2;
        if (fromWidth) {
          const h = next.width / ratio;
          if (d.handle.includes('n')) next.y += next.height - h;
          next.height = h;
        } else {
          const w = next.height * ratio;
          if (d.handle.includes('w')) next.x += next.width - w;
          next.width = w;
        }
      }
      if (next.width < 16 || next.height < 16) return;
    }
    next = clampCrop(next, width, height);
    if (ratio && Math.abs(next.width / next.height - ratio) > 0.01) {
      const fitted = fitAspect(next.width, next.height, ratio);
      next = clampCrop(
        { x: next.x + fitted.x, y: next.y + fitted.y, width: fitted.width, height: fitted.height },
        width,
        height,
      );
    }
    set({ cropDraft: { ...draft, crop: next } });
  };
  const onUp = (): void => {
    dragRef.current = null;
  };

  const handles: { id: Handle; x: number; y: number; cursor: string }[] = [
    { id: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
    { id: 'n', x: 0.5, y: 0, cursor: 'ns-resize' },
    { id: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
    { id: 'e', x: 1, y: 0.5, cursor: 'ew-resize' },
    { id: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
    { id: 's', x: 0.5, y: 1, cursor: 'ns-resize' },
    { id: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
    { id: 'w', x: 0, y: 0.5, cursor: 'ew-resize' },
  ];
  const px = (v: number): number => v * scale;

  return (
    <div
      className="absolute inset-0"
      style={{ touchAction: 'none' }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      data-testid="crop-overlay"
    >
      {/* Dim outside the crop. */}
      <div
        className="absolute bg-black/55"
        style={{ left: 0, top: 0, right: 0, height: px(rect.y) }}
      />
      <div
        className="absolute bg-black/55"
        style={{ left: 0, top: px(rect.y + rect.height), right: 0, bottom: 0 }}
      />
      <div
        className="absolute bg-black/55"
        style={{ left: 0, top: px(rect.y), width: px(rect.x), height: px(rect.height) }}
      />
      <div
        className="absolute bg-black/55"
        style={{
          left: px(rect.x + rect.width),
          top: px(rect.y),
          right: 0,
          height: px(rect.height),
        }}
      />
      <div
        className="absolute border border-white/90 cursor-move"
        style={{
          left: px(rect.x),
          top: px(rect.y),
          width: px(rect.width),
          height: px(rect.height),
        }}
        onPointerDown={(e) => startDrag('move', e)}
      >
        {/* Rule of thirds. */}
        <div className="absolute inset-0 pointer-events-none opacity-60">
          <div className="absolute top-0 bottom-0 left-1/3 border-l border-white/60" />
          <div className="absolute top-0 bottom-0 left-2/3 border-l border-white/60" />
          <div className="absolute left-0 right-0 top-1/3 border-t border-white/60" />
          <div className="absolute left-0 right-0 top-2/3 border-t border-white/60" />
        </div>
        {handles.map((h) => (
          <div
            key={h.id}
            role="presentation"
            data-testid={`crop-handle-${h.id}`}
            className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, cursor: h.cursor }}
            onPointerDown={(e) => startDrag(h.id, e)}
          >
            <div
              className={`bg-white rounded-sm shadow ${h.id.length === 2 ? 'h-3.5 w-3.5' : h.id === 'n' || h.id === 's' ? 'h-1.5 w-5' : 'h-5 w-1.5'}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
