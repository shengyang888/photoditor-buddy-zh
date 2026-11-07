import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/** Root Vitest configuration. Unit tests live next to the code they test (`*.test.ts`). */
export default defineConfig({
  resolve: {
    alias: {
      '@photoditor-buddy/core': fileURLToPath(
        new URL('./packages/core/src/index.ts', import.meta.url),
      ),
      '@photoditor-buddy/ai': fileURLToPath(new URL('./packages/ai/src/index.ts', import.meta.url)),
      '@photoditor-buddy/ui': fileURLToPath(new URL('./packages/ui/src/index.ts', import.meta.url)),
      '@photoditor-buddy/sdk': fileURLToPath(
        new URL('./packages/sdk/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx', 'server/**/*.test.ts'],
    environment: 'jsdom',
    globals: false,
  },
});
