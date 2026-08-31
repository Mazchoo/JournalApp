import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    // Stays inside frontend/. Wiring the bundle up to Django is a separate, deliberate step:
    // see the switchover notes in README.md.
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // static/JS already shipped String.prototype.replaceAll, so nothing older is supportable.
    target: 'es2021',
    lib: {
      entry: resolve(import.meta.dirname, 'src/main.ts'),
      name: 'Journal',
      formats: ['iife'],
      fileName: () => 'journal.bundle.js',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/types/**'],
    },
  },
});
