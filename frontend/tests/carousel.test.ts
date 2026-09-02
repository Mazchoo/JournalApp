import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTO_CYCLE_MS } from '../src/display-config';
import { initializeCarousel } from '../src/runtime/carousel';

/** Render a two-slide carousel matching templates/home.html. */
function renderCarousel(auto = false): void {
  document.body.innerHTML = `
    <div id="carousel" class="carousel slide"${auto ? ' data-ride="carousel"' : ''}>
      <div class="carousel-inner">
        <div class="carousel-item active" id="slide-a"></div>
        <div class="carousel-item" id="slide-b"></div>
      </div>
      <a href="#carousel" data-slide="prev" id="prev">prev</a>
      <a href="#carousel" data-slide="next" id="next">next</a>
    </div>`;
}

describe('initializeCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('advances on next and wraps on prev', () => {
    renderCarousel();
    initializeCarousel();

    document.getElementById('next')!.click();
    expect(document.getElementById('slide-a')!.classList.contains('active')).toBe(false);
    expect(document.getElementById('slide-b')!.classList.contains('active')).toBe(true);

    document.getElementById('next')!.click();
    expect(document.getElementById('slide-a')!.classList.contains('active')).toBe(true);

    document.getElementById('prev')!.click();
    expect(document.getElementById('slide-b')!.classList.contains('active')).toBe(true);
  });

  it('auto-cycles when data-ride is set', () => {
    renderCarousel(true);
    initializeCarousel();

    vi.advanceTimersByTime(AUTO_CYCLE_MS);

    expect(document.getElementById('slide-b')!.classList.contains('active')).toBe(true);
  });

  it('is a no-op when the page has no carousel', () => {
    document.body.innerHTML = '<div></div>';
    expect(() => initializeCarousel()).not.toThrow();
  });
});
