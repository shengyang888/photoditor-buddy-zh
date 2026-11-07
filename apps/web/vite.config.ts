import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const root = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

/**
 * Web app build. Three HTML entries: the app, the iframe embed target and the SDK demo.
 * `base: './'` makes the output work from any folder (GitHub Pages, S3, a subpath...).
 */
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@photoditor-buddy/core': root('../../packages/core/src/index.ts'),
      '@photoditor-buddy/ai': root('../../packages/ai/src/index.ts'),
      '@photoditor-buddy/ui': root('../../packages/ui/src/index.ts'),
      '@photoditor-buddy/sdk': root('../../packages/sdk/src/index.ts'),
    },
  },
  build: {
    target: 'es2022',
    rolldownOptions: {
      input: {
        main: root('./index.html'),
        embed: root('./embed.html'),
        'sdk-demo': root('./sdk-demo.html'),
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers', 'onnxruntime-web', '@mediapipe/tasks-vision'],
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
