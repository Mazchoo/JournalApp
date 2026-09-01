import { vi, type Mock } from 'vitest';

import { setRequestTransport } from '../../src/make-request';
import type { RequestError, TransportSettings } from '../../src/request-interface';

export type AjaxSettings = TransportSettings;

export interface AjaxStub {
  calls: AjaxSettings[];
  mock: Mock;
  last(): AjaxSettings;
  succeed(response: unknown): void;
  fail(errorThrown: string, jqXhr?: unknown): void;
}

/** Replace the request transport so requests can be inspected and answered synchronously. */
export function stubAjax(): AjaxStub {
  const calls: AjaxSettings[] = [];
  const mock = vi.fn((settings: AjaxSettings) => {
    calls.push(settings);
  });
  setRequestTransport(mock as (settings: TransportSettings) => void);

  /** Return the most recent request settings, or throw if none exist. */
  const last = (): AjaxSettings => {
    const settings = calls[calls.length - 1];
    if (settings === undefined) throw new Error('No request was made.');
    return settings;
  };

  return {
    calls,
    mock: mock as unknown as Mock,
    last,
    /** Invoke the last request's success and complete callbacks. */
    succeed: (response: unknown) => {
      const settings = last();
      settings.success?.(response);
      settings.complete?.();
    },
    /** Invoke the last request's error and complete callbacks. */
    fail: (errorThrown: string, jqXhr: unknown = {}) => {
      const settings = last();
      settings.error?.(jqXhr as RequestError, 'error', errorThrown);
      settings.complete?.();
    },
  };
}
