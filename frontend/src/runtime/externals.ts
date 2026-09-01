import type { Editor, TinyMCE } from 'tinymce';

/**
 * jQuery, TinyMCE and Bootstrap are resolved from `window` at call time rather than
 * imported, because the page must keep using the single instances loaded by
 * templates/Common/header.html and django-tinymce. Bundling a second copy of jQuery would
 * give us a `$` without Bootstrap's `.modal()` plugin attached. The npm packages are still
 * dependencies: they supply the type definitions used here and the real implementations
 * used by the test suite.
 */

/** A TinyMCE editor carrying the custom flag set by the "Generate" toggle button. */
export type SynthesisEditor = Editor & { synthesisEnabled?: boolean };

/** Throw if a required window global is absent. */
function missing(name: string): never {
  throw new Error(`${name} is not available on window; it must be loaded before the Journal bundle.`);
}

/** Return the page's jQuery instance. */
export function jq(): JQueryStatic {
  return window.jQuery ?? window.$ ?? missing('jQuery');
}

/** Return the page's TinyMCE instance. */
export function tiny(): TinyMCE {
  return window.tinymce ?? window.tinyMCE ?? missing('tinymce');
}

/** Return the page's Bootstrap instance. */
export function bs(): BootstrapGlobal {
  return window.bootstrap ?? missing('bootstrap');
}

/** Read the CSRF token Django renders via `{% csrf_token %}`. */
export function csrfToken(): string {
  const input = document.querySelector<HTMLInputElement>('[name=csrfmiddlewaretoken]');
  return input!.value;
}
