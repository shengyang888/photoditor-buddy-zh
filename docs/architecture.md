# Architecture

## Packages

| Package                  | Role                                                                                                                                 | Depends on                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `@photoditor-buddy/core` | Framework-free engine: WebGL2 renderer, adjustments, filters, LUTs, effects, geometry, overlays, collage, portrait maths, ZIP writer | MediaPipe (lazy)                        |
| `@photoditor-buddy/ai`   | Providers (Gemini, OpenAI), on-device models, key vault, task catalogue, orchestration                                               | Transformers.js, onnxruntime-web (lazy) |
| `@photoditor-buddy/ui`   | React editor: store, screens, panels, viewport                                                                                       | core, ai, sdk (protocol)                |
| `@photoditor-buddy/sdk`  | Embed client for host pages + protocol types                                                                                         | nothing                                 |
| `apps/web`               | Vite site with three entries: app, embed target, SDK demo                                                                            | ui                                      |
| `server/proxy`           | Optional Hono relay for browser-hostile providers                                                                                    | Hono                                    |

Workspace packages are consumed from source (`src/index.ts`) through Vite aliases and TypeScript `paths`; only the SDK is built as a library.

## Render pipeline (`packages/core/src/render`)

The preview and the export run the same `Renderer` on a WebGL2 canvas:

```
source texture
  → warp        (displacement field: reshape sliders + liquify strokes)
  → skin        (bilateral smoothing, whitening, teeth, eyes, blemish; makeup overlay blend)
  → detail      (needs two blurs: sharpen, structure, clarity, dehaze, denoise)
  → colour      (exposure … curves, HSL, colour balance, split toning, 3D LUT, fade)
  → effects     (grain, vignette, one creative effect; blur-based effects read a half-res blur)
  → present     (flip to canvas)
```

- Every pass is a full-screen triangle with a fragment shader (`shaders/*.ts`).
- Intermediate targets are RGBA8 ping-pong framebuffers; large blurs run at half resolution.
- Curves become a 256×1 lookup texture; LUTs are `TEXTURE_3D` sampled trilinearly.
- Portrait masks and makeup are Canvas 2D drawings uploaded as textures; the displacement field is an RG16F texture (256 px long edge) built on the CPU from face landmarks.
- The preview source is capped at 2048 px; export re-renders the full-resolution source (up to the GPU's `MAX_TEXTURE_SIZE`) in a temporary renderer, then composites overlays with Canvas 2D.

Geometry (crop, rotate, flip, straighten, perspective) is _baked_: it produces a new source canvas and records an undo step, exactly like phone editors.

## State model (`packages/ui/src/store`)

- `EditSnapshot` is immutable: `{ source, adjustments, filter, effect, overlays, portrait, userLut }`.
- `History<EditSnapshot>` keeps 40 steps. `updateLive` replaces the present without a step (slider drags); `commit` uses the pre-drag snapshot as the undo point; `commitSource` swaps the image (crop, AI) and optionally resets the look because it is now baked in.
- `useInteractionStore` holds transient UI state that must not enter history: brushes, the AI mask being painted, the crop draft, zoom/pan.
- `resolveRenderState` turns a snapshot into the renderer input: user adjustments + filter offsets (`stackPreset`), the resolved LUT, the effect and cached portrait artefacts (masks, makeup, displacement) keyed by cheap JSON strings.

## Overlays

Text, stickers, doodle, mosaic, frames and watermarks are vector-ish layers stored with positions as fractions of the image. `drawOverlays` renders them with Canvas 2D both for the on-screen overlay canvas and for export, so what you see is what you get at any resolution. Mosaic builds a mosaicked copy of the base image per style and reveals it through the painted strokes.

## AI flow (`packages/ai/src/run.ts`)

1. The panel renders the current look at preview size (without overlays) as the input image.
2. `chooseProvider` routes masked edits to OpenAI when a key exists (real mask support), otherwise to the preferred provider.
3. The task's `buildPrompt` composes the instruction; masks are inverted to OpenAI's convention or described textually for Gemini.
4. The provider returns a Blob; the result becomes the new source with the look reset (it is baked into the pixels). Undo restores the previous image.

Local tasks import their libraries lazily so the main bundle stays small.

## Embedding

`embed.html` renders `<PhotoEditor embed />`; `useEmbedBridge` announces `ready`, accepts `configure` / `load-image` / `export` / `reset` and returns `exported` results. The SDK (`mountPhotoditorBuddy`) creates the iframe, validates origins and exposes a small handle. See docs/sdk.md.

## Why these choices

- **Custom WebGL2 instead of a canvas framework**: one shader chain gives 200+ filters and 20+ sliders at 60 fps on phones, with full control over export quality and bundle size.
- **iframe for third-party sites**: complete CSS isolation and our own headers, so the host page cannot break the editor and the editor cannot leak styles.
- **Bring your own key**: no backend, no accounts, and each user pays only for what they use.
