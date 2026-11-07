import { useEffect, useRef, type RefObject } from 'react';
import { Renderer, defaultAdjustments } from '@photoditor-buddy/core';
import { useEditorStore } from '../store/editorStore';
import { resolveRenderState } from './resolveRenderState';

/**
 * Owns the on-screen WebGL renderer. Re-renders (coalesced to one frame) whenever the snapshot,
 * detected faces or compare mode change. Returns the ref to attach to a `<canvas>`.
 */
export function useRenderer(): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const snapshot = useEditorStore((s) => s.snapshot);
  const faces = useEditorStore((s) => s.faces);
  const compare = useEditorStore((s) => s.compare);
  const toast = useEditorStore((s) => s.toast);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      rendererRef.current = new Renderer(canvas);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'WebGL 不可用。', 'error');
    }
    return () => {
      rendererRef.current?.dispose(false);
      rendererRef.current = null;
      sourceRef.current = null;
    };
  }, [toast]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !snapshot) return;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      try {
        if (sourceRef.current !== snapshot.source.preview) {
          renderer.setSource(snapshot.source.preview);
          sourceRef.current = snapshot.source.preview;
        }
        if (compare) {
          renderer.render({
            adjustments: defaultAdjustments(),
            lut: null,
            effect: null,
            portrait: null,
          });
        } else {
          renderer.render(resolveRenderState(snapshot, faces));
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : '渲染失败。', 'error');
      }
    });
  }, [snapshot, faces, compare, toast]);

  return canvasRef;
}
