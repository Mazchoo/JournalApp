/**
 * `window.location` is unforgeable, so it cannot be stubbed in jsdom. Routing the two
 * navigations through this module keeps them observable from the tests without changing what
 * the browser does.
 */

export function replaceLocation(url: string): void {
  window.location.replace(url);
}

export function reloadPage(): void {
  window.location.reload();
}
