/**
 * JSON response shapes returned by backend endpoints the page talks to.
 * Request bodies and transport callbacks live in `request-interface.ts`.
 */

/** JSON error body some endpoints return instead of a 2xx payload. */
export interface JsonErrorResponse {
  error?: string;
}

/** JSON body from `main:save-entry`. */
export interface SaveEntryResponse {
  success?: string;
  error?: string;
}

/** JSON body from `main:delete-entry`. */
export interface DeleteEntryResponse {
  success?: string;
  error?: string;
}

/** JSON body from `main:move-date`. */
export interface MoveEntryResponse {
  new_date?: string;
  error?: string;
}

/** JSON body from the downsized-image and full-image endpoints. */
export interface Base64MediaResponse {
  base64?: string;
  error?: string;
}

/** Shape of the image/video payloads returned by main.content_generation.load_entry. */
export interface MediaContentThumbnail {
  base64?: string;
  file_name?: string;
  allow_ai_synthesis?: number;
}
