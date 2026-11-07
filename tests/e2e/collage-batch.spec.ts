import { expect, test } from '@playwright/test';
import { makeImageFile, storeState } from './helpers';

test.describe('collage and batch', () => {
  test('collage: add photos, choose layouts, stitch, continue in editor', async ({ page }) => {
    await page.goto('/?e2e');
    const files = [
      await makeImageFile(page, 'a.png', 800, 600, '#ff8800'),
      await makeImageFile(page, 'b.png', 600, 800, '#0088ff'),
      await makeImageFile(page, 'c.png', 700, 700, '#22aa44'),
    ];
    await page.getByTestId('open-collage').click();
    await expect(page.getByTestId('collage')).toBeVisible();
    await page.getByTestId('collage-files').setInputFiles(files);
    await expect(page.getByTestId('collage-preview')).toBeVisible();
    await page.getByRole('button', { name: '一大两小' }).click();
    await page.getByTestId('collage-mode-poster').click();
    await expect(page.getByTestId('collage-preview')).toBeVisible();
    await page.getByTestId('collage-mode-stitch').click();
    await page.getByRole('button', { name: '横向' }).click();
    await page.getByTestId('collage-finish').click();
    await expect(page.getByTestId('editor')).toBeVisible();
    const w = await storeState<number>(page, 'snapshot.source.full.width');
    const h = await storeState<number>(page, 'snapshot.source.full.height');
    expect(w).toBe(2400);
    expect(w / h).toBeGreaterThan(2.5); // three photos side by side
  });

  test('collage freestyle opens a canvas with image stickers', async ({ page }) => {
    await page.goto('/?e2e');
    await page.getByTestId('open-collage').click();
    await page
      .getByTestId('collage-files')
      .setInputFiles([
        await makeImageFile(page, 'a.png', 400, 300, '#ff8800'),
        await makeImageFile(page, 'b.png', 300, 400, '#0088ff'),
      ]);
    await page.getByTestId('collage-mode-freestyle').click();
    await page.getByTestId('collage-finish').click();
    await expect(page.getByTestId('editor')).toBeVisible();
    expect(await storeState<number>(page, 'snapshot.overlays.length')).toBe(2);
    expect(await storeState<string>(page, 'snapshot.overlays.0.kind')).toBe('image');
  });

  test('batch: applies a filter to several photos and downloads a ZIP', async ({ page }) => {
    await page.goto('/?e2e');
    await page.getByTestId('open-batch').click();
    await page
      .getByTestId('batch-files')
      .setInputFiles([
        await makeImageFile(page, 'one.png', 500, 400, '#ff8800'),
        await makeImageFile(page, 'two.png', 400, 500, '#0088ff'),
      ]);
    await page.getByRole('button', { name: '波特拉 400' }).click();
    const download = page.waitForEvent('download');
    await page.getByTestId('batch-run').click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/batch-2\.zip$/);
    const bytes = (await import('node:fs')).readFileSync((await file.path())!);
    expect(bytes.readUInt32LE(0)).toBe(0x04034b50);
    expect(bytes.includes(Buffer.from('one-edited.jpg'))).toBe(true);
    expect(bytes.includes(Buffer.from('two-edited.jpg'))).toBe(true);
  });
});
