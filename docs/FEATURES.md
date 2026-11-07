# Feature inventory

Everything photoditor-buddy can do, grouped the way the editor shows it.

**Legend**

- ✨ **AI (cloud)** — needs your own API key (Gemini or OpenAI). Costs a few cents per image, paid to the provider.
- 🧠 **AI (on-device)** — a free model that downloads once and runs in your browser. No key, no upload.
- No marker — classic editing, runs instantly on your device.

---

## 1. Opening photos

| Feature                 | Notes                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- |
| Open from device        | Tap, drag & drop anywhere on the Home screen, or paste from the clipboard        |
| Formats                 | JPG, PNG, WebP, GIF (first frame), BMP, AVIF, HEIC (Safari)                      |
| Phone photo orientation | EXIF rotation is applied automatically                                           |
| Very large photos       | Scaled to 8192 px on the long edge for editing; preview uses ≤ 2048 px for speed |
| Sample photo            | Built-in picture to try every tool                                               |

## 2. Adjust (non-destructive sliders)

Every slider previews live, resets with a double-tap, and records one undo step.

| Group   | Sliders                                                                                                                          |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Light   | Exposure, Brightness, Contrast, Highlights, Shadows, Whites, Blacks                                                              |
| Colour  | Temperature, Tint, Saturation, Vibrance (skin-protected), Hue shift                                                              |
| Detail  | Sharpen, Clarity, Structure, Dehaze, Denoise                                                                                     |
| Effects | Grain, Grain size, Fade (matte), Vignette, Vignette feather                                                                      |
| HSL     | Hue / Saturation / Luminance for 8 colour bands (red, orange, yellow, green, aqua, blue, purple, magenta)                        |
| Curves  | RGB master + Red / Green / Blue curves; drag, add, remove points; S-curve and Matte presets                                      |
| Tone    | Split toning (highlight hue/strength, shadow hue/strength, balance) and Colour balance (RGB per shadows / midtones / highlights) |
| LUT     | Load any 3D `.cube` LUT, strength slider                                                                                         |
| Auto    | One-tap enhance                                                                                                                  |
| Compare | Hold the eye button to see the original                                                                                          |

## 3. Filters

**213 filters in 21 categories**, each with a strength slider, stacked on top of your own adjustments.

Film · Vintage · Black & White · Japanese · Korean · Cinematic · Sunset · Pearl · Portrait · Food · Landscape · Street · Neon · Pastel · Mood · Cross Process · Duotone · Seasons · Travel · Retro Digital · Minimal

Live thumbnails are rendered from your actual photo.

## 4. Crop & geometry

| Feature                | Notes                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Free crop with handles | Rule-of-thirds grid                                                                                                            |
| Aspect presets         | Free, Original, 1:1, 4:5, 3:4, 4:3, 2:3, 3:2, 9:16, 16:9, 21:9, Story, Facebook cover, A4, ID 35×45 mm, ID 2×2 in, ID 33×48 mm |
| Rotate 90°             |                                                                                                                                |
| Flip                   | Horizontal and vertical                                                                                                        |
| Straighten             | −45° to +45° with automatic zoom so no empty corners appear                                                                    |
| Perspective            | Vertical and horizontal keystone correction                                                                                    |
| Apply / Cancel         | Everything is baked at full resolution on Apply; undo restores the original                                                    |

## 5. Effects (one at a time, with sliders)

Blur / Bokeh (whole, circle focus, tilt-shift band, tap to move focus) · Bloom · Soft Glow · Edge Blur · Pixelate · RGB Split · Chromatic · Glitch · VHS · Halftone · Dot Screen · Cross Hatch · Sketch · Emboss · Oil Paint · Posterize · Solarize · Threshold · Invert · Kaleidoscope · Mirror · Swirl · Fisheye · Frosted Glass

## 6. Beauty 🧠

Face landmarks (478 points) are detected on your device with MediaPipe. Liquify and Blemish also work on photos without a face.

| Tab        | Features                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| Skin 🧠    | Smooth skin (edge-preserving, keeps texture), Brighten skin, Whiten teeth, Brighten eyes                |
| Reshape 🧠 | Face slim, Jaw, Chin, Small head, Forehead, Nose width, Eye size, Eye distance, Eye lift, Mouth size    |
| Makeup 🧠  | Lipstick, Blush, Eyebrows, Eyeshadow, Contact lenses, Eyeliner — each with colour swatches and strength |
| Liquify    | Push, Bulge, Pinch, Restore brushes with size and strength; works on bodies, clothes, anything          |
| Blemish    | Tap spots to smooth them away; undo per spot                                                            |
| Multi-face | Up to 5 faces are handled at once                                                                       |

## 7. AI tools

### On-device (free) 🧠

| Tool                         | Model         | Download                   |
| ---------------------------- | ------------- | -------------------------- |
| Remove background (people)   | MODNet        | ~25 MB                     |
| Remove background (anything) | BiRefNet-lite | larger, better for objects |
| Upscale 2×                   | Swin2SR       | ~150 MB                    |
| Eraser (offline)             | LaMa          | ~208 MB, best on desktop   |

### Cloud (your key) ✨

| Category         | Tools                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Fix              | HD Enhance (2K), Restore old photo, Colorize, Fix lighting, Deblur                                                                              |
| Remove & Replace | AI Remove (describe or paint), AI Replace, Change background, AI Expand (6 aspect ratios), Remove text/watermarks                               |
| Portrait         | AI Retouch, Hairstyle, Outfit, ID photo (4 background colours), AI Makeup (5 looks), Expression (smile, open eyes…)                             |
| Style            | Art styles (anime, Ghibli, oil, watercolour, sketch, 3D, comic, pixel, pop art, cyberpunk, clay, toy bricks), AI Avatar (6 looks), Match a look |
| Scene            | Sky replace (6 skies), Relight (6 setups), Season / weather (6), Product shot                                                                   |
| Create           | Custom instruction (anything you type), Poster with headline, Die-cut sticker                                                                   |

Masks: paint over an area for precise edits. With an OpenAI key the mask is sent as a real mask; with Gemini only, the marked region is described in the prompt.

## 8. Text

Multiple text layers · 15 fonts (Inter, Playfair, Bebas, Pacifico, Caveat, Lobster, Oswald, Montserrat, Dancing Script, Abril, Space Mono, Noto Sans, Georgia, Impact, Courier) · Bold / Italic · Left / centre / right · Colour · Background pill · Outline colour and width · Letter spacing · Line height · Curved text · Drop shadow · Size, rotation, opacity · Drag, pinch to resize/rotate · Duplicate · Delete

## 9. Stickers

10 emoji packs (Faces, Hearts, Animals, Food, Nature, Party, Travel, Symbols, Hands, Kaomoji — 196 stickers) · Upload your own PNG (make cut-outs with Remove background first) · Flip · Size, rotation, opacity · Drag and pinch

## 10. Frames

Thin · Thick · Double · Rounded · Polaroid · Film strip · Inner shadow · Glow · Dashed · Torn paper · Stamp · Gradient — with colour, thickness, corner radius and opacity

## 11. Doodle

Pen · Marker · Neon · Dashed · Eraser brushes · 16 swatches + custom colour · Size · Opacity · Undo stroke · Clear

## 12. Mosaic

Pixels · Blur · Hexagons · Crystal styles · Brush size · Block size · Undo · Clear. Applied to the real pixels on export.

## 13. Watermark

Text watermark · 9 anchor positions or tiled diagonally · Font · Colour · Size · Opacity · Margin

## 14. Layers

List of all overlays (top first) · Select · Reorder · Lock · Hide / show · Opacity · Delete · Keyboard Delete key

## 15. Collage

| Mode      | Notes                                                              |
| --------- | ------------------------------------------------------------------ |
| Grid      | 20 layouts for 1–9 photos                                          |
| Poster    | 4 poster layouts with soft shadows                                 |
| Stitch    | Long vertical (screenshot-style) or horizontal strips, no cropping |
| Freestyle | Photos placed as movable, rotatable stickers on a coloured canvas  |
| Options   | Gap, corner radius, background colour, replace any photo           |

The collage opens in the editor so every other tool can be used on it.

## 16. Export

PNG / JPG / WebP · Quality slider · Size: original, 4K, 2K, 1080p, 720p · File name · Full-resolution rendering with all overlays · In the SDK, results go back to the host page

## 17. Batch

Apply the look from your last edit (all sliders, filter and effect) or a chosen filter to many photos · Format, size and quality · Downloads a ZIP (one file downloads directly)

## 18. Everyday quality-of-life

Undo / redo (40 steps, Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z) · Hold-to-compare · Reset all · Pinch-zoom and pan the canvas · Keyboard: Delete removes a layer, Escape closes a tool · Responsive layout: side panels on desktop, bottom sheet and dock on phones and tablets · Error boundaries so one broken panel never blanks the app · Friendly error messages for every AI failure (wrong key, quota, safety block, offline)

## 19. Settings

Gemini and OpenAI keys with "Test & save" (free check) · Model choice per provider (with price hints) · OpenAI quality · Preferred provider · On-device background model · Upload size for cloud calls · Remove all keys

## 20. SDK / embedding

`<script>` drop-in, npm package and React component · Host can pass an image, hide tools, set the accent colour, rename the Done button, and receive the exported image · postMessage protocol with origin checks

---

## Not included (on purpose)

| Feature                                          | Why                                                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Body reshape ("slim waist", "long legs") one-tap | Needs a body-pose model and produces unrealistic results on many photos; the Liquify brush covers manual body edits honestly |
| Video editing                                    | Different product                                                                                                            |
| Cloud storage / accounts                         | The app is private by design; nothing leaves your device                                                                     |
| Old-photo face restoration on device             | The best free models (GFPGAN) have unclear licences for redistribution; use ✨ Restore old photo instead                     |
