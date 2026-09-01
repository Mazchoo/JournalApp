import { vi, type Mock } from 'vitest';

export type AjaxSettings = JQuery.AjaxSettings & {
  success?: (response: unknown, textStatus?: string, jqXhr?: unknown) => void;
  error?: (jqXhr: unknown, textStatus?: string, errorThrown?: string) => void;
  complete?: (jqXhr: unknown, textStatus?: string) => void;
};

export interface AjaxStub {
  calls: AjaxSettings[];
  mock: Mock;
  last(): AjaxSettings;
  succeed(response: unknown): void;
  fail(errorThrown: string, jqXhr?: unknown): void;
}

/** Replace `$.ajax` so requests can be inspected and answered synchronously. */
export function stubAjax(): AjaxStub {
  const calls: AjaxSettings[] = [];
  const mock = vi.fn((settings: AjaxSettings) => {
    calls.push(settings);
    return undefined;
  });
  (window.jQuery as unknown as { ajax: unknown }).ajax = mock;

  /** Return the most recent `$.ajax` settings, or throw if none exist. */
  const last = (): AjaxSettings => {
    const settings = calls[calls.length - 1];
    if (settings === undefined) throw new Error('No $.ajax call was made.');
    return settings;
  };

  return {
    calls,
    mock: mock as unknown as Mock,
    last,
    /** Invoke the last request's success and complete callbacks. */
    succeed: (response: unknown) => {
      const settings = last();
      settings.success?.(response, 'success', {});
      settings.complete?.({}, 'success');
    },
    /** Invoke the last request's error and complete callbacks. */
    fail: (errorThrown: string, jqXhr: unknown = {}) => {
      const settings = last();
      settings.error?.(jqXhr, 'error', errorThrown);
      settings.complete?.(jqXhr, 'error');
    },
  };
}
