/**
 * Accessors for the values templates/day.html declares as `var` globals.
 *
 * They are read on every access because the inline `<script>` that defines them runs after
 * the bundle is evaluated, and `CONTENT_INDEX` is mutated as content rows are added.
 */

export function contentIndex(): number {
  return window.CONTENT_INDEX;
}

export function setContentIndex(value: number): void {
  window.CONTENT_INDEX = value;
}

export function paragraphTemplate(): string {
  return window.PARAGRAPH_TEMPLATE;
}

export function imageTemplate(): string {
  return window.IMAGE_TEMPLATE;
}

export function dateSlug(): string {
  return window.DATE_SLUG;
}

export function saveUrl(): string {
  return window.SAVE_URL;
}

export function deleteUrl(): string {
  return window.DELETE_URL;
}

export function imageUrl(): string {
  return window.IMAGE_URL;
}

export function downsizedImageUrl(): string {
  return window.DOWNSIZED_IMAGE_URL;
}

export function videoUrl(): string {
  return window.VIDEO_URL;
}

export function downsizedVideoImageUrl(): string {
  return window.DOWNSIZED_VIDEO_IMAGE_URL;
}

export function moveUrl(): string {
  return window.MOVE_URL;
}
