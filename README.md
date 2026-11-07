# photoditor-buddy

**The free, open-source photo editor with everything inside: 200+ filters, pro adjustments, beauty retouch, text, stickers, collage, batch, and smart AI edits.**
AI runs on your own Gemini or OpenAI key, the cheapest option there is: cents per image, no subscription, no account. Runs in any browser on desktop and mobile, and embeds in any website with one script tag.

![photoditor-buddy on desktop](docs/images/editor-desktop.png)

| Beauty (on-device face detection)        | Phone                                     | Tablet                                           |
| ---------------------------------------- | ----------------------------------------- | ------------------------------------------------ |
| ![beauty](docs/images/editor-beauty.png) | ![phone](docs/images/editor-phone-ai.png) | ![tablet](docs/images/editor-tablet-filters.png) |

## What you get

Every feature below is included and tested. ✨ marks tools that call an AI model with **your own** key (a few cents per image, paid to Google or OpenAI). 🧠 marks free AI models that download once and run **on your device**. Everything else is classic editing that runs instantly, offline.

### Adjust — 22 sliders, curves, HSL, LUTs

| Feature                             | What it does                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Exposure, Brightness, Contrast      | Overall light level, midtone lift and punch.                                                                 |
| Highlights, Shadows, Whites, Blacks | Recover a blown sky, open up dark faces, set the black and white points.                                     |
| Temperature, Tint                   | Fix orange indoor light or blue shade; green–magenta balance.                                                |
| Saturation, Vibrance, Hue shift     | Vibrance boosts dull colours more than vivid ones and protects skin.                                         |
| Sharpen, Clarity, Structure         | Crisper edges, midtone punch, fine texture.                                                                  |
| Dehaze, Denoise                     | Cut through haze and fog; smooth grainy night shots while keeping edges.                                     |
| Grain, Fade, Vignette               | Film grain with size control, matte faded blacks, dark or light corners with feather.                        |
| HSL (8 colour bands)                | Change only the blues of the sky or only the greens of the grass: hue, saturation and luminance per band.    |
| Curves                              | RGB master and per-channel curves; drag points, tap to add, double-tap to remove; S-curve and Matte presets. |
| Split toning                        | Warm highlights, cool shadows, with a balance slider.                                                        |
| Colour balance                      | Red / green / blue offsets for shadows, midtones and highlights.                                             |
| LUT                                 | Load any 3D `.cube` look (from Lightroom, Resolve or LUT packs) with a strength slider.                      |
| Auto                                | One-tap enhancement.                                                                                         |
| Compare                             | Hold the eye button to see the untouched original.                                                           |

Every slider previews live, resets with a double-tap and records one undo step.

### Filters — 213 looks in 21 categories

Film (Portra, Ektar, Velvia, Cinestill…), Vintage, Black & White (with colour-filter simulations), Japanese, Korean, Cinematic (teal & orange, noir, sci-fi…), Sunset, Pearl, Portrait, Food, Landscape, Street, Neon, Pastel, Mood, Cross Process, Duotone, Seasons, Travel, Retro Digital (CCD, Y2K, camcorder) and Minimal.

Thumbnails are rendered from **your** photo, so you see the real result before tapping. Every filter has a strength slider and stacks on top of your own adjustments instead of replacing them.

### Crop & geometry

| Feature                | What it does                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Free crop with handles | Drag any edge or corner; rule-of-thirds grid.                                                         |
| 17 aspect presets      | 1:1, 4:5, 3:4, 16:9, 9:16 Story, Facebook cover, A4, and ID-photo sizes (35×45 mm, 2×2 in, 33×48 mm). |
| Rotate, Flip           | 90° turns, horizontal and vertical mirror.                                                            |
| Straighten             | −45° to +45° with automatic zoom so no empty corners appear.                                          |
| Perspective            | Vertical and horizontal keystone correction for leaning buildings and skewed documents.               |

### Effects — 24 creative looks

Blur / Bokeh (whole photo, circle focus or tilt-shift band, tap to set the focus point), Bloom, Soft Glow, Edge Blur, Pixelate, RGB Split, Chromatic, Glitch, VHS, Halftone, Dot Screen, Cross Hatch, Sketch, Emboss, Oil Paint, Posterize, Solarize, Threshold, Invert, Kaleidoscope, Mirror, Swirl, Fisheye and Frosted Glass, each with sliders.

### Beauty 🧠 — portrait retouching on your device

The face is located with 478 landmarks by MediaPipe, entirely in your browser. Up to five faces at once.

| Tab     | What it does                                                                                              |
| ------- | --------------------------------------------------------------------------------------------------------- |
| Skin    | Smooth skin (keeps real texture), brighten skin, whiten teeth, brighten eyes.                             |
| Reshape | Face slim, jaw, chin, small head, forehead, nose width, eye size, eye distance, eye lift, mouth size.     |
| Makeup  | Lipstick, blush, eyebrows, eyeshadow, coloured contact lenses, eyeliner, each with swatches and strength. |
| Liquify | Push, bulge, pinch and restore brushes with size and strength: reshape anything, bodies included.         |
| Blemish | Tap a spot to smooth it away; undo spot by spot.                                                          |

Liquify and Blemish also work on photos without a face.

### AI tools ✨ — 26 cloud tools with your own key

| Category         | Tools and what they do                                                                                                                                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fix              | **HD Enhance** re-renders at 2K with cleaner detail · **Restore old photo** removes scratches, creases and fading · **Colorize** black-and-white photos · **Fix lighting** rescues under/over-exposed shots · **Deblur** sharpens motion blur.                                      |
| Remove & Replace | **AI Remove** people, objects, wires (describe or paint over them) · **AI Replace** "swap the mug for a plant" · **Change background** to anything you type · **AI Expand** extends the photo beyond its edges in 6 aspect ratios · **Remove text** erases captions and watermarks. |
| Portrait         | **AI Retouch** natural skin, eye bags, stray hairs · **Hairstyle** and hair colour · **Outfit** (suit, dress, uniform) · **ID photo** with white/blue/red/grey background · **AI Makeup** in 5 looks · **Expression**: add a smile, open closed eyes.                               |
| Style            | **Art styles**: anime, Ghibli, oil, watercolour, sketch, 3D cartoon, comic, pixel art, pop art, cyberpunk, clay, toy bricks · **AI Avatar** in 6 looks · **Match a look** from a description.                                                                                       |
| Scene            | **Sky replace** (blue, sunset, starry night, storm, pink dusk, clouds) · **Relight** (golden hour, studio, flash, window, neon, dramatic) · **Season / weather** (snow, autumn, blossom, rain, fog, night) · **Product shot** on a clean studio background.                         |
| Create           | **Custom instruction**: type anything · **Poster** with your headline · **Die-cut sticker** of the subject.                                                                                                                                                                         |

Paint a mask to target exactly the area to change. With an OpenAI key the mask is sent as a real mask; with Gemini the marked region is described in the prompt. Every result is one Undo away from the previous version.

### On-device AI 🧠 — free, no key

| Tool              | What it does                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Remove background | Cuts out people (MODNet) or any object (BiRefNet) with a transparent PNG result; great for stickers and product photos. |
| Upscale 2×        | Doubles the resolution with Swin2SR while sharpening detail.                                                            |
| Eraser (offline)  | Paint over an object and LaMa fills the gap without any cloud call.                                                     |

### Text, stickers, frames, doodle, mosaic, watermark, layers

| Tool      | What it does                                                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text      | Unlimited text layers, 15 fonts, bold/italic, alignment, colour, background pill, outline, letter spacing, line height, curved text, drop shadow; drag, pinch to resize and rotate. |
| Stickers  | 196 emoji stickers in 10 packs (faces, hearts, animals, food, nature, party, travel, symbols, hands, kaomoji) plus your own PNGs; flip, size, rotation, opacity.                    |
| Frames    | 12 styles: thin, thick, double, rounded, polaroid, film strip, inner shadow, glow, dashed, torn paper, stamp, gradient; colour and thickness.                                       |
| Doodle    | Pen, marker, neon, dashed and eraser brushes, 16 swatches plus custom colour, size and opacity, undo per stroke.                                                                    |
| Mosaic    | Pixel, blur, hexagon and crystal styles to hide faces, plates and private details; baked into the pixels on export so it cannot be undone by others.                                |
| Watermark | Your name or brand in any of 9 positions or tiled diagonally; font, colour, size, opacity, margin.                                                                                  |
| Layers    | List, reorder, lock, hide, change opacity or delete any overlay; Delete key removes the selected one.                                                                               |

### Collage and batch

| Tool           | What it does                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Grid collage   | 20 layouts for 1–9 photos with gap, corner radius and background colour; tap any slot to replace the photo. |
| Poster collage | 4 poster layouts with soft shadows.                                                                         |
| Stitch         | Joins screenshots or photos into one long vertical or horizontal image without cropping.                    |
| Freestyle      | Photos become movable, rotatable stickers on a coloured canvas.                                             |
| Batch          | Applies the look from your last edit (or any filter) to many photos at once and downloads a ZIP.            |

Every collage opens in the editor, so filters, text and all other tools work on it.

### Export and everyday comfort

PNG / JPG / WebP with quality slider; original, 4K, 2K, 1080p or 720p size; custom file name; full-resolution rendering with every overlay. Undo / redo (40 steps, `Ctrl/Cmd + Z`), hold-to-compare, reset all, pinch-zoom and pan, keyboard shortcuts, and a layout that switches between desktop side panels and a phone bottom sheet.

### Settings and privacy

Gemini and OpenAI keys with a free "Test & save" check, model choice with price hints, upload size for cloud calls, on-device model choice, and a one-tap "remove all keys". Photos never leave the device unless you press Generate in a ✨ tool.

### Embed anywhere (SDK)

One `<script>` tag or one npm import puts the whole editor into any website in an iframe. The host page can open an image, hide tools, set the accent colour, rename the Done button and receive the edited image back.

The same list in checklist form is in [docs/FEATURES.md](docs/FEATURES.md).

## Try it in 5 minutes (no coding experience needed)

You need a computer with **Node.js**. Node.js is a free program that runs JavaScript outside a browser; the editor's build tools use it.

1. **Install Node.js 24 LTS.**
   Go to <https://nodejs.org>, download the "LTS" version, run the installer with the default options.
   To check it worked, open a terminal (macOS: _Terminal_ app; Windows: _PowerShell_) and type:

   ```bash
   node -v
   ```

   You should see `v24.x.x` (v22.12 or newer also works).

2. **Get the code.**
   Either click the green **Code → Download ZIP** button on GitHub and unzip it, or run:

   ```bash
   git clone https://github.com/alwaysnelson/photoditor-buddy.git
   cd photoditor-buddy
   ```

3. **Install the dependencies** (downloads the libraries the project uses; takes about a minute):

   ```bash
   npm install
   ```

4. **Start the app:**

   ```bash
   npm run dev
   ```

   The terminal prints a link such as `http://localhost:5173`. Open it in Chrome, Edge, Safari or Firefox.

5. **Edit a photo.** Click **Try a sample photo** or **Open a photo**, pick a tool at the bottom (phone) or left (desktop), and press **Export** when you are done. The result downloads to your computer.

To stop the app press `Ctrl + C` in the terminal.

### Using it on your phone

Run `npm run dev -- --host` on your computer, then open the "Network" link the terminal prints (something like `http://192.168.1.20:5173`) on a phone connected to the same Wi-Fi.

## AI features: bring your own key

Cloud AI tools send the photo to Google or OpenAI **from your browser, with your key**. Nothing goes through this project's authors. Keys are stored only in your browser (Settings → AI keys → "Remove all keys" deletes them).

### Google Gemini (recommended, cheapest per edit)

1. Open <https://aistudio.google.com/apikey> and sign in with a Google account.
2. Click **Create API key**, choose or create a Google Cloud project, and copy the key (it starts with `AIza`).
3. Image generation has **no free tier**: in Google AI Studio open the project's billing settings and add a payment method. Google charges per image, see the table below.
4. In the editor open **Settings → AI keys**, paste the key, press **Test & save**.

### OpenAI (best for painted masks)

1. Open <https://platform.openai.com/api-keys> and sign in.
2. Click **Create new secret key**, copy it (starts with `sk-`). You cannot view it again later.
3. Under **Billing** add a payment method.
4. In the editor open **Settings → AI keys**, paste the key, press **Test & save**.

### What it costs (September 2026, per generated image, paid to the provider)

| Model                            | Typical price                           | Good for             |
| -------------------------------- | --------------------------------------- | -------------------- |
| Gemini 3.1 Flash Image (default) | ≈ $0.07 at 1K, $0.10 at 2K, $0.15 at 4K | almost everything    |
| Gemini 3.1 Flash Lite Image      | ≈ $0.03 (1K only)                       | cheapest experiments |
| Gemini 3 Pro Image               | ≈ $0.13                                 | highest quality      |
| OpenAI GPT Image 2.5 Sunburst    | ≈ $0.02 at medium quality               | exact masked edits   |

Prices change; check the providers' pricing pages. The editor shows the model and price hint next to every AI tool.

### Free on-device AI

Beauty (face detection), background removal, 2× upscale and the offline eraser use open models that download **once** from Google / Hugging Face and are cached in the browser:

| Feature                       | Model & licence                       | Download | Notes                                                                                 |
| ----------------------------- | ------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| Face detection                | MediaPipe Face Landmarker, Apache-2.0 | ~3 MB    | instant on phones                                                                     |
| Background removal (people)   | MODNet, Apache-2.0                    | ~25 MB   | default                                                                               |
| Background removal (anything) | BiRefNet-lite, MIT                    | larger   | Settings → Models                                                                     |
| Upscale 2×                    | Swin2SR, Apache-2.0                   | ~150 MB  | about a minute with WebGPU; up to 10 minutes on CPU-only browsers for a 1600 px photo |
| Eraser                        | LaMa (Carve ONNX export), Apache-2.0  | ~208 MB  | about a minute per erase on CPU; desktop recommended                                  |

They need an internet connection the first time only. Chrome/Edge with WebGPU are fastest; other browsers fall back to WebAssembly.

## Using the editor

- **Adjust**: drag sliders; double-tap a slider to reset it; **Auto** for a one-tap fix.
- **Filters**: tap a category, tap a thumbnail, then set **Strength**.
- **Crop**: pick a ratio, rotate/flip/straighten, drag the handles, press **Apply**.
- **Beauty**: wait for "face found"; Liquify and Blemish work without a face.
- **AI**: pick a tool, type what you want (if asked), optionally paint over the area, press **Generate**. Undo brings the previous version back.
- **Text / Stickers**: tap Add, drag on the photo, pinch to resize and rotate (or use the sliders).
- **Compare**: hold the eye icon. **Undo / Redo**: arrows or `Ctrl/Cmd + Z`.
- **Export**: choose format, size and name. PNG keeps transparency (after background removal).

## Embedding in your own website (SDK)

### One script tag

```html
<div id="editor" style="height: 640px"></div>
<script src="https://cdn.jsdelivr.net/npm/@photoditor-buddy/sdk/dist/photoditor-buddy-sdk.iife.js"></script>
<script>
  const editor = PhotoditorBuddy.mount({
    container: '#editor',
    editorUrl: 'https://alwaysnelson.github.io/photoditor-buddy/embed.html', // or your own deployment
    image: 'https://example.com/photo.jpg', // optional
    returnResult: true, // send the result to this page instead of downloading
    doneLabel: 'Save to profile',
    onExport: ({ blob, dataUrl, fileName }) => {
      // upload `blob` to your server, or show `dataUrl`
    },
  });
</script>
```

### npm

```bash
npm install @photoditor-buddy/sdk
```

```ts
import { mountPhotoditorBuddy } from '@photoditor-buddy/sdk';
const editor = mountPhotoditorBuddy({
  container: '#editor',
  editorUrl: '/photoditor-buddy/embed.html',
  returnResult: true,
  onExport: (r) => save(r.blob),
});
editor.loadImage(url); // open another image later
editor.requestExport(); // same as pressing Done
editor.destroy();
```

### React

```tsx
import { PhotoEditor } from '@photoditor-buddy/ui';
<div style={{ height: '100vh' }}>
  <PhotoEditor />
</div>;
```

Options, events and the message protocol are documented in [docs/sdk.md](docs/sdk.md). A live demo page is included: run `npm run dev` and open `http://localhost:5173/sdk-demo.html`.

## Building and publishing

```bash
npm run build      # apps/web/dist (app + embed page + SDK demo) and packages/sdk/dist
npm run preview    # serve the production build locally
```

`apps/web/dist` is a plain static folder: upload it to GitHub Pages, Netlify, Vercel, S3 or any web host. GitHub Actions are included: `.github/workflows/ci.yml` runs the checks and tests on every push, and `.github/workflows/pages.yml` publishes the demo to GitHub Pages (enable **Settings → Pages → Source: GitHub Actions** once in your repository).

The optional relay server for providers that forbid browser calls (fal.ai, Replicate) is in [server/proxy](server/proxy/README.md). Gemini and OpenAI do not need it.

## Scripts

| Command             | What it does                                                      |
| ------------------- | ----------------------------------------------------------------- |
| `npm run dev`       | Start the app with live reload                                    |
| `npm run build`     | Production build of the app and the SDK                           |
| `npm run preview`   | Serve the production build                                        |
| `npm run typecheck` | TypeScript check of every package                                 |
| `npm run lint`      | ESLint                                                            |
| `npm run format`    | Prettier (write)                                                  |
| `npm test`          | Unit tests (Vitest)                                               |
| `npm run test:e2e`  | Browser tests on desktop, tablet and phone viewports (Playwright) |
| `npm run check`     | typecheck + lint + unit tests + build                             |
| `npm run proxy`     | Optional relay server                                             |

## Project layout

```
packages/core   rendering engine: WebGL2 pipeline, filters, LUTs, geometry, overlays, collage, portrait maths
packages/ai     AI providers (Gemini, OpenAI, on-device models), key vault, task catalogue
packages/ui     React editor (screens, panels, store)
packages/sdk    embed SDK (script tag / npm) and the postMessage protocol
apps/web        the website: index.html (app), embed.html (iframe target), sdk-demo.html
server/proxy    optional relay for fal.ai / Replicate
tests/e2e       Playwright browser tests
docs/           detailed documentation
```

Read [docs/architecture.md](docs/architecture.md) for how the pieces fit together, [docs/ai-providers.md](docs/ai-providers.md) for the AI details and [docs/testing.md](docs/testing.md) for how to run and write tests.

## Browser support and limits

- Needs **WebGL2** (every browser since 2017; on iOS 15+). If it is missing the app says so.
- Photos larger than 8192 px on the long edge are scaled down for editing.
- Phones have limited memory: the offline eraser and the 2× upscale can be slow or fail on old devices; use the ✨ cloud tools instead.
- Fonts for the Text tool load from Google Fonts; offline, system fonts are used.
- The first use of a beauty or on-device AI tool needs internet to download the model.

## Troubleshooting

| Problem                                          | Fix                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `npm install` fails with a peer-dependency error | The repo ships an `.npmrc` with `legacy-peer-deps=true`; make sure you run the command inside the project folder |
| The page is black where the photo should be      | Update the browser or enable hardware acceleration (WebGL2 required)                                             |
| "rejected the API key"                           | Copy the key again; Gemini keys start with `AIza`, OpenAI with `sk-`; check billing is enabled                   |
| "rate limit or quota reached"                    | Wait a minute or check the provider's usage limits                                                               |
| "declined this request for safety reasons"       | Rephrase the prompt or use a different photo                                                                     |
| Beauty says "No face detected"                   | The face must be reasonably large and frontal; Liquify and Blemish still work                                    |
| Model download stuck                             | Check the connection; the first download is 25–208 MB depending on the tool                                      |
| Text looks different after export                | The chosen web font had not finished loading; wait a second and export again                                     |

## Privacy

Photos are processed on your device. A photo leaves the browser only when you press **Generate** in a ✨ cloud AI tool, and then it goes directly to the provider you chose with your own key. No analytics, no tracking.

## Licence

MIT. See [LICENSE](LICENSE). Model licences are listed above; MediaPipe, Transformers.js and ONNX Runtime are Apache-2.0.
