import { AiError } from '../../errors';
import type { ProgressCallback } from '../../types';
import { LOCAL_MODELS, loadTransformers, preferredDevice, progressBridge } from './runtime';

export type BackgroundModel = 'portrait' | 'general';

/**
 * Removes the background entirely in the browser and returns a transparent PNG canvas.
 * `portrait` uses MODNet (small, fast, best for people); `general` uses BiRefNet-lite
 * (larger download, better for objects and animals). No API key is needed.
 */
export async function removeBackgroundLocally(
  source: HTMLCanvasElement,
  model: BackgroundModel = 'portrait',
  onProgress?: ProgressCallback,
): Promise<HTMLCanvasElement> {
  const tf = await loadTransformers();
  const device = await preferredDevice();
  onProgress?.({ stage: 'Loading background model…' });
  const image = await tf.RawImage.fromCanvas(source);
  let alpha: InstanceType<typeof tf.RawImage>;
  try {
    if (model === 'portrait') {
      const segmenter = await tf.pipeline('background-removal', LOCAL_MODELS.modnet, {
        dtype: 'fp32',
        device,
        progress_callback: progressBridge(onProgress, 'Background'),
      });
      onProgress?.({ stage: 'Removing background…' });
      // Transformers.js returns one RawImage for a single input (v4) or an array (older versions).
      const output = (await segmenter(image)) as unknown as
        InstanceType<typeof tf.RawImage> | InstanceType<typeof tf.RawImage>[];
      const result = Array.isArray(output) ? output[0] : output;
      if (!result) throw new AiError('unknown', 'The model returned nothing.');
      return rawImageToCanvas(result, tf);
    }
    const modelInstance = await tf.AutoModel.from_pretrained(LOCAL_MODELS.birefnet, {
      dtype: 'fp32',
      device,
      progress_callback: progressBridge(onProgress, 'Background'),
    });
    const processor = await tf.AutoProcessor.from_pretrained(LOCAL_MODELS.birefnet, {});
    onProgress?.({ stage: 'Removing background…' });
    const { pixel_values } = await processor(image);
    const outputs = (await modelInstance({ input_image: pixel_values })) as Record<
      string,
      { sigmoid: () => { mul: (n: number) => { to: (t: string) => unknown } } }[]
    >;
    const first = Object.values(outputs)[0]?.[0];
    if (!first) throw new AiError('unknown', 'The model returned nothing.');
    const maskTensor = first.sigmoid().mul(255).to('uint8');
    alpha = await tf.RawImage.fromTensor(maskTensor as never).resize(image.width, image.height);
    image.putAlpha(alpha);
    return rawImageToCanvas(image, tf);
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(
      'model-download',
      `Background removal failed: ${error instanceof Error ? error.message : String(error)}. Check your connection (the model downloads on first use).`,
      error,
    );
  }
}

/** Draws a RawImage (RGBA) onto a fresh canvas. */
function rawImageToCanvas(
  image: {
    width: number;
    height: number;
    channels: number;
    data: Uint8Array | Uint8ClampedArray;
    rgba: () => { data: Uint8Array | Uint8ClampedArray };
  },
  _tf: unknown,
): HTMLCanvasElement {
  const rgba = image.channels === 4 ? image : image.rgba();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(image.width, image.height);
  imageData.data.set(rgba.data as Uint8ClampedArray);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
