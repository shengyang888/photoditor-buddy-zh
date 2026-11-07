import {
  Renderer,
  canvasToBlob,
  compositeOverlays,
  fitWithin,
  bitmapToCanvas,
  type ExportFormat,
  type FaceLandmarks,
} from '@photoditor-buddy/core';
import type { EditSnapshot } from '../store/types';
import { resolveRenderState } from './resolveRenderState';

/** Options for `renderFinal`. */
export interface FinalRenderOptions {
  /** Longest edge of the output; undefined keeps the original size. */
  maxEdge?: number;
  /** Skip overlays (used when an AI task should work on the pure photo). */
  withoutOverlays?: boolean;
}

/**
 * Renders the snapshot at full resolution: GPU pipeline on the full source, then overlays.
 * A temporary WebGL context is created and released so the preview renderer is untouched.
 */
export function renderFinal(
  snapshot: EditSnapshot,
  faces: FaceLandmarks[] | null,
  options: FinalRenderOptions = {},
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const renderer = new Renderer(canvas);
  try {
    let source = snapshot.source.full;
    const limit = Math.min(renderer.maxTextureSize, options.maxEdge ?? Infinity);
    if (Math.max(source.width, source.height) > limit) {
      const size = fitWithin(source.width, source.height, limit);
      source = bitmapToCanvas(source, size.width, size.height);
    }
    renderer.setSource(source);
    renderer.render(resolveRenderState(snapshot, faces));
    const rendered = renderer.snapshot();
    return options.withoutOverlays ? rendered : compositeOverlays(rendered, snapshot.overlays);
  } finally {
    renderer.dispose();
  }
}

/** Renders at preview resolution (fast) including overlays, e.g. for AI inputs and thumbnails. */
export function renderPreviewComposite(
  snapshot: EditSnapshot,
  faces: FaceLandmarks[] | null,
  withoutOverlays = false,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const renderer = new Renderer(canvas);
  try {
    renderer.setSource(snapshot.source.preview);
    renderer.render(resolveRenderState(snapshot, faces));
    const rendered = renderer.snapshot();
    return withoutOverlays ? rendered : compositeOverlays(rendered, snapshot.overlays);
  } finally {
    renderer.dispose();
  }
}

/** Export settings chosen in the Export panel. */
export interface ExportSettings {
  format: ExportFormat;
  quality: number;
  /** 'original' or a pixel value for the longest edge. */
  maxEdge: number | 'original';
}

/** Produces the final Blob for download or for the SDK host. */
export async function exportSnapshot(
  snapshot: EditSnapshot,
  faces: FaceLandmarks[] | null,
  settings: ExportSettings,
): Promise<{ blob: Blob; width: number; height: number }> {
  const canvas = renderFinal(snapshot, faces, {
    maxEdge: settings.maxEdge === 'original' ? undefined : settings.maxEdge,
  });
  const blob = await canvasToBlob(canvas, { format: settings.format, quality: settings.quality });
  return { blob, width: canvas.width, height: canvas.height };
}
