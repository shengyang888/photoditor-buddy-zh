import { describe, expect, it } from 'vitest';
import { EFFECT_DEFINITIONS, defaultEffectSettings, findEffect } from './catalog';
import { EFFECT_IDS } from '../render/shaders/effects';

describe('effects catalogue', () => {
  it('every effect maps to a shader id and has unique ids', () => {
    const ids = new Set<string>();
    for (const e of EFFECT_DEFINITIONS) {
      expect(EFFECT_IDS[e.id]).toBeGreaterThan(0);
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
    }
    expect(EFFECT_DEFINITIONS.length).toBeGreaterThanOrEqual(20);
  });

  it('default settings use the catalogue defaults', () => {
    const s = defaultEffectSettings('pixelate');
    expect(s.amount).toBe(findEffect('pixelate')!.defaultAmount);
    expect(s.shape).toBe('whole');
  });
});
