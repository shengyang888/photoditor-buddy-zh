# Testing

## Unit tests (Vitest, jsdom)

```bash
npm test            # once
npm run test:watch  # watch mode
```

Files live next to the code as `*.test.ts`. They cover pure logic: curve maths, `.cube` parsing, the filter catalogue (ids, ranges, LUT recipes), preset stacking, undo history, collage layouts, crop and homography maths, displacement fields, colour maths, the AI key vault, request builders (mocked `fetch`), task catalogue and routing, key verification, the ZIP writer and the SDK protocol.

## Browser tests (Playwright)

```bash
npm run build        # the e2e suite serves apps/web/dist
npm run test:e2e     # desktop 1440×900, tablet 820×1180 (touch), phone 390×844 (touch)
npx playwright test --project=desktop tests/e2e/crop.spec.ts   # one file, one viewport
npx playwright show-trace test-results/<folder>/trace.zip       # inspect a failure
```

What they check, per feature, at the basic-operation level:

- `smoke.spec.ts` — Home, sample photo, no horizontal overflow, panel fits the viewport, every tool opens without console errors.
- `adjust.spec.ts` — exposure changes pixels and undo/redo restore them; every Adjust tab; HSL, curves, split toning, LUT file, Auto; filters per category with live thumbnails, strength 0 = original, duotone LUT; eight effects change pixels, blur shapes and focus tap.
- `crop.spec.ts` — presets, rotate, flip, straighten, perspective, apply and undo; dragging a handle; cancel restores the preview.
- `overlays.spec.ts` — text add/edit/font/curve/size/drag/delete; stickers, frames, watermark; layers list, reorder, delete, keyboard delete; doodle and mosaic strokes, undo, clear.
- `beauty.spec.ts` — liquify stroke changes pixels; blemish tap; mask and makeup canvases from synthetic landmarks.
- `ai.spec.ts` — missing key guidance; saving a key; a mocked Gemini response replaces the image and undo restores it; masked task routes to OpenAI with a real mask; a 429 becomes a friendly alert.
- `export.spec.ts` — PNG at original size with overlays, JPG at 1080p.
- `collage-batch.spec.ts` — grid, poster, stitch and freestyle collages; batch ZIP with two edited files.
- `sdk.spec.ts` — the demo host page mounts the editor, loads an image and receives the export.

Headless Chromium runs WebGL2 through SwiftShader (`--use-angle=swiftshader` in `playwright.config.ts`). The page exposes `window.__pb = { store, core }` when the URL contains `?e2e`.

## What is not automated

- Real face detection needs a real portrait; the beauty tests use synthetic landmarks. Open any selfie in the app to verify skin, reshape and makeup by eye.
- Real cloud calls need real keys; the suite mocks the HTTP layer and checks request shape, headers and error handling.
- On-device model downloads (25–208 MB) are not fetched in CI. `docs/ai-providers.md` lists the exact model ids.
