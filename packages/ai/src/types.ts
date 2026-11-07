import type { CloudProviderId } from './vault';

/** Where a task runs. `local` = free, in the browser; `cloud` = user's API key. */
export type AiRuntime = 'cloud' | 'local';

/** Progress updates for long operations (model downloads, uploads). `progress` is 0..1 or undefined when unknown. */
export interface AiProgress {
  stage: string;
  progress?: number;
}

export type ProgressCallback = (progress: AiProgress) => void;

/** Output size options for cloud generation. */
export type ImageSize = '1K' | '2K' | '4K';

/** Aspect ratios Gemini accepts for generated images. */
export type AspectRatio =
  '1:1' | '3:2' | '2:3' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

/** Common input for an image-to-image call. */
export interface ImageEditRequest {
  /** The photo to edit (PNG/JPEG/WebP). */
  image: Blob;
  /** Natural-language instruction. */
  prompt: string;
  /** Optional PNG mask: transparent (alpha 0) pixels mark the area to change (OpenAI convention). */
  mask?: Blob;
  /** Optional extra reference images (style, product...). */
  references?: Blob[];
  aspectRatio?: AspectRatio;
  size?: ImageSize;
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}

/** Result of any AI operation. */
export interface ImageEditResult {
  blob: Blob;
  provider: CloudProviderId | 'local';
  model: string;
  /** Optional text the model returned alongside the image. */
  note?: string;
}

/** Provider capabilities so the UI can grey out what a provider cannot do. */
export interface ProviderCapabilities {
  masks: boolean;
  aspectRatio: boolean;
  sizes: ImageSize[];
  references: boolean;
}

/** A cloud image-editing provider. */
export interface ImageEditProvider {
  readonly id: CloudProviderId;
  readonly label: string;
  readonly capabilities: ProviderCapabilities;
  editImage(request: ImageEditRequest): Promise<ImageEditResult>;
}
