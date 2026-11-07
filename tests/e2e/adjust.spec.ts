import { expect, test } from '@playwright/test';
import { openSample, previewStats, setSlider, storeState } from './helpers';

test.describe('adjust, filters, effects', () => {
  test('exposure slider changes the picture and records undo', async ({ page }) => {
    await openSample(page);
    const before = await previewStats(page);
    await page.getByTestId('tool-adjust').click();
    await setSlider(page, 'Exposure', 60);
    const after = await previewStats(page);
    expect(after.mean).toBeGreaterThan(before.mean + 5);
    expect(await storeState<number>(page, 'snapshot.adjustments.exposure')).toBe(60);
    await expect(page.getByTestId('undo')).toBeEnabled();
    await page.getByTestId('undo').click();
    await page.waitForTimeout(200);
    expect(await storeState<number>(page, 'snapshot.adjustments.exposure')).toBe(0);
    const restored = await previewStats(page);
    expect(Math.abs(restored.mean - before.mean)).toBeLessThan(1);
    await page.getByTestId('redo').click();
    await page.waitForTimeout(150);
    expect(await storeState<number>(page, 'snapshot.adjustments.exposure')).toBe(60);
  });

  test('all adjust tabs render sliders and HSL/curves/tone/LUT work', async ({ page }) => {
    await openSample(page);
    await page.getByTestId('tool-adjust').click();
    for (const tab of ['Light', 'Colour', 'Detail', 'Effects']) {
      await page.getByRole('tab', { name: tab }).click();
      expect(await page.locator('input[type=range]').count()).toBeGreaterThan(3);
    }
    await page.getByRole('tab', { name: 'Detail' }).click();
    const before = await previewStats(page);
    await setSlider(page, 'Sharpen', 80);
    await setSlider(page, 'Dehaze', 40);
    expect((await previewStats(page)).checksum).not.toBe(before.checksum);
    await page.getByRole('tab', { name: 'HSL' }).click();
    await page.getByRole('button', { name: 'Blue' }).click();
    await setSlider(page, 'Saturation', -100);
    expect(await storeState<number>(page, 'snapshot.adjustments.hsl.blue.saturation')).toBe(-100);
    await page.getByRole('tab', { name: 'Curves' }).click();
    await page.getByRole('button', { name: 'S-curve' }).click();
    expect(await storeState<number>(page, 'snapshot.adjustments.curves.rgb.length')).toBe(4);
    await page.getByRole('tab', { name: 'Tone' }).click();
    await setSlider(page, 'Highlight strength', 50);
    expect(
      await storeState<number>(page, 'snapshot.adjustments.splitToning.highlightSaturation'),
    ).toBe(50);
    await page.getByRole('tab', { name: 'LUT' }).click();
    const cube =
      'TITLE "invert"\nLUT_3D_SIZE 2\n1 1 1\n0 1 1\n1 0 1\n0 0 1\n1 1 0\n0 1 0\n1 0 0\n0 0 0\n';
    const mid = await previewStats(page);
    await page
      .getByTestId('lut-file')
      .setInputFiles({ name: 'invert.cube', mimeType: 'text/plain', buffer: Buffer.from(cube) });
    await expect(page.getByText('Loaded: invert')).toBeVisible();
    await page.waitForTimeout(200);
    const inverted = await previewStats(page);
    expect(inverted.checksum).not.toBe(mid.checksum);
    await page.getByTestId('auto-enhance').click();
    expect(await storeState<number>(page, 'snapshot.adjustments.vibrance')).toBeGreaterThan(0);
  });

  test('filters: every category renders thumbnails, applying one changes pixels, strength works', async ({
    page,
  }) => {
    await openSample(page);
    await page.getByTestId('tool-filters').click();
    await expect(page.getByTestId('filters-panel')).toBeVisible();
    const categories = await page.locator('[data-testid^="filter-category-"]').count();
    expect(categories).toBeGreaterThanOrEqual(15);
    const before = await previewStats(page);
    await page.getByTestId('filter-category-Film').click();
    await page.getByTestId('filter-film-portra-400').click();
    await page.waitForTimeout(200);
    const after = await previewStats(page);
    expect(after.checksum).not.toBe(before.checksum);
    expect(await storeState<string>(page, 'snapshot.filter.id')).toBe('film-portra-400');
    await setSlider(page, 'Strength', 0);
    const weak = await previewStats(page);
    expect(Math.abs(weak.mean - before.mean)).toBeLessThan(1.5);
    // Duotone uses a generated LUT.
    await page.getByTestId('filter-category-Duotone').click();
    await page.getByTestId('filter-duotone-midnight-blue').click();
    await page.waitForTimeout(200);
    expect((await previewStats(page)).checksum).not.toBe(before.checksum);
    // Remove filter.
    await page.getByRole('button', { name: 'Remove' }).click();
    expect(await storeState<unknown>(page, 'snapshot.filter')).toBeNull();
    // Filter thumbnails are drawn (not blank).
    const thumbFilled = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>(
        '[data-testid="filter-duotone-midnight-blue"] canvas',
      )!;
      const ctx = c.getContext('2d')!;
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 400) sum += d[i]! + d[i + 1]! + d[i + 2]!;
      return sum;
    });
    expect(thumbFilled).toBeGreaterThan(0);
  });

  test('effects: several effects change the image; blur shapes and centre tap work', async ({
    page,
  }) => {
    await openSample(page);
    await page.getByTestId('tool-effects').click();
    const base = await previewStats(page);
    for (const effect of [
      'pixelate',
      'glitch',
      'halftone',
      'sketch',
      'kaleidoscope',
      'oilPaint',
      'invert',
    ]) {
      await page.getByTestId(`effect-${effect}`).click();
      // Rendering is coalesced to animation frames, so poll instead of sleeping.
      await expect
        .poll(async () => (await previewStats(page)).checksum, { message: effect, timeout: 10000 })
        .not.toBe(base.checksum);
      expect(await storeState<string>(page, 'snapshot.effect.id')).toBe(effect);
    }
    await page.getByTestId('effect-blur').click();
    await page.getByRole('button', { name: 'Circle focus' }).click();
    const box = (await page.getByTestId('interaction-layer').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25);
    await page.waitForTimeout(100);
    const cx = await storeState<number>(page, 'snapshot.effect.centerX');
    expect(cx).toBeGreaterThan(0);
    expect(cx).toBeLessThan(0.5);
    await page.getByRole('button', { name: 'Remove' }).click();
    expect(await storeState<unknown>(page, 'snapshot.effect')).toBeNull();
  });
});
