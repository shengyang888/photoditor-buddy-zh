# SDK: embedding photoditor-buddy

The SDK mounts the editor in an `<iframe>` on any website and exchanges messages with it. It has no dependencies and weighs about 2 kB.

## Install

- Script tag: `https://cdn.jsdelivr.net/npm/@photoditor-buddy/sdk/dist/photoditor-buddy-sdk.iife.js` exposes `window.PhotoditorBuddy`.
- npm: `npm install @photoditor-buddy/sdk` then `import { mountPhotoditorBuddy } from '@photoditor-buddy/sdk'`.
- Build it yourself: `npm run build --workspace=packages/sdk` produces `packages/sdk/dist`.

You also need a hosted copy of the editor's `embed.html` (from `npm run build`, folder `apps/web/dist`). Pass its URL as `editorUrl`. The default points at the GitHub Pages demo.

## `mountPhotoditorBuddy(options)`

| Option          | Type                                          | Meaning                                                               |
| --------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| `container`     | `HTMLElement \| string`                       | Where the iframe goes (give it a height)                              |
| `editorUrl`     | `string`                                      | URL of `embed.html`                                                   |
| `image`         | `string`                                      | Data URL, blob URL or CORS-enabled URL to open immediately            |
| `fileName`      | `string`                                      | Name used for the export file                                         |
| `tools`         | `EmbedToolId[]`                               | Which tools to show, e.g. `['adjust','filters','crop']`; omit for all |
| `autoStart`     | `boolean`                                     | Skip the Home screen (needs `image`)                                  |
| `exportFormat`  | `'image/png' \| 'image/jpeg' \| 'image/webp'` | Default export format                                                 |
| `exportQuality` | `number`                                      | 0..1 for lossy formats                                                |
| `returnResult`  | `boolean`                                     | Send the result to the host (`onExport`) instead of downloading       |
| `doneLabel`     | `string`                                      | Text of the Export button, e.g. "Save to profile"                     |
| `accent`        | `string`                                      | CSS colour for the accent                                             |
| `onReady`       | `() => void`                                  | Editor loaded                                                         |
| `onExport`      | `(result) => void`                            | `{ dataUrl, blob, mimeType, fileName, width, height }`                |
| `onError`       | `(message) => void`                           | Errors from the editor                                                |
| `onClose`       | `() => void`                                  | Reserved for host-controlled closing                                  |
| `className`     | `string`                                      | Class for the iframe                                                  |

Returned handle:

```ts
editor.loadImage(url, fileName?)  // open another image
editor.requestExport()            // same as pressing the Done button
editor.reset()                    // back to the Home screen
editor.destroy()                  // remove iframe and listeners
editor.iframe                     // the HTMLIFrameElement
```

## React component

`@photoditor-buddy/ui` exports `<PhotoEditor />` for React 19 apps that want the editor inline (no iframe). Import the package once; its CSS is bundled. The component fills its parent, so give the parent a height.

## Message protocol

All messages carry `source: 'photoditor-buddy'` and `version: 1`. The SDK checks `event.origin` against the editor URL and `event.source` against the iframe; the editor replies only to the origin that configured it.

Host → editor: `configure { config }`, `load-image { image, fileName? }`, `export`, `reset`.
Editor → host: `ready`, `image-loaded { width, height }`, `exported { dataUrl, mimeType, fileName, width, height }`, `error { message }`, `close`.

Types live in `packages/sdk/src/protocol.ts`.

## Security notes

- Host the editor on your own origin when possible; the iframe isolates CSS and scripts either way.
- API keys entered inside the iframe are stored in the iframe's origin, not the host's.
- Result images travel as data URLs inside `postMessage`; for very large exports prefer `exportFormat: 'image/jpeg'` or a smaller size.

## Demo

`apps/web/sdk-demo.html` (run `npm run dev` and open `/sdk-demo.html`) shows a host page loading an image, hiding nothing, and receiving the export. The end-to-end test `tests/e2e/sdk.spec.ts` exercises the same flow.
