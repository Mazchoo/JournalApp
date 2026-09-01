import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    // Django already serves static/JS, so the IIFE lands where the templates can load it
    // with {% static 'JS/dist/journal.bundle.js' %}. emptyOutDir only wipes this dist
    // folder, not jquery/bootstrap sitting next to it.
    outDir: resolve(import.meta.dirname, '../static/JS/dist'),
    emptyOutDir: true,
    sourcemap: true,
    // static/JS already shipped String.prototype.replaceAll, so nothing older is supportable.
    target: 'es2021',
    lib: {
      entry: resolve(import.meta.dirname, 'src/main.ts'),
      name: 'Journal',
      formats: ['iife'],
      /** Return the IIFE bundle file name Django templates load. */
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
