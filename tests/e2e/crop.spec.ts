import { expect, test } from '@playwright/test';
import { openSample, setSlider, storeState } from './helpers';

test.describe('crop and geometry', () => {
  test('aspect presets, rotate, flip, straighten, perspective and apply', async ({ page }) => {
    await openSample(page);
    const w = await storeState<number>(page, 'snapshot.source.full.width');
    const h = await storeState<number>(page, 'snapshot.source.full.height');
    await page.getByTestId('tool-crop').click();
    await expect(page.getByTestId('crop-overlay')).toBeVisible();
    await page.getByTestId('aspect-1:1').click();
    await page.getByTestId('rotate-90').click();
    await page.getByTestId('flip-h').click();
    await page.waitForTimeout(150);
    await setSlider(page, 'Straighten', 5);
    await setSlider(page, 'Vertical', 30);
    await page.waitForTimeout(400);
    await page.getByTestId('crop-apply').click();
    await expect(page.getByTestId('crop-overlay')).toBeHidden();
    const nw = await storeState<number>(page, 'snapshot.source.full.width');
    const nh = await storeState<number>(page, 'snapshot.source.full.height');
    expect(nw).toBe(nh); // square crop
    expect(nw).toBeLessThanOrEqual(Math.min(w, h) + 2);
    // Undo brings the original dimensions back.
    await page.getByTestId('undo').click();
    await page.waitForTimeout(200);
    expect(await storeState<number>(page, 'snapshot.source.full.width')).toBe(w);
  });

  test('dragging a corner handle resizes the crop; cancel restores', async ({ page }) => {
    await openSample(page);
    await page.getByTestId('tool-crop').click();
    const handle = page.getByTestId('crop-handle-se');
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 40, box.y - 30, { steps: 8 });
    await page.mouse.move(box.x - 80, box.y - 60, { steps: 8 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(150);
    const previewW = await storeState<number>(page, 'snapshot.source.preview.width');
    const cropW = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-testid="crop-overlay"] > div.border')!;
      return el.getBoundingClientRect().width;
    });
    const viewportW = (await page.getByTestId('preview-canvas').boundingBox())!.width;
    expect(cropW / viewportW).toBeLessThan(0.98);
    await page.getByTestId('crop-cancel').click();
    expect(await storeState<number>(page, 'snapshot.source.preview.width')).toBe(previewW);
    await expect(page.getByTestId('crop-overlay')).toBeHidden();
  });
});
