import { describe, expect, it } from 'vitest';
import { buildReshapeField, bulgePoint, createField, pushPoint } from './warp';
import { defaultPortraitSettings } from './types';
import type { FaceLandmarks } from './regions';

function fakeFace(): FaceLandmarks {
  // A synthetic face centred in the image: every landmark sits on a small circle so indices are valid.
  const points = Array.from({ length: 478 }, (_, i) => {
    const a = (i / 478) * Math.PI * 2;
    return { x: 0.5 + Math.cos(a) * 0.12, y: 0.5 + Math.sin(a) * 0.16, z: 0 };
  });
  return { points };
}

describe('displacement fields', () => {
  it('createField keeps the image aspect ratio', () => {
    const f = createField(2000, 1000);
    expect(f.width).toBe(256);
    expect(f.height).toBe(128);
    expect(f.data.length).toBe(256 * 128 * 2);
  });

  it('pushPoint only changes pixels within the radius', () => {
    const f = createField(200, 200);
    pushPoint(f, 0.5, 0.5, 0.02, 0, 0.1, 1);
    const centre = ((f.height / 2) * f.width + f.width / 2) * 2;
    expect(f.data[centre]).toBeLessThan(0);
    expect(f.data[0]).toBe(0);
  });

  it('bulge points offsets inwards', () => {
    const f = createField(200, 200);
    bulgePoint(f, 0.5, 0.5, 0.2, 0.3, 1);
    // A pixel to the right of the centre should sample from further left (negative x offset).
    const i = ((f.height / 2) * f.width + Math.round(f.width * 0.55)) * 2;
    expect(f.data[i]).toBeLessThan(0);
  });

  it('returns null when nothing changes and a field when a slider moves', () => {
    const settings = defaultPortraitSettings();
    expect(buildReshapeField([fakeFace()], settings.reshape, [], 400, 400)).toBeNull();
    settings.reshape.eyeSize = 50;
    const field = buildReshapeField([fakeFace()], settings.reshape, [], 400, 400);
    expect(field).not.toBeNull();
    expect(Array.from(field!.data).some((v) => v !== 0)).toBe(true);
    const liquifyOnly = buildReshapeField(
      [],
      defaultPortraitSettings().reshape,
      [
        {
          points: [
            { x: 0.2, y: 0.2 },
            { x: 0.25, y: 0.2 },
          ],
          radius: 0.1,
          strength: 1,
          mode: 'push',
        },
      ],
      400,
      400,
    );
    expect(liquifyOnly).not.toBeNull();
  });
});
