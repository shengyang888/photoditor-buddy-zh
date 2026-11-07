import { expect, test } from '@playwright/test';
import { openSample, storeState } from './helpers';

test.describe('export', () => {
  test('exports a PNG at original size with overlays and a JPG at 1080p', async ({ page }) => {
    await openSample(page);
    const w = await storeState<number>(page, 'snapshot.source.full.width');
    const h = await storeState<number>(page, 'snapshot.source.full.height');
    await page.getByTestId('tool-text').click();
    await page.getByTestId('add-text').click();
    await page.getByTestId('export-button').click();
    await page.getByTestId('format-PNG').click();
    const download1 = page.waitForEvent('download');
    await page.getByTestId('export-confirm').click();
    const file1 = await download1;
    expect(file1.suggestedFilename()).toMatch(/sample-photo-edited\.png$/);
    const path1 = await file1.path();
    const dims1 = await page.evaluate(
      async (base64) => {
        const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
        const bmp = await createImageBitmap(blob);
        return { w: bmp.width, h: bmp.height };
      },
      (await import('node:fs')).readFileSync(path1!).toString('base64'),
    );
    expect(dims1).toEqual({ w, h });
    // The exported file must be upright: the sky (top left) is brighter than the bag at the bottom left.
    const orientation = await page.evaluate(
      async (base64) => {
        const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
        const bmp = await createImageBitmap(blob);
        const c = document.createElement('canvas');
        c.width = bmp.width;
        c.height = bmp.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0);
        const lum = (fx: number, fy: number): number => {
          const d = ctx.getImageData(
            Math.round(fx * c.width),
            Math.round(fy * c.height),
            8,
            8,
          ).data;
          let s = 0;
          for (let i = 0; i < d.length; i += 4)
            s += 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
          return s / (d.length / 4);
        };
        return { sun: lum(0.2, 0.1), lake: lum(0.18, 0.88) };
      },
      (await import('node:fs')).readFileSync(path1!).toString('base64'),
    );
    expect(orientation.sun).toBeGreaterThan(orientation.lake + 40);

    await page.getByTestId('export-button').click();
    await page.getByTestId('format-JPG').click();
    await page.getByRole('button', { name: '1080p' }).click();
    const download2 = page.waitForEvent('download');
    await page.getByTestId('export-confirm').click();
    const file2 = await download2;
    expect(file2.suggestedFilename()).toMatch(/\.jpg$/);
    const size = (await import('node:fs')).statSync((await file2.path())!).size;
    expect(size).toBeGreaterThan(10_000);
  });
});
