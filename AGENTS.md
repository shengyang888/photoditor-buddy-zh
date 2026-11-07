# photoditor-buddy — agent instructions

Browser photo editor (TypeScript 6, React 19.3, Vite 8.3, Tailwind 4.3, Zustand 5) in an npm-workspaces monorepo; the rendering engine is hand-written WebGL2, AI is bring-your-own-key (Gemini / OpenAI) plus free on-device models (Transformers.js 4, onnxruntime-web 1.30, MediaPipe Tasks Vision 1.0).

## Commands

```bash
npm install                 # .npmrc sets legacy-peer-deps=true (npm 10 arborist bug with workspace peers)
npm run dev                 # apps/web on http://localhost:5173
npm run build               # apps/web/dist + packages/sdk/dist
npm run typecheck           # tsc over every package (paths in tsconfig.base.json)
npm run lint                # eslint flat config
npm run format              # prettier --write
npm test                    # vitest (jsdom), files: packages/**/*.test.ts
npm run test:e2e            # playwright, builds must exist first (npm run build); 3 viewports
npm run proxy               # optional relay server (server/proxy)
```

## Do not use

- No pnpm/yarn: the repo is npm workspaces with a committed `package-lock.json`.
- No Fabric.js, Konva, PixiJS or glfx: the engine is `packages/core/src/render` (custom WebGL2). Do not add a second canvas framework.
- No `@imgly/background-removal` (AGPL) and no BRIA RMBG models (non-commercial): only MIT/Apache models are allowed (see docs/ai-providers.md).
- No `baseUrl` in tsconfig (removed in TS 7); use `paths` with `./`-relative entries.
- No `import * as Icons from 'lucide-react'`: register icons in `packages/ui/src/icons.ts` (the whole set is ~700 kB).

## Boundaries

Always:

- Keep every file, comment, UI string and doc in English.
- Give every exported function a JSDoc block that says what it does and why.
- Mark AI-dependent features with `<AiBadge kind="cloud" | "local" />` in the UI and ✨/🧠 in docs/FEATURES.md.
- Run `npm run check` before committing; keep `npm run test:e2e` green on all three projects.

Ask first:

- Adding a dependency to `packages/core` (it must stay framework-free and small).
- Changing the postMessage protocol in `packages/sdk/src/protocol.ts` (hosts depend on it).
- Adding a cloud provider or a model download larger than 250 MB.

Never:

- Commit API keys, `.env` files or model weights.
- Send user images anywhere except the provider the user chose with their own key.
- Read keys from anything but `KeyVault` (`packages/ai/src/vault.ts`).

## Conventions

- Sliders are integers in -100..100 (0..100 where one-sided); shaders receive them divided by 100. Add new sliders to `ADJUSTMENT_DEFINITIONS` so the UI, tests and presets pick them up automatically.
- Editor state is immutable snapshots (`EditSnapshot`); `updateLive` = no undo step (drags), `commit` = undo step, `commitSource` = new image (crop, AI). Never mutate a snapshot.
- Overlay positions are fractions of the image (0..1) so they survive resizing and export.
- Filters are presets stacked on top of user adjustments (`stackPreset`), never absolute values.
- Tests: pure logic in Vitest next to the code (`*.test.ts`); anything touching Canvas/WebGL in Playwright (`tests/e2e`). The app exposes `window.__pb` when the URL contains `?e2e`.
- Prettier formats everything; ESLint enforces `import type` and unused-variable rules.

## Gotchas

- GLSL ES 3.0 reserved words (`flat`, `filter`, `sample`, `input`, `output`...) cannot be variable names; a compile error surfaces only at runtime as a toast.
- React StrictMode mounts twice: the on-screen renderer must call `dispose(false)` so the canvas keeps its WebGL context (`useRenderer.ts`). Temporary renderers use `dispose()` to free GPU memory.
- Tailwind 4 only scans the CSS file's own package: `packages/ui/src/styles.css` needs `@source './';` or every class in `packages/ui` silently disappears.
- `fetch` must not be stored as a class field default (`fetchImpl = fetch` throws "Illegal invocation"); wrap it in an arrow function.
- Zustand: never put the whole store object in a `useEffect` dependency list (it changes every update and loops); select `set` separately.
- Portrait masks and the makeup overlay must be handed to WebGL as `ImageData`, never as a canvas: canvases store premultiplied alpha, so pixels with low alpha lose their colour (the first makeup looked like flat paint for this reason).
- Textures are uploaded with `UNPACK_FLIP_Y` and WebGL framebuffers are bottom-up, so the present pass must NOT flip (`u_flip = 0`); a flip shows the photo upside down and the e2e orientation checks (sun above lake) catch it.
- Displacement fields are authored top-down but textures are bottom-up after the source flip: `Renderer.syncDisplacement` flips rows and negates `dy`.
- Gemini has no mask input; `runAiTask` describes the mask region in the prompt unless an OpenAI key exists.
- MediaPipe logs `INFO: Created TensorFlow Lite XNNPACK delegate` via `console.error`; tests ignore lines starting with `INFO:`.
- Headless Chromium needs `--use-angle=swiftshader` (set in playwright.config.ts) for WebGL2.

## Environment

- No environment variables are required for the app. The optional relay reads `PORT` and `ALLOWED_ORIGINS` (names only; never commit values).
- Node 22.12+ (24 LTS recommended). `npm run proxy` uses Node's native TypeScript stripping.

## Documentation

- docs/FEATURES.md — complete feature inventory with AI markers.
- docs/architecture.md — render pipeline, state model, package boundaries.
- docs/ai-providers.md — providers, request formats, routing, model licences.
- docs/sdk.md — embed API and postMessage protocol.
- docs/testing.md — how to run and extend the tests.
- No database, no schema files.
