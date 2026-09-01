/**
 * Accessors for the values templates/day.html declares as `var` globals.
 *
 * They are read on every access because the inline `<script>` that defines them runs after
 * the bundle is evaluated, and `CONTENT_INDEX` is mutated as content rows are added.
 */

/** Return the current CONTENT_INDEX global. */
export function contentIndex(): number {
  return window.CONTENT_INDEX;
}

/** Set the CONTENT_INDEX global. */
export function setContentIndex(value: number): void {
  window.CONTENT_INDEX = value;
}

/** Return the paragraph HTML template global. */
export function paragraphTemplate(): string {
  return window.PARAGRAPH_TEMPLATE;
}

/** Return the image HTML template global. */
export function imageTemplate(): string {
  return window.IMAGE_TEMPLATE;
}

/** Return the current date slug global. */
export function dateSlug(): string {
  return window.DATE_SLUG;
}

/** Return the save endpoint URL. */
export function saveUrl(): string {
  return window.SAVE_URL;
}

/** Return the delete endpoint URL. */
export function deleteUrl(): string {
  return window.DELETE_URL;
}

/** Return the full-image endpoint URL. */
export function imageUrl(): string {
  return window.IMAGE_URL;
}

/** Return the downsized-image endpoint URL. */
export function downsizedImageUrl(): string {
  return window.DOWNSIZED_IMAGE_URL;
}

/** Return the full-video endpoint URL. */
export function videoUrl(): string {
  return window.VIDEO_URL;
}

/** Return the downsized-video-poster endpoint URL. */
export function downsizedVideoImageUrl(): string {
  return window.DOWNSIZED_VIDEO_IMAGE_URL;
}

/** Return the move-entry endpoint URL. */
export function moveUrl(): string {
  return window.MOVE_URL;
}
