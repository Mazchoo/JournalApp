import { afterEach, vi, type Mock } from "vitest";

import type { RequestError } from "../../src/request-interface";

export interface AjaxSettings {
  type: "POST";
  url: string;
  data: Record<string, unknown>;
}

export interface AjaxStub {
  calls: AjaxSettings[];
  mock: Mock;
  last(): AjaxSettings;
  succeed(response: unknown): Promise<void>;
  fail(errorThrown: string, jqXhr?: unknown): Promise<void>;
}

interface PendingFetch {
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
}

const unsettled: PendingFetch[] = [];

/** Coerce integer form fields back to numbers so assertions match the posted object. */
function coerceFormValue(value: string): string | number {
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

/** Reverse `encodeNestedForm` so tests can assert on the original nested payload. */
function decodeNestedForm(body: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [rawKey, rawValue] of new URLSearchParams(body)) {
    const keys = [...rawKey.matchAll(/[^[\]]+/g)].map((match) => match[0]);
    const leaf = keys.pop();
    if (leaf === undefined) continue;
    let cursor = result;
    for (const key of keys) {
      const next = cursor[key];
      if (typeof next !== "object" || next === null || Array.isArray(next)) {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    }
    cursor[leaf] = coerceFormValue(rawValue);
  }
  return result;
}

/** Rebuild the posted settings from the `fetch` arguments production code sends. */
function settingsFromFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): AjaxSettings {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const body = typeof init?.body === "string" ? init.body : "";
  return {
    type: "POST",
    url,
    data: decodeNestedForm(body),
  };
}

/** Let `fetchTransport` finish `response.json()` / `response.blob()` and run callbacks. */
async function flushTransport(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Drop leftover `fetch` promises so Vitest's worker can exit. */
afterEach(async () => {
  if (unsettled.length === 0) return;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    for (const request of unsettled) {
      request.reject(new Error("Request was not completed"));
    }
    unsettled.length = 0;
    await flushTransport();
  } finally {
    log.mockRestore();
  }
});

/** Return the most recent unsettled `fetch`, or throw if none exist. */
function takeLastPending(): PendingFetch {
  const request = unsettled.pop();
  if (request === undefined) throw new Error("No request was made.");
  return request;
}

/** Intercept `fetch` so requests can be inspected and answered from tests. */
export function stubAjax(): AjaxStub {
  const calls: AjaxSettings[] = [];
  const mock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      calls.push(settingsFromFetch(input, init));
      return new Promise<Response>((resolve, reject) => {
        unsettled.push({ resolve, reject });
      });
    },
  );
  vi.stubGlobal("fetch", mock);

  /** Return the most recent request settings, or throw if none exist. */
  const last = (): AjaxSettings => {
    const settings = calls[calls.length - 1];
    if (settings === undefined) throw new Error("No request was made.");
    return settings;
  };

  return {
    calls,
    mock: mock as unknown as Mock,
    last,
    /** Resolve the last request as 2xx and wait for the production callbacks. */
    succeed: async (response: unknown) => {
      const { resolve } = takeLastPending();
      if (response instanceof Blob) {
        resolve(new Response(response, { status: 200, statusText: "OK" }));
      } else {
        resolve(
          new Response(JSON.stringify(response), {
            status: 200,
            statusText: "OK",
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      await flushTransport();
    },
    /** Fail the last request and wait for the production error callback. */
    fail: async (errorThrown: string, jqXhr: unknown = {}) => {
      const { resolve, reject } = takeLastPending();
      const error = jqXhr as RequestError;
      if (error.responseJSON !== undefined || error.status !== undefined) {
        const status =
          error.status !== undefined && error.status >= 400
            ? error.status
            : 400;
        const body =
          error.responseJSON !== undefined
            ? JSON.stringify(error.responseJSON)
            : null;
        resolve(
          new Response(body, {
            status,
            statusText: error.statusText ?? errorThrown,
            headers:
              error.responseJSON !== undefined
                ? { "Content-Type": "application/json" }
                : undefined,
          }),
        );
      } else {
        reject(new Error(errorThrown));
      }
      await flushTransport();
    },
  };
}
