import { describe, expect, it } from 'vitest';
import { dataUrlToBlob, envelope, isProtocolMessage } from './index';

describe('SDK protocol', () => {
  it('wraps and recognises messages', () => {
    const msg = envelope({ type: 'export' as const });
    expect(msg.source).toBe('photoditor-buddy');
    expect(isProtocolMessage(msg)).toBe(true);
    expect(isProtocolMessage({ type: 'export' })).toBe(false);
    expect(isProtocolMessage(null)).toBe(false);
  });

  it('decodes data URLs', async () => {
    const blob = dataUrlToBlob(`data:image/png;base64,${btoa('hello')}`);
    expect(blob.type).toBe('image/png');
    expect(await blob.text()).toBe('hello');
  });
});
