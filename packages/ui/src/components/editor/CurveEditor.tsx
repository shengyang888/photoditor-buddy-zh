import { useRef, useState } from 'react';
import { evaluateCurve, normaliseCurve, type CurvePoint } from '@photoditor-buddy/core';

interface CurveEditorProps {
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
  onCommit: (points: CurvePoint[]) => void;
  color?: string;
}

/**
 * Tone-curve editor: drag points, tap the line to add one, double-tap a point to remove it.
 * Endpoints can only move vertically.
 */
export function CurveEditor({ points, onChange, onCommit, color = '#ffb454' }: CurveEditorProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const size = 200;
  const pts = normaliseCurve(points);
  const toSvg = (p: CurvePoint): [number, number] => [p.x * size, (1 - p.y) * size];
  const fromEvent = (e: React.PointerEvent): CurvePoint => {
    const rect = ref.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height)),
    };
  };
  const path = Array.from({ length: 65 }, (_, i) => {
    const x = i / 64;
    const [sx, sy] = toSvg({ x, y: evaluateCurve(pts, x) });
    return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
  }).join(' ');

  const onDown = (e: React.PointerEvent): void => {
    const p = fromEvent(e);
    const hitRadius = 0.06;
    let index = pts.findIndex((q) => Math.hypot(q.x - p.x, q.y - p.y) < hitRadius);
    if (index < 0) {
      const next = normaliseCurve([...pts, p]);
      index = next.findIndex((q) => q.x === p.x);
      onChange(next);
    }
    setDragIndex(index);
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent): void => {
    if (dragIndex === null) return;
    const p = fromEvent(e);
    const next = pts.map((q, i) => {
      if (i !== dragIndex) return q;
      const isEnd = i === 0 || i === pts.length - 1;
      const prev = pts[i - 1];
      const after = pts[i + 1];
      const x = isEnd
        ? q.x
        : Math.min(after ? after.x - 0.01 : 1, Math.max(prev ? prev.x + 0.01 : 0, p.x));
      return { x, y: p.y };
    });
    onChange(next);
  };
  const onUp = (): void => {
    if (dragIndex !== null) onCommit(pts);
    setDragIndex(null);
  };
  const onDoubleClick = (e: React.MouseEvent): void => {
    const rect = ref.current!.getBoundingClientRect();
    const p = {
      x: (e.clientX - rect.left) / rect.width,
      y: 1 - (e.clientY - rect.top) / rect.height,
    };
    const index = pts.findIndex(
      (q, i) => i !== 0 && i !== pts.length - 1 && Math.hypot(q.x - p.x, q.y - p.y) < 0.06,
    );
    if (index >= 0) {
      const next = pts.filter((_, i) => i !== index);
      onChange(next);
      onCommit(next);
    }
  };

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${size} ${size}`}
      className="w-full aspect-square bg-surface-2 rounded-xl border border-border touch-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onDoubleClick={onDoubleClick}
      role="img"
      aria-label="色调曲线"
    >
      {[0.25, 0.5, 0.75].map((g) => (
        <g key={g} stroke="#2c313a" strokeWidth={1}>
          <line x1={g * size} y1={0} x2={g * size} y2={size} />
          <line x1={0} y1={g * size} x2={size} y2={g * size} />
        </g>
      ))}
      <line x1={0} y1={size} x2={size} y2={0} stroke="#3a404a" strokeDasharray="4 4" />
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} />
      {pts.map((p, i) => {
        const [sx, sy] = toSvg(p);
        return <circle key={i} cx={sx} cy={sy} r={6} fill="#fff" stroke={color} strokeWidth={2} />;
      })}
    </svg>
  );
}
