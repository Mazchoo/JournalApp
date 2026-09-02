/**
 * Vanilla stand-in for Bootstrap 4's `data-ride="carousel"` / `data-slide` behaviour.
 * The home page is the only template that uses a carousel.
 */

import { AUTO_CYCLE_MS } from '../display-config';

/** Advance the carousel by `delta` items, wrapping at both ends. */
function go(root: HTMLElement, delta: number): void {
  const items = Array.from(root.querySelectorAll('.carousel-item'));
  if (items.length === 0) return;
  const current = items.findIndex((item) => item.classList.contains('active'));
  const from = current === -1 ? 0 : current;
  items[from]!.classList.remove('active');
  items[(from + delta + items.length) % items.length]!.classList.add('active');
}

/** Wire prev/next controls and optional auto-cycle on `#carousel`. */
export function initializeCarousel(): void {
  const root = document.getElementById('carousel');
  if (root === null || root.dataset.journalCarousel === '1') return;
  root.dataset.journalCarousel = '1';

  root.querySelector('[data-slide="prev"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    go(root, -1);
  });
  root.querySelector('[data-slide="next"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    go(root, 1);
  });

  if (root.getAttribute('data-ride') === 'carousel') {
    window.setInterval(() => go(root, 1), AUTO_CYCLE_MS);
  }
}
