/**
 * Typed POST bodies and callback shapes for every backend endpoint the page
 * talks to. JSON responses live in `response-interface.ts`. Implementations
 * live in `make-request.ts`.
 */

import type { JsonErrorResponse } from './response-interface';

/** Error object passed to request `error` callbacks. */
export interface RequestError {
  status?: number;
  statusText?: string;
  responseJSON?: JsonErrorResponse;
}

/** Callbacks invoked after the CSRF token is attached. */
export interface RequestCallbacks<TResponse> {
  success?: (response: TResponse) => void;
  error?: (jqXhr: RequestError, textStatus: string, errorThrown: string) => void;
  complete?: () => void;
}

/** Settings handed to the request transport, including the callbacks. */
export interface TransportSettings<TResponse = unknown> {
  type: 'POST';
  url: string;
  data: Record<string, unknown>;
  xhrFields?: { responseType: 'blob' };
  success?: (response: TResponse) => void;
  error?: (jqXhr: RequestError, textStatus: string, errorThrown: string) => void;
  complete?: () => void;
}

/** POST body fields excluding the CSRF token, which the transport always attaches. */
export type RequestFields<T extends { csrfmiddlewaretoken: string }> = Omit<
  T,
  'csrfmiddlewaretoken'
>;

/** Paragraph row in a save-entry `content` map. */
export interface ParagraphSavePayload {
  text: string;
  height: number;
  allow_ai_synthesis: 0 | 1;
  entry: string;
}

/** Image or video row in a save-entry `content` map. */
export interface MediaSavePayload {
  file_path: string;
  allow_ai_synthesis: 0 | 1;
  entry: string;
}

/** `content` map posted to save-entry, keyed by DOM id. */
export type SaveData = Record<string, ParagraphSavePayload | MediaSavePayload>;

/** POST body for `main:save-entry`. */
export interface SaveEntryRequest {
  content: SaveData | undefined;
  name: string;
  csrfmiddlewaretoken: string;
}

/** POST body for `main:delete-entry`. */
export interface DeleteEntryRequest {
  name: string;
  csrfmiddlewaretoken: string;
}

/** POST body for `main:move-date`. */
export interface MoveEntryRequest {
  move_from: string;
  move_to: string;
  csrfmiddlewaretoken: string;
}

/** POST body for `main:get-downsized-image`. */
export interface DownsizedImageRequest {
  image_id: string;
  csrfmiddlewaretoken: string;
}

/** POST body for `main:get-downsized-video-image`. */
export interface DownsizedVideoImageRequest {
  video_id: string;
  csrfmiddlewaretoken: string;
}

/** POST body matching `FullContentPath` (`main:get-image` and `main:get-video`). */
export interface FullContentRequest {
  file: string;
  name: string;
  csrfmiddlewaretoken: string;
}
