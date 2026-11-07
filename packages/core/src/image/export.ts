/** Output formats offered in the Export panel. */
export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

/** Options for `canvasToBlob`. `quality` only applies to lossy formats (0..1). */
export interface ExportOptions {
  format: ExportFormat;
  quality?: number;
}

/** Encodes a canvas into a Blob. Rejects with a readable error when encoding fails. */
export function canvasToBlob(canvas: HTMLCanvasElement, options: ExportOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('The browser could not encode the image.')),
      options.format,
      options.quality ?? 0.92,
    );
  });
}

/** Maps a MIME type to a file extension for download names. */
export function extensionFor(format: ExportFormat): string {
  return format === 'image/png' ? 'png' : format === 'image/jpeg' ? 'jpg' : 'webp';
}

/**
 * Builds a download file name from the original name, e.g. `holiday.jpg` → `holiday-edited.png`.
 * Strips characters that are unsafe in file names.
 */
export function exportFileName(
  originalName: string,
  format: ExportFormat,
  suffix = 'edited',
): string {
  const base = originalName.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '_') || 'photo';
  return `${base}-${suffix}.${extensionFor(format)}`;
}

/** Triggers a browser download for a Blob. The object URL is revoked shortly afterwards. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Reads a Blob as a data URL (used by the SDK to hand results back to the host page). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image data.'));
    reader.readAsDataURL(blob);
  });
}
