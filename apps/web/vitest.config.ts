import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,          // makes expect/describe/it available globally (required by jest-dom)
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',          // Playwright tests — run with `npx playwright test`, not vitest
    ],
  },
});