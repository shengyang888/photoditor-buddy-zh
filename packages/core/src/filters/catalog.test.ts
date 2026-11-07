import { describe, expect, it } from 'vitest';
import { ADJUSTMENT_BY_KEY, HSL_BANDS } from '../adjustments/defaults';
import { FILTER_CATALOG, FILTER_CATEGORIES, filtersInCategory, findFilter } from './catalog';
import { buildRecipeLut } from './lutRecipes';

describe('filter catalogue', () => {
  it('ships at least 200 filters with unique ids', () => {
    expect(FILTER_CATALOG.length).toBeGreaterThanOrEqual(200);
    const ids = new Set(FILTER_CATALOG.map((f) => f.id));
    expect(ids.size).toBe(FILTER_CATALOG.length);
  });

  it('every preset value is inside its slider range', () => {
    for (const filter of FILTER_CATALOG) {
      for (const [key, value] of Object.entries(filter.preset)) {
        if (typeof value !== 'number') continue;
        const def = ADJUSTMENT_BY_KEY[key as keyof typeof ADJUSTMENT_BY_KEY];
        expect(def, `${filter.id} uses unknown slider ${key}`).toBeDefined();
        expect(value, `${filter.id}.${key}`).toBeGreaterThanOrEqual(def.min);
        expect(value, `${filter.id}.${key}`).toBeLessThanOrEqual(def.max);
      }
      if (filter.preset.hsl) {
        for (const band of Object.keys(filter.preset.hsl)) expect(HSL_BANDS).toContain(band);
      }
    }
  });

  it('categories are derived from the catalogue and lookups work', () => {
    expect(FILTER_CATEGORIES.length).toBeGreaterThanOrEqual(15);
    for (const category of FILTER_CATEGORIES)
      expect(filtersInCategory(category).length).toBeGreaterThan(0);
    expect(findFilter('film-portra-400')?.name).toBe('波特拉 400');
    expect(findFilter('does-not-exist')).toBeUndefined();
  });

  it('builds LUTs for every recipe and caches them', () => {
    for (const filter of FILTER_CATALOG) {
      if (!filter.lut) continue;
      const lut = buildRecipeLut(filter.lut, 9);
      expect(lut.data.length).toBe(9 * 9 * 9 * 3);
      expect(buildRecipeLut(filter.lut, 9)).toBe(lut);
    }
  });
});
