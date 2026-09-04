import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const distDir = resolve(import.meta.dirname, "dist");

export default defineConfig({
  build: {
    // Django serves this folder via STATICFILES_DIRS, so templates load the IIFE
    // with {% static 'journal.bundle.js' %}.
    outDir: distDir,
    emptyOutDir: true,
    sourcemap: true,
    target: "es2021",
    lib: {
      entry: resolve(import.meta.dirname, "src/main.ts"),
      name: "Journal",
      formats: ["iife"],
      /** Return the IIFE bundle file name Django templates load. */
      fileName: () => "journal.bundle.js",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    unstubGlobals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts", "src/types/**"],
    },
  },
});
