import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

/** Builds the SDK as an ES module (npm) and an IIFE (`<script>` drop-in exposing `window.PhotoditorBuddy`). */
export default defineConfig({
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'PhotoditorBuddy',
      formats: ['es', 'iife'],
      fileName: (format) =>
        format === 'es' ? 'photoditor-buddy-sdk.js' : 'photoditor-buddy-sdk.iife.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
