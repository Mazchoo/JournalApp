import type { TinyMCE } from 'tinymce';

/**
 * Everything below is owned by the Django templates, not by this project.
 *
 * - The `*_URL`, `*_TEMPLATE`, `CONTENT_INDEX` and `DATE_SLUG` values are emitted by the
 *   inline `<script>` block at the bottom of templates/day.html.
 * - `showCallbackModal` / `showMessageSimpleModal` / `showDateCallbackModal` come from the
 *   inline `<script>` blocks in templates/Modals/*.html.
 * - `jQuery`, `tinymce` and `bootstrap` are loaded by templates/Common/header.html and by
 *   django-tinymce's `{{ tiny_mce.media }}`.
 */
declare global {
  /**
   * Bootstrap 4's jQuery modal plugin. Declared here rather than pulled from @types/bootstrap
   * because that package's v4 typings predate the Bootstrap 5 `ScrollSpy.getInstance` API that
   * `refreshScrollSpies` calls.
   */
  interface JQuery<TElement = HTMLElement> {
    modal(action?: 'show' | 'hide' | 'toggle' | 'handleUpdate' | 'dispose'): JQuery<TElement>;
  }

  /** Minimal shape of the Bootstrap 5 global, which is all `refreshScrollSpies` needs. */
  interface BootstrapScrollSpyInstance {
    refresh(): void;
  }

  interface BootstrapGlobal {
    ScrollSpy: {
      getInstance(element: Element): BootstrapScrollSpyInstance | null;
    };
  }

  interface Window {
    CONTENT_INDEX: number;
    PARAGRAPH_TEMPLATE: string;
    IMAGE_TEMPLATE: string;
    THREE_JS_URL: string;
    DATE_SLUG: string;
    SAVE_URL: string;
    DELETE_URL: string;
    IMAGE_URL: string;
    DOWNSIZED_IMAGE_URL: string;
    VIDEO_URL: string;
    DOWNSIZED_VIDEO_IMAGE_URL: string;
    MOVE_URL: string;

    showCallbackModal?: (
      modalTitle: string,
      modalMessage: string,
      actionTitle: string,
      callback: () => void,
    ) => void;
    // The simple modal assigns the message with `innerHTML`, so callers are free to hand it a
    // non-string; entry.delete.js relies on that when it forwards a whole AJAX response.
    showMessageSimpleModal?: (modalTitle: string, modalMessage: unknown) => void;
    showDateCallbackModal?: (
      modalTitle: string,
      modalMessage: string,
      actionTitle: string,
      callback: () => void,
    ) => void;

    jQuery?: JQueryStatic;
    $?: JQueryStatic;
    tinymce?: TinyMCE;
    tinyMCE?: TinyMCE;
    bootstrap?: BootstrapGlobal;
  }
}
