import { expect, type Page } from '@playwright/test';

/** Opens the app with test hooks enabled and loads the built-in sample photo. */
export async function openSample(page: Page): Promise<void> {
  await page.goto('/?e2e');
  await page.getByTestId('open-sample').click();
  await expect(page.getByTestId('editor')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('preview-canvas')).toBeVisible();
  // Give the first WebGL frame time to render.
  await page.waitForTimeout(300);
}

/** Mean luminance (0..255) and a coarse checksum of the preview canvas. */
export async function previewStats(
  page: Page,
): Promise<{ mean: number; checksum: number; width: number; height: number }> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="preview-canvas"]')!;
    const scratch = document.createElement('canvas');
    scratch.width = canvas.width;
    scratch.height = canvas.height;
    const ctx = scratch.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0);
    const { data } = ctx.getImageData(0, 0, scratch.width, scratch.height);
    let sum = 0;
    let checksum = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4 * 97) {
      const l = 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
      sum += l;
      checksum = (checksum + data[i]! * 3 + data[i + 1]! * 5 + data[i + 2]! * 7) % 1_000_003;
      n++;
    }
    return { mean: sum / n, checksum, width: canvas.width, height: canvas.height };
  });
}

/** Mean luminance of a small square around (fx, fy) (fractions of the canvas) on any canvas element. */
export async function regionLuminance(
  page: Page,
  testId: string,
  fx: number,
  fy: number,
): Promise<number> {
  return page.evaluate(
    ({ testId, fx, fy }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(`[data-testid="${testId}"]`)!;
      const scratch = document.createElement('canvas');
      scratch.width = canvas.width;
      scratch.height = canvas.height;
      const ctx = scratch.getContext('2d')!;
      ctx.drawImage(canvas, 0, 0);
      const size = Math.max(4, Math.round(canvas.width * 0.03));
      const { data } = ctx.getImageData(
        Math.round(fx * canvas.width) - size / 2,
        Math.round(fy * canvas.height) - size / 2,
        size,
        size,
      );
      let sum = 0;
      for (let i = 0; i < data.length; i += 4)
        sum += 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
      return sum / (data.length / 4);
    },
    { testId, fx, fy },
  );
}

/** Reads a slice of the editor store state. */
export async function storeState<T>(page: Page, pick: string): Promise<T> {
  return page.evaluate((expression) => {
    const store = (window as unknown as { __pb: { store: { getState: () => unknown } } }).__pb
      .store;
    const state = store.getState() as Record<string, unknown>;
    // Simple dotted path resolver to keep tests readable, e.g. "snapshot.overlays.length".
    return expression
      .split('.')
      .reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], state);
  }, pick) as Promise<T>;
}

/** Creates an in-memory PNG file (solid colour with a diagonal line) for upload tests. */
export async function makeImageFile(
  page: Page,
  name: string,
  width: number,
  height: number,
  color: string,
): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const dataUrl = await page.evaluate(
    ({ width, height, color }) => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, height);
      ctx.stroke();
      return c.toDataURL('image/png');
    },
    { width, height, color },
  );
  return { name, mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1]!, 'base64') };
}

/** Sets a range slider's value and commits it (pointerup) so an undo step is recorded. */
export async function setSlider(page: Page, label: string, value: number): Promise<void> {
  const slider = page.getByLabel(label, { exact: true });
  await slider.fill(String(value));
  await slider.dispatchEvent('pointerup');
  await page.waitForTimeout(120);
}

/** Drags on the interaction layer from (x1,y1) to (x2,y2) in fractions of the viewport box. */
export async function dragOnImage(
  page: Page,
  from: [number, number],
  to: [number, number],
  steps = 8,
): Promise<void> {
  const box = (await page.getByTestId('interaction-layer').boundingBox())!;
  const x1 = box.x + box.width * from[0];
  const y1 = box.y + box.height * from[1];
  const x2 = box.x + box.width * to[0];
  const y2 = box.y + box.height * to[1];
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++)
    await page.mouse.move(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps);
  await page.mouse.up();
  await page.waitForTimeout(120);
}

/** Collects console errors (ignoring known-benign noise) for assertions at the end of a test. */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (
      msg.type() === 'error' &&
      !/favicon|fonts\.googleapis|net::ERR_|^INFO:|GL Driver/.test(msg.text())
    )
      errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}
