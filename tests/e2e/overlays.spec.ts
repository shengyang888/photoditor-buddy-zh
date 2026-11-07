import { expect, test } from '@playwright/test';
import { dragOnImage, openSample, setSlider, storeState } from './helpers';

test.describe('text, stickers, frames, doodle, mosaic, watermark, layers', () => {
  test('text layer: add, edit, style, drag, delete', async ({ page }) => {
    await openSample(page);
    await page.getByTestId('tool-text').click();
    await page.getByTestId('add-text').click();
    expect(await storeState<number>(page, 'snapshot.overlays.length')).toBe(1);
    await page.getByTestId('text-content').fill('Hello world');
    await page.getByTestId('text-content').blur();
    expect(await storeState<string>(page, 'snapshot.overlays.0.text')).toBe('Hello world');
    await page.getByRole('button', { name: 'Bebas' }).click();
    expect(await storeState<string>(page, 'snapshot.overlays.0.fontFamily')).toBe('Bebas Neue');
    await setSlider(page, 'Curve', 50);
    await setSlider(page, 'Size', 120);
    // Drag the text from the centre towards the top-left.
    await dragOnImage(page, [0.5, 0.5], [0.3, 0.3]);
    const x = await storeState<number>(page, 'snapshot.overlays.0.x');
    expect(x).toBeLessThan(0.45);
    // Overlay canvas actually has painted pixels.
    const painted = await page.evaluate(() => {
      const c = document.querySelector<HTMLCanvasElement>('[data-testid="overlay-canvas"]')!;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4 * 13) if (d[i]! > 0) n++;
      return n;
    });
    expect(painted).toBeGreaterThan(0);
    await page.getByTestId('delete-layer').click();
    expect(await storeState<number>(page, 'snapshot.overlays.length')).toBe(0);
  });

  test('stickers, frames and watermark add layers; layers panel lists and reorders them', async ({
    page,
  }) => {
    await openSample(page);
    await page.getByTestId('tool-stickers').click();
    await page.getByRole('button', { name: 'Add sticker 😀' }).click();
    await page.getByRole('button', { name: 'Hearts' }).click();
    await page.getByRole('button', { name: 'Add sticker ❤️', exact: true }).click();
    expect(await storeState<number>(page, 'snapshot.overlays.length')).toBe(2);
    await page.getByTestId('tool-frames').click();
    await page.getByTestId('frame-polaroid').click();
    expect(await storeState<string>(page, 'snapshot.overlays.2.frameId')).toBe('polaroid');
    await page.getByTestId('frame-film').click();
    expect(await storeState<string>(page, 'snapshot.overlays.2.frameId')).toBe('film');
    expect(await storeState<number>(page, 'snapshot.overlays.length')).toBe(3);
    await page.getByTestId('tool-watermark').click();
    await page.getByTestId('add-watermark').click();
    await page.getByTestId('watermark-text').fill('© me');
    await page.getByTestId('watermark-text').blur();
    await page.getByRole('button', { name: 'Tile across photo' }).click();
    expect(await storeState<boolean>(page, 'snapshot.overlays.3.tile')).toBe(true);
    await page.getByTestId('tool-layers').click();
    const items = page.getByTestId('layers-panel').locator('li');
    await expect(items).toHaveCount(4);
    await expect(items.first()).toContainText('Watermark');
    await items.nth(3).getByRole('button', { name: 'Up' }).click();
    expect(await storeState<string>(page, 'snapshot.overlays.1.type')).toBe('sticker');
    await items.first().getByRole('button', { name: 'Delete' }).click();
    await expect(items).toHaveCount(3);
    // Keyboard delete on a selected layer.
    await items.first().locator('button').first().click();
    await page.keyboard.press('Delete');
    await expect(items).toHaveCount(2);
  });

  test('doodle and mosaic strokes are recorded, undoable and clearable', async ({ page }) => {
    await openSample(page);
    await page.getByTestId('tool-doodle').click();
    await page.getByTestId('brush-neon').click();
    await dragOnImage(page, [0.2, 0.2], [0.6, 0.5]);
    await dragOnImage(page, [0.6, 0.2], [0.2, 0.5]);
    expect(await storeState<number>(page, 'snapshot.overlays.0.strokes.length')).toBe(2);
    expect(await storeState<string>(page, 'snapshot.overlays.0.strokes.0.brush')).toBe('neon');
    await page.getByTestId('doodle-undo').click();
    expect(await storeState<number>(page, 'snapshot.overlays.0.strokes.length')).toBe(1);
    await page.getByTestId('tool-mosaic').click();
    await page.getByTestId('mosaic-hex').click();
    await dragOnImage(page, [0.3, 0.6], [0.7, 0.6]);
    expect(await storeState<string>(page, 'snapshot.overlays.1.type')).toBe('mosaic');
    expect(await storeState<string>(page, 'snapshot.overlays.1.strokes.0.style')).toBe('hex');
    await page.getByRole('button', { name: 'Clear' }).click();
    expect(await storeState<number>(page, 'snapshot.overlays.1.strokes.length')).toBe(0);
    // Global undo restores the mosaic stroke.
    await page.getByTestId('undo').click();
    expect(await storeState<number>(page, 'snapshot.overlays.1.strokes.length')).toBe(1);
  });
});
