import { describe, expect, it } from 'vitest';
import { generateLut, identityLut, parseCube } from './cube';

const SAMPLE = `TITLE "Tiny"
LUT_3D_SIZE 2
# comment
0 0 0
1 0 0
0 1 0
1 1 0
0 0 1
1 0 1
0 1 1
1 1 1
`;

describe('parseCube', () => {
  it('parses a valid 2x2x2 cube', () => {
    const lut = parseCube(SAMPLE);
    expect(lut.title).toBe('Tiny');
    expect(lut.size).toBe(2);
    expect(lut.data.length).toBe(24);
    expect(lut.data[3]).toBe(1);
  });

  it('rejects 1D LUTs and wrong entry counts', () => {
    expect(() => parseCube('LUT_1D_SIZE 2\n0\n1')).toThrow(/1D/);
    expect(() => parseCube('LUT_3D_SIZE 2\n0 0 0\n')).toThrow(/entries/);
    expect(() => parseCube('0 0 0')).toThrow(/LUT_3D_SIZE/);
  });

  it('generates identity tables', () => {
    const lut = identityLut(3);
    expect(lut.size).toBe(3);
    // Last entry is white.
    expect(Array.from(lut.data.slice(-3))).toEqual([1, 1, 1]);
    const inverted = generateLut('inv', 2, (r, g, b) => [1 - r, 1 - g, 1 - b]);
    expect(Array.from(inverted.data.slice(0, 3))).toEqual([1, 1, 1]);
  });
});
