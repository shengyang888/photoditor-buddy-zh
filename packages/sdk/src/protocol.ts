/**
 * postMessage protocol between a host page and the embedded editor iframe.
 * Every message carries `source: 'photoditor-buddy'` so unrelated messages are ignored.
 */
export const PROTOCOL_SOURCE = 'photoditor-buddy';
export const PROTOCOL_VERSION = 1;

/** Tools the host may hide (`tools` option) — matches the editor's tool ids. */
export type EmbedToolId =
  | 'adjust'
  | 'filters'
  | 'crop'
  | 'effects'
  | 'beauty'
  | 'ai'
  | 'text'
  | 'stickers'
  | 'frames'
  | 'doodle'
  | 'mosaic'
  | 'watermark'
  | 'layers'
  | 'collage';

/** Options the host sends when the editor is ready. */
export interface EmbedConfig {
  /** Image to open immediately: a data URL, blob URL or CORS-enabled URL. */
  image?: string;
  fileName?: string;
  /** Which tools to show. Omit for all. */
  tools?: EmbedToolId[];
  /** Hide the Home screen and go straight to the editor (needs `image`). */
  autoStart?: boolean;
  /** Default export format. */
  exportFormat?: 'image/png' | 'image/jpeg' | 'image/webp';
  exportQuality?: number;
  /** When true the editor sends the result to the host instead of downloading it. */
  returnResult?: boolean;
  /** Label for the primary action button (e.g. "Save to profile"). */
  doneLabel?: string;
  /** Accent colour (CSS colour). */
  accent?: string;
}

/** Messages from host → editor. */
export type HostMessage =
  | { source: typeof PROTOCOL_SOURCE; version: number; type: 'configure'; config: EmbedConfig }
  | {
      source: typeof PROTOCOL_SOURCE;
      version: number;
      type: 'load-image';
      image: string;
      fileName?: string;
    }
  | { source: typeof PROTOCOL_SOURCE; version: number; type: 'export' }
  | { source: typeof PROTOCOL_SOURCE; version: number; type: 'reset' };

/** Messages from editor → host. */
export type EditorMessage =
  | { source: typeof PROTOCOL_SOURCE; version: number; type: 'ready' }
  | {
      source: typeof PROTOCOL_SOURCE;
      version: number;
      type: 'image-loaded';
      width: number;
      height: number;
    }
  | {
      source: typeof PROTOCOL_SOURCE;
      version: number;
      type: 'exported';
      dataUrl: string;
      mimeType: string;
      fileName: string;
      width: number;
      height: number;
    }
  | { source: typeof PROTOCOL_SOURCE; version: number; type: 'error'; message: string }
  | { source: typeof PROTOCOL_SOURCE; version: number; type: 'close' };

/** Type guard for messages produced by this protocol. */
export function isProtocolMessage(data: unknown): data is HostMessage | EditorMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { source?: unknown }).source === PROTOCOL_SOURCE &&
    typeof (data as { type?: unknown }).type === 'string'
  );
}

/** Creates a message with the protocol envelope filled in. */
export function envelope<T extends { type: string }>(
  message: T,
): T & { source: typeof PROTOCOL_SOURCE; version: number } {
  return { source: PROTOCOL_SOURCE, version: PROTOCOL_VERSION, ...message };
}
