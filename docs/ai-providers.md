# AI providers

## Cloud (bring your own key)

| Provider      | Endpoint                                                                               | Auth                           | Models offered                                                                                    | Masks                           | Sizes                          |
| ------------- | -------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------ |
| Google Gemini | `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | header `x-goog-api-key`        | `gemini-3.1-flash-image` (default), `gemini-3.1-flash-lite-image` (1K only), `gemini-3-pro-image` | no (region described in prompt) | 1K / 2K / 4K, 10 aspect ratios |
| OpenAI        | `POST https://api.openai.com/v1/images/edits` (multipart)                              | header `Authorization: Bearer` | `gpt-image-2.5-sunburst` (default), `gpt-image-2.5-flare`, `gpt-image-2`                          | yes (PNG, alpha 0 = edit)       | 1024², 1536×1024, 1024×1536    |

Request builders are unit-tested in `packages/ai/src/providers/providers.test.ts`. Both APIs accept browser calls with CORS; no server is involved.

Deprecated models are deliberately not offered: `gemini-2.5-flash-image` (shut down 2026-10-02) and `gpt-image-1*` (shut down 2026-12-01).

### Routing rules (`chooseProvider`)

1. A painted mask on a mask-capable task goes to OpenAI when an OpenAI key exists.
2. Otherwise the preferred provider from Settings, if it has a key.
3. Otherwise whichever provider has a key.

### Prompts

Every task in `packages/ai/src/tasks.ts` builds a full instruction and appends a "keep everything else the same, output only the photo" clause. Option chips (art styles, skies, lighting…) inject their own wording. Expand uses Gemini's `imageConfig.aspectRatio`; HD Enhance requests `imageSize: '2K'`.

### Errors

`errorFromStatus` maps HTTP codes to `AiError` codes: 401/403 `invalid-key`, 429 `quota`, 400 with safety wording `safety`, 5xx `network`. The UI opens Settings automatically on key problems.

### Key verification

Settings → "Test & save" calls the free model-listing endpoint of the provider (`GET /models`), so checking a key never costs money.

## On-device (free)

| Feature                      | Library                                         | Model id                           | Licence    | Notes                                                    |
| ---------------------------- | ----------------------------------------------- | ---------------------------------- | ---------- | -------------------------------------------------------- |
| Face landmarks               | `@mediapipe/tasks-vision` 1.0.1                 | `face_landmarker.task` (float16)   | Apache-2.0 | wasm from jsDelivr, model from Google storage            |
| Background removal (people)  | Transformers.js 4 pipeline `background-removal` | `Xenova/modnet`                    | Apache-2.0 | default, ~25 MB                                          |
| Background removal (general) | Transformers.js `AutoModel`                     | `onnx-community/BiRefNet_lite`     | MIT        | larger                                                   |
| Upscale 2×                   | Transformers.js pipeline `image-to-image`       | `Xenova/swin2SR-lightweight-x2-64` | Apache-2.0 | tiled 384 px + overlap                                   |
| Eraser                       | onnxruntime-web 1.30                            | `Carve/LaMa-ONNX` `lama_fp32.onnx` | Apache-2.0 | fixed 512² tile around the mask, cached in the Cache API |

Rejected on licence grounds: `@imgly/background-removal` (AGPL-3.0), BRIA RMBG 1.4/2.0 (non-commercial), GFPGAN weights (mixed non-commercial notices), Depth Anything V2 base/large (CC-BY-NC).

WebGPU is used when `navigator.gpu` is available, otherwise WebAssembly. All models are downloaded once and cached by the browser.

## Optional relay (`server/proxy`)

fal.ai and Replicate forbid browser-side keys. The relay forwards `/relay/{provider}/...` with the caller's `x-provider-key` header and stores nothing. It is not wired into the UI by default; it exists so a team can add specialised models (GFPGAN, CodeFormer, Real-ESRGAN) without touching the editor.
