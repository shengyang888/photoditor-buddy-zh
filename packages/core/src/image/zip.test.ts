import { describe, expect, it } from 'vitest';
import { crc32, createZip } from './zip';

describe('zip writer', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('writes local headers, central directory and end record', async () => {
    const data = new TextEncoder().encode('hello');
    const blob = createZip([{ name: 'a.txt', data }]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const localLen = 30 + 5 + data.length;
    expect(view.getUint32(localLen, true)).toBe(0x02014b50);
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(bytes.length - 22 + 10, true)).toBe(1);
    expect(blob.type).toBe('application/zip');
  });
});
