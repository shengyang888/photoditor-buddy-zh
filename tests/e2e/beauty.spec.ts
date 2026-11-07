import { expect, test } from '@playwright/test';
import { dragOnImage, openSample, previewStats, setSlider, storeState } from './helpers';

test.describe('beauty', () => {
  test('detects the face in the sample photo; skin smoothing and lipstick change pixels', async ({
    page,
  }) => {
    await openSample(page);
    await page.getByTestId('tool-beauty').click();
    await expect(page.getByText(/face found/)).toBeVisible({ timeout: 90000 });
    const before = await previewStats(page);
    await setSlider(page, 'Smooth skin', 90);
    await setSlider(page, 'Brighten skin', 60);
    // Rendering is coalesced to animation frames and masks take a moment to build, so poll.
    const checksum = async (): Promise<number> => (await previewStats(page)).checksum;
    await expect.poll(checksum, { timeout: 10000 }).not.toBe(before.checksum);
    const smoothed = await previewStats(page);
    await page.getByRole('tab', { name: 'Makeup' }).click();
    await page.getByRole('button', { name: 'Colour #e53935' }).click();
    await expect.poll(checksum, { timeout: 10000 }).not.toBe(smoothed.checksum);
    const withLipstick = await previewStats(page);
    expect(
      await storeState<number>(page, 'snapshot.portrait.makeup.lipstick.opacity'),
    ).toBeGreaterThan(0);
    await page.getByRole('tab', { name: 'Reshape' }).click();
    await setSlider(page, 'Eye size', 60);
    await expect.poll(checksum, { timeout: 10000 }).not.toBe(withLipstick.checksum);
  });

  test('liquify and blemish work; masks and makeup build from synthetic landmarks', async ({
    page,
  }) => {
    await openSample(page);
    await page.getByTestId('tool-beauty').click();
    await expect(page.getByTestId('beauty-panel')).toBeVisible();
    await page.getByRole('tab', { name: 'Liquify' }).click();
    await page.getByRole('button', { name: 'Bulge' }).click();
    const before = await previewStats(page);
    await dragOnImage(page, [0.3, 0.6], [0.32, 0.62], 3);
    expect(await storeState<number>(page, 'snapshot.portrait.liquify.length')).toBe(1);
    expect(await storeState<string>(page, 'snapshot.portrait.liquify.0.mode')).toBe('bulge');
    await page.waitForTimeout(200);
    const after = await previewStats(page);
    expect(after.checksum).not.toBe(before.checksum);
    await page.getByRole('button', { name: 'Undo stroke' }).click();
    expect(await storeState<number>(page, 'snapshot.portrait.liquify.length')).toBe(0);

    await page.getByRole('tab', { name: 'Blemish' }).click();
    const box = (await page.getByTestId('interaction-layer').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.62);
    expect(await storeState<number>(page, 'snapshot.portrait.blemishSpots.length')).toBe(1);
    await page.getByRole('button', { name: 'Undo spot' }).click();
    expect(await storeState<number>(page, 'snapshot.portrait.blemishSpots.length')).toBe(0);

    // Face-dependent artefacts with synthetic landmarks (no detector needed).
    const result = await page.evaluate(() => {
      type Face = { points: { x: number; y: number; z: number }[] };
      type Makeup = Record<string, { color: string; opacity: number }>;
      type CoreApi = {
        buildPortraitMask: (
          faces: Face[],
          w: number,
          h: number,
          spots: { x: number; y: number; radius: number }[],
        ) => ImageData;
        buildMakeupOverlay: (
          faces: Face[],
          w: number,
          h: number,
          makeup: Makeup,
        ) => ImageData | null;
        defaultPortraitSettings: () => { makeup: Makeup };
      };
      const core = (window as unknown as { __pb: { core: CoreApi } }).__pb.core;
      const points = Array.from({ length: 478 }, (_, i) => {
        const a = (i / 478) * Math.PI * 2;
        return { x: 0.5 + Math.cos(a) * 0.12, y: 0.5 + Math.sin(a) * 0.16, z: 0 };
      });
      const face = { points };
      const mask = core.buildPortraitMask([face], 300, 300, [{ x: 0.5, y: 0.5, radius: 0.05 }]);
      const md = mask.data;
      let red = 0,
        alpha = 0;
      for (let i = 0; i < md.length; i += 4) {
        if (md[i]! > 0) red++;
        if (md[i + 3]! > 0) alpha++;
      }
      const makeup = core.buildMakeupOverlay([face], 300, 300, {
        ...core.defaultPortraitSettings().makeup,
        lipstick: { color: '#ff0000', opacity: 80 },
        blush: { color: '#ff88aa', opacity: 60 },
      });
      const mk = makeup ? makeup.data : new Uint8ClampedArray();
      let painted = 0;
      for (let i = 3; i < mk.length; i += 4) if (mk[i]! > 0) painted++;
      const none = core.buildMakeupOverlay([face], 300, 300, core.defaultPortraitSettings().makeup);
      return { red, alpha, painted, none: none === null };
    });
    expect(result.red).toBeGreaterThan(100);
    expect(result.alpha).toBeGreaterThan(10);
    expect(result.painted).toBeGreaterThan(10);
    expect(result.none).toBe(true);
  });
});
