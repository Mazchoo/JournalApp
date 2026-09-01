import type {
  Base64MediaResponse,
  DeleteEntryRequest,
  DeleteEntryResponse,
  DownsizedImageRequest,
  DownsizedVideoImageRequest,
  FullContentRequest,
  JsonErrorResponse,
  MoveEntryRequest,
  MoveEntryResponse,
  RequestCallbacks,
  RequestError,
  RequestFields,
  SaveEntryRequest,
  SaveEntryResponse,
  TransportSettings,
} from './request-interface';
import {
  deleteUrl,
  downsizedImageUrl,
  downsizedVideoImageUrl,
  imageUrl,
  moveUrl,
  saveUrl,
  videoUrl,
} from './runtime/config';
import { csrfToken } from './runtime/externals';

/**
 * HTTP implementations for the backend endpoints declared in `request-interface.ts`.
 *
 * Bodies are `application/x-www-form-urlencoded` with nested keys
 * (`content[paragraph0][text]=...`) because Django's `convert_query_into_nested_dict`
 * splits on that syntax. Requests also send `X-Requested-With: XMLHttpRequest`, which
 * `is_ajax` requires.
 */

/**
 * Encode a nested object the way `jQuery.param` did, so Django's
 * `convert_query_into_nested_dict` still receives `content[paragraph0][text]` keys.
 */
export function encodeNestedForm(data: Record<string, unknown>): string {
  const params = new URLSearchParams();

  /** Append one value, descending into plain objects as bracketed keys. */
  const append = (key: string, value: unknown): void => {
    if (value === undefined || value === null) return;
    if (typeof value === 'object' && !Array.isArray(value)) {
      for (const [child, childValue] of Object.entries(value as Record<string, unknown>)) {
        append(`${key}[${child}]`, childValue);
      }
      return;
    }
    params.append(key, String(value));
  };

  for (const [key, value] of Object.entries(data)) {
    append(key, value);
  }
  return params.toString();
}

/** POST form-urlencoded data with the ajax header Django's `is_ajax` checks. */
async function fetchTransport<TResponse>(settings: TransportSettings<TResponse>): Promise<void> {
  try {
    const response = await fetch(settings.url, {
      method: settings.type,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: encodeNestedForm(settings.data),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      let responseJSON: JsonErrorResponse | undefined;
      try {
        responseJSON = (await response.json()) as JsonErrorResponse;
      } catch {
        responseJSON = undefined;
      }
      const error: RequestError = {
        status: response.status,
        statusText: response.statusText,
        responseJSON,
      };
      settings.error?.(error, 'error', response.statusText);
      settings.complete?.();
      return;
    }

    const payload =
      settings.xhrFields?.responseType === 'blob'
        ? ((await response.blob()) as TResponse)
        : ((await response.json()) as TResponse);
    settings.success?.(payload);
    settings.complete?.();
  } catch (caught) {
    const errorThrown = caught instanceof Error ? caught.message : String(caught);
    settings.error?.({ statusText: errorThrown }, 'error', errorThrown);
    settings.complete?.();
  }
}

// ToDo - use library for this instead of tests imposing dependency
type RequestTransport = (settings: TransportSettings) => void;

let requestTransport: RequestTransport = (settings) => {
  void fetchTransport(settings);
};

/** Replace the HTTP transport. Used by the test suite to intercept requests. */
export function setRequestTransport(transport: RequestTransport): void {
  requestTransport = transport;
}

/** Restore the production `fetch` transport. */
export function resetRequestTransport(): void {
  requestTransport = (settings) => {
    void fetchTransport(settings);
  };
}

/** POST form-urlencoded data to a backend endpoint, always attaching the page CSRF token. */
function postJson<TResponse>(
  url: string,
  data: object,
  callbacks: RequestCallbacks<TResponse>,
  extra?: Pick<TransportSettings, 'xhrFields'>,
): void {
  requestTransport({
    type: 'POST',
    url,
    data: {
      ...data,
      csrfmiddlewaretoken: csrfToken(),
    },
    ...extra,
    success: callbacks.success as TransportSettings['success'],
    error: callbacks.error,
    complete: callbacks.complete,
  });
}

/** POST the save payload to `main:save-entry`. */
export function requestSaveEntry(
  fields: RequestFields<SaveEntryRequest>,
  callbacks: RequestCallbacks<SaveEntryResponse>,
): void {
  postJson(saveUrl(), fields, callbacks);
}

/** POST a delete for the given date slug to `main:delete-entry`. */
export function requestDeleteEntry(
  fields: RequestFields<DeleteEntryRequest>,
  callbacks: RequestCallbacks<DeleteEntryResponse>,
): void {
  postJson(deleteUrl(), fields, callbacks);
}

/** POST a move between date slugs to `main:move-date`. */
export function requestMoveEntry(
  fields: RequestFields<MoveEntryRequest>,
  callbacks: RequestCallbacks<MoveEntryResponse>,
): void {
  postJson(moveUrl(), fields, callbacks);
}

/** POST an image id to `main:get-downsized-image`. */
export function requestDownsizedImage(
  fields: RequestFields<DownsizedImageRequest>,
  callbacks: RequestCallbacks<Base64MediaResponse>,
): void {
  postJson(downsizedImageUrl(), fields, callbacks);
}

/** POST a video id to `main:get-downsized-video-image`. */
export function requestDownsizedVideoImage(
  fields: RequestFields<DownsizedVideoImageRequest>,
  callbacks: RequestCallbacks<Base64MediaResponse>,
): void {
  postJson(downsizedVideoImageUrl(), fields, callbacks);
}

/** POST a file name and date slug to `main:get-image`. */
export function requestFullImage(
  fields: RequestFields<FullContentRequest>,
  callbacks: RequestCallbacks<Base64MediaResponse>,
): void {
  postJson(imageUrl(), fields, callbacks);
}

/** POST a file name and date slug to `main:get-video`, expecting a video blob. */
export function requestFullVideo(
  fields: RequestFields<FullContentRequest>,
  callbacks: RequestCallbacks<BlobPart>,
): void {
  postJson(videoUrl(), fields, callbacks, {
    xhrFields: {
      responseType: 'blob',
    },
  });
}
