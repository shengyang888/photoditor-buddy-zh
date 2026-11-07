import { useEffect } from 'react';
import { blobToDataUrl } from '@photoditor-buddy/core';
import {
  envelope,
  isProtocolMessage,
  type EditorMessage,
  type EmbedConfig,
  type HostMessage,
} from '@photoditor-buddy/sdk';
import { useEditorStore } from '../store/editorStore';

/**
 * Connects the editor to a host page when running inside an iframe (embed.html).
 * Announces readiness, applies the host's config, opens images on request and returns exports.
 */
export function useEmbedBridge(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || window.parent === window) return;
    const store = useEditorStore.getState();
    let hostOrigin = '*';
    const post = (message: EditorMessage): void => window.parent.postMessage(message, hostOrigin);

    const applyConfig = (config: EmbedConfig): void => {
      store.setEmbed(config);
      if (config.accent) document.documentElement.style.setProperty('--accent', config.accent);
      if (config.returnResult) {
        store.setExportHandler(async ({ blob, fileName, width, height }) => {
          post(
            envelope({
              type: 'exported',
              dataUrl: await blobToDataUrl(blob),
              mimeType: blob.type,
              fileName,
              width,
              height,
            }),
          );
          return true;
        });
      }
      if (config.image) {
        void store.openUrl(config.image, config.fileName).then(() => {
          const snapshot = useEditorStore.getState().snapshot;
          if (snapshot)
            post(
              envelope({
                type: 'image-loaded',
                width: snapshot.source.full.width,
                height: snapshot.source.full.height,
              }),
            );
        });
      }
    };

    const onMessage = (event: MessageEvent): void => {
      if (!isProtocolMessage(event.data)) return;
      const message = event.data as HostMessage;
      if (hostOrigin === '*' && event.origin) hostOrigin = event.origin;
      switch (message.type) {
        case 'configure':
          applyConfig(message.config);
          break;
        case 'load-image':
          void store.openUrl(message.image, message.fileName);
          break;
        case 'export':
          document.querySelector<HTMLButtonElement>('[data-testid="export-button"]')?.click();
          break;
        case 'reset':
          store.goHome();
          break;
        default:
          break;
      }
    };
    window.addEventListener('message', onMessage);
    post(envelope({ type: 'ready' }));
    return () => window.removeEventListener('message', onMessage);
  }, [enabled]);
}
