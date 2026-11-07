import { describe, expect, it, vi } from 'vitest';
import { GeminiProvider, buildGeminiBody } from './gemini';
import { OpenAiProvider, buildOpenAiForm, openAiSizeFor } from './openai';
import { AiError } from '../errors';

const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });

describe('Gemini provider', () => {
  it('builds a generateContent body with inline image and image config', async () => {
    const body = await buildGeminiBody(
      { image: png, prompt: 'make it blue', aspectRatio: '16:9', size: '2K' },
      'gemini-3.1-flash-image',
    );
    const contents = body.contents as { parts: Record<string, unknown>[] }[];
    expect(contents[0]!.parts[0]).toEqual({ text: 'make it blue' });
    expect(
      (contents[0]!.parts[1] as { inline_data: { mime_type: string; data: string } }).inline_data
        .mime_type,
    ).toBe('image/png');
    expect((body.generationConfig as { imageConfig: unknown }).imageConfig).toEqual({
      aspectRatio: '16:9',
      imageSize: '2K',
    });
  });

  it('omits imageSize for the lite model (1K only)', async () => {
    const body = await buildGeminiBody(
      { image: png, prompt: 'x', size: '4K' },
      'gemini-3.1-flash-lite-image',
    );
    expect((body.generationConfig as { imageConfig?: unknown }).imageConfig).toBeUndefined();
  });

  it('sends the key header, parses the image part and maps errors', async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toContain('/models/gemini-3.1-flash-image:generateContent');
      expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('AIzaKEY');
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: 'done' },
                  { inlineData: { mimeType: 'image/png', data: btoa('abc') } },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );
    });
    const provider = new GeminiProvider(
      'AIzaKEY',
      'gemini-3.1-flash-image',
      'https://example.test/v1beta',
      fetchMock as unknown as typeof fetch,
    );
    const result = await provider.editImage({ image: png, prompt: 'hi' });
    expect(result.blob.type).toBe('image/png');
    expect(result.note).toBe('done');

    const denied = new GeminiProvider(
      'bad',
      'gemini-3.1-flash-image',
      'https://example.test/v1beta',
      (async () =>
        new Response('{"error":{"message":"API key not valid"}}', {
          status: 403,
        })) as unknown as typeof fetch,
    );
    await expect(denied.editImage({ image: png, prompt: 'hi' })).rejects.toMatchObject({
      code: 'invalid-key',
    });

    const blocked = new GeminiProvider(
      'k',
      'gemini-3.1-flash-image',
      'https://example.test/v1beta',
      (async () =>
        new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), {
          status: 200,
        })) as unknown as typeof fetch,
    );
    await expect(blocked.editImage({ image: png, prompt: 'hi' })).rejects.toMatchObject({
      code: 'safety',
    });

    const noKey = new GeminiProvider('');
    await expect(noKey.editImage({ image: png, prompt: 'hi' })).rejects.toBeInstanceOf(AiError);
  });
});

describe('OpenAI provider', () => {
  it('builds a multipart form with mask and picks sizes by aspect', () => {
    const form = buildOpenAiForm(
      { image: png, prompt: 'p', mask: png },
      'gpt-image-2.5-sunburst',
      '1024x1024',
      'medium',
    );
    expect(form.get('model')).toBe('gpt-image-2.5-sunburst');
    expect(form.get('prompt')).toBe('p');
    expect(form.get('mask')).toBeInstanceOf(Blob);
    expect(form.get('input_fidelity')).toBe('high');
    expect(openAiSizeFor(1920, 1080)).toBe('1536x1024');
    expect(openAiSizeFor(1080, 1920)).toBe('1024x1536');
    expect(openAiSizeFor(1000, 1000)).toBe('1024x1024');
  });

  it('uses bearer auth and decodes b64_json; maps 429 to quota', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
      return new Response(JSON.stringify({ data: [{ b64_json: btoa('xyz') }] }), { status: 200 });
    });
    const provider = new OpenAiProvider(
      'sk-test',
      'gpt-image-2.5-sunburst',
      'medium',
      'https://example.test/v1',
      fetchMock as unknown as typeof fetch,
    );
    const result = await provider.editImage({ image: png, prompt: 'p' });
    expect(await result.blob.text()).toBe('xyz');
    const limited = new OpenAiProvider(
      'sk-test',
      'gpt-image-2.5-sunburst',
      'medium',
      'https://example.test/v1',
      (async () =>
        new Response('{"error":{"message":"rate"}}', { status: 429 })) as unknown as typeof fetch,
    );
    await expect(limited.editImage({ image: png, prompt: 'p' })).rejects.toMatchObject({
      code: 'quota',
    });
  });
});
