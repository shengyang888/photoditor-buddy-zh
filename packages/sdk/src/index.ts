import {
  envelope,
  isProtocolMessage,
  type EditorMessage,
  type EmbedConfig,
  type HostMessage,
} from './protocol';

export * from './protocol';

/** Options for `mountPhotoditorBuddy`. */
export interface MountOptions extends EmbedConfig {
  /** Element (or CSS selector) the iframe is placed into. */
  container: HTMLElement | string;
  /** URL of the hosted editor's `embed.html`. Defaults to the demo deployment placeholder. */
  editorUrl?: string;
  /** Called with the edited image when the user taps Done (requires `returnResult: true`). */
  onExport?: (result: {
    dataUrl: string;
    blob: Blob;
    mimeType: string;
    fileName: string;
    width: number;
    height: number;
  }) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
  onClose?: () => void;
  /** Optional class name for the iframe. */
  className?: string;
}

/** Handle returned by `mountPhotoditorBuddy`. */
export interface EditorHandle {
  iframe: HTMLIFrameElement;
  /** Opens a new image (data URL, blob URL or CORS URL). */
  loadImage(image: string, fileName?: string): void;
  /** Triggers export as if the user pressed Done. */
  requestExport(): void;
  /** Resets the editor to the Home screen. */
  reset(): void;
  /** Removes the iframe and listeners. */
  destroy(): void;
}

/** Default hosted editor. Replace with your own deployment URL. */
export const DEFAULT_EDITOR_URL = 'https://alwaysnelson.github.io/photoditor-buddy/embed.html';

/** Converts a data URL into a Blob (for `onExport`). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(header ?? '')?.[1] ?? 'image/png';
  const binary = atob(data ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Mounts the editor into a page as an iframe and wires up the message protocol.
 *
 * ```ts
 * const editor = mountPhotoditorBuddy({ container: '#editor', image: url, returnResult: true, onExport: r => save(r.blob) });
 * ```
 */
export function mountPhotoditorBuddy(options: MountOptions): EditorHandle {
  const container =
    typeof options.container === 'string'
      ? document.querySelector<HTMLElement>(options.container)
      : options.container;
  if (!container) throw new Error('photoditor-buddy: container not found.');
  const editorUrl = options.editorUrl ?? DEFAULT_EDITOR_URL;
  const origin = new URL(editorUrl, window.location.href).origin;
  const iframe = document.createElement('iframe');
  iframe.src = editorUrl;
  iframe.allow = 'clipboard-write; fullscreen';
  iframe.style.border = '0';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.minHeight = '320px';
  if (options.className) iframe.className = options.className;
  iframe.title = 'photoditor-buddy 编辑器';
  container.appendChild(iframe);

  const send = (message: HostMessage): void => {
    iframe.contentWindow?.postMessage(message, origin);
  };
  const {
    container: _c,
    editorUrl: _u,
    onExport,
    onReady,
    onError,
    onClose,
    className: _cn,
    ...config
  } = options;

  const onMessage = (event: MessageEvent): void => {
    if (event.origin !== origin || event.source !== iframe.contentWindow) return;
    if (!isProtocolMessage(event.data)) return;
    const message = event.data as EditorMessage;
    switch (message.type) {
      case 'ready':
        send(envelope({ type: 'configure', config }));
        onReady?.();
        break;
      case 'exported':
        onExport?.({ ...message, blob: dataUrlToBlob(message.dataUrl) });
        break;
      case 'error':
        onError?.(message.message);
        break;
      case 'close':
        onClose?.();
        break;
      default:
        break;
    }
  };
  window.addEventListener('message', onMessage);

  return {
    iframe,
    loadImage: (image, fileName) =>
      send(envelope({ type: 'load-image', image, ...(fileName ? { fileName } : {}) })),
    requestExport: () => send(envelope({ type: 'export' })),
    reset: () => send(envelope({ type: 'reset' })),
    destroy: () => {
      window.removeEventListener('message', onMessage);
      iframe.remove();
    },
  };
}

/** Browser global for the `<script>` drop-in build (`window.PhotoditorBuddy.mount(...)`). */
export const PhotoditorBuddy = { mount: mountPhotoditorBuddy, dataUrlToBlob };
