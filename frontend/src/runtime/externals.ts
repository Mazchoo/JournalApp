import type { Editor, TinyMCE } from "tinymce";

/**
 * TinyMCE is resolved from `window` at call time rather than imported, because the page
 * must keep using the instance loaded by django-tinymce. Bundling a second copy would
 * leave the editors that `{{ tiny_mce.media }}` created unreachable. The npm package still
 * supplies the type definitions used here and the fake used by the test suite.
 */

/** A TinyMCE editor carrying the custom flag set by the "Generate" toggle button. */
export type SynthesisEditor = Editor & { synthesisEnabled?: boolean };

/** Throw if a required window global is absent. */
function missing(name: string): never {
  throw new Error(
    `${name} is not available on window; it must be loaded before the Journal bundle.`,
  );
}

/** Return the page's TinyMCE instance. */
export function tiny(): TinyMCE {
  return window.tinymce ?? window.tinyMCE ?? missing("tinymce");
}

/** Return the page's Bootstrap instance, if any. */
export function bs(): BootstrapGlobal {
  return window.bootstrap ?? missing("bootstrap");
}
