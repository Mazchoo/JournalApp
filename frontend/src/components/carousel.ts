/**
 * Vanilla stand-in for Bootstrap 4's `data-ride="carousel"` / `data-slide` behaviour.
 * The home page is the only template that uses a carousel.
 *
 * Slides by toggling the same classes Bootstrap CSS already animates
 * (`.carousel-item-next` / `-prev` / `-left` / `-right`).
 */

import { AUTO_CYCLE_MS, CAROUSEL_SLIDE_MS } from "../display-config";

/** Advance the carousel by `delta` items, wrapping at both ends. */
function go(root: HTMLElement, delta: number): void {
  if (root.dataset.sliding === "1") return;

  const items = Array.from(root.querySelectorAll(".carousel-item"));
  if (items.length === 0) {
    console.error("carousel: #carousel has no .carousel-item elements");
    return;
  }

  const current = items.findIndex((item) => item.classList.contains("active"));
  const from = current === -1 ? 0 : current;
  const to = (from + delta + items.length) % items.length;
  if (from === to) return;

  const outgoing = items[from]!;
  const incoming = items[to]!;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    outgoing.classList.remove("active");
    incoming.classList.add("active");
    return;
  }

  const forward = delta > 0;
  const edgeClass = forward ? "carousel-item-next" : "carousel-item-prev";
  const directionClass = forward ? "carousel-item-left" : "carousel-item-right";

  incoming.classList.add(edgeClass);
  void incoming.offsetWidth;
  outgoing.classList.add(directionClass);
  incoming.classList.add(directionClass);
  root.dataset.sliding = "1";

  window.setTimeout(() => {
    outgoing.classList.remove("active", directionClass);
    incoming.classList.remove(edgeClass, directionClass);
    incoming.classList.add("active");
    delete root.dataset.sliding;
  }, CAROUSEL_SLIDE_MS);
}

/** Wire prev/next controls and optional auto-cycle on `#carousel`. */
export function initializeCarousel(): void {
  const root = document.getElementById("carousel");
  if (root === null || root.dataset.journalCarousel === "1") return;
  root.dataset.journalCarousel = "1";

  root
    .querySelector('[data-slide="prev"]')
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      go(root, -1);
    });
  root
    .querySelector('[data-slide="next"]')
    ?.addEventListener("click", (event) => {
      event.preventDefault();
      go(root, 1);
    });

  if (root.getAttribute("data-ride") === "carousel") {
    window.setInterval(() => go(root, -1), AUTO_CYCLE_MS);
  }
}
