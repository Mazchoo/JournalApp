import type { TinyMCE } from 'tinymce';

/**
 * Everything below is owned by the Django templates, not by this project.
 *
 * - The `*_URL`, `*_TEMPLATE`, `CONTENT_INDEX`, `DATE_SLUG` and `ENTRY_EXISTS` values are
 *   emitted by the inline `<script>` block at the bottom of templates/day.html.
 * - `tinymce` is loaded by django-tinymce's `{{ tiny_mce.media }}`.
 */
declare global {
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
    DATE_SLUG: string;
    ENTRY_EXISTS: boolean;
    SAVE_URL: string;
    DELETE_URL: string;
    IMAGE_URL: string;
    DOWNSIZED_IMAGE_URL: string;
    VIDEO_URL: string;
    DOWNSIZED_VIDEO_IMAGE_URL: string;
    MOVE_URL: string;

    tinymce?: TinyMCE;
    tinyMCE?: TinyMCE;
    bootstrap?: BootstrapGlobal;
  }
}

export {};
