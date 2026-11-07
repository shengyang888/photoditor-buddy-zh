import { describe, expect, it } from 'vitest';
import { buildCurveTable, evaluateCurve, isIdentityCurve, normaliseCurve } from './curves';

describe('curves', () => {
  it('identity curve returns its input', () => {
    const identity = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    for (const x of [0, 0.25, 0.5, 0.9, 1]) expect(evaluateCurve(identity, x)).toBeCloseTo(x, 6);
    expect(isIdentityCurve(identity)).toBe(true);
  });

  it('passes through control points and stays monotone', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0.25, y: 0.15 },
      { x: 0.75, y: 0.85 },
      { x: 1, y: 1 },
    ];
    expect(evaluateCurve(pts, 0.25)).toBeCloseTo(0.15, 6);
    expect(evaluateCurve(pts, 0.75)).toBeCloseTo(0.85, 6);
    let previous = -1;
    for (let i = 0; i <= 100; i++) {
      const y = evaluateCurve(pts, i / 100);
      expect(y).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = y;
    }
    expect(isIdentityCurve(pts)).toBe(false);
  });

  it('normalises unsorted / duplicate / out-of-range points', () => {
    const pts = normaliseCurve([
      { x: 0.8, y: 1.4 },
      { x: 0.2, y: -1 },
      { x: 0.2, y: 0.5 },
    ]);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]!.x).toBe(1);
    expect(pts.every((p) => p.y >= 0 && p.y <= 1)).toBe(true);
  });

  it('builds a 256-entry table', () => {
    const table = buildCurveTable([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(table.length).toBe(256);
    expect(table[0]).toBe(0);
    expect(table[255]).toBe(255);
    expect(table[128]).toBe(128);
  });
});
