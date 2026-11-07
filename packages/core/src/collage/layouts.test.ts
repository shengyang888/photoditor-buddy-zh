import { describe, expect, it } from 'vitest';
import { COLLAGE_LAYOUTS, findLayout, layoutsForCount, stitchLayout } from './layouts';
import { coverRect } from './render';

describe('collage layouts', () => {
  it('every slot stays inside the canvas and counts match', () => {
    for (const layout of COLLAGE_LAYOUTS) {
      expect(layout.slots.length).toBe(layout.count);
      for (const s of layout.slots) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.x + s.w).toBeLessThanOrEqual(1.0001);
        expect(s.y + s.h).toBeLessThanOrEqual(1.0001);
        expect(s.w).toBeGreaterThan(0);
        expect(s.h).toBeGreaterThan(0);
      }
    }
    for (let n = 1; n <= 9; n++) expect(layoutsForCount(n).length).toBeGreaterThan(0);
    expect(findLayout('4-grid')?.count).toBe(4);
  });

  it('stitch layouts tile the full length without gaps', () => {
    const v = stitchLayout([1.5, 0.75, 1], 'vertical');
    const total = v.slots.reduce((s, slot) => s + slot.h, 0);
    expect(total).toBeCloseTo(1, 6);
    expect(v.slots[0]!.y).toBe(0);
    const h = stitchLayout([1, 2], 'horizontal');
    expect(h.slots[1]!.x).toBeCloseTo(1 / 3, 6);
    expect(h.aspect).toBe(3);
  });

  it('coverRect fills the slot and respects pan limits', () => {
    const r = coverRect(1000, 500, 100, 100);
    expect(r.sw).toBe(500);
    expect(r.sh).toBe(500);
    expect(r.sx).toBe(250);
    const panned = coverRect(1000, 500, 100, 100, [1, 0]);
    expect(panned.sx).toBe(500);
    const zoomed = coverRect(1000, 500, 100, 100, [0, 0], 2);
    expect(zoomed.sw).toBe(250);
  });
});
