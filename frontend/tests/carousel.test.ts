import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUTO_CYCLE_MS, CAROUSEL_SLIDE_MS } from "../src/display-config";
import { initializeCarousel } from "../src/components/carousel";

/** Render a two-slide carousel matching templates/home.html. */
function renderCarousel(auto = false): void {
  document.body.innerHTML = `
    <div id="carousel" class="carousel slide"${auto ? ' data-ride="carousel"' : ""}>
      <div class="carousel-inner">
        <div class="carousel-item active" id="slide-a"></div>
        <div class="carousel-item" id="slide-b"></div>
      </div>
      <a href="#carousel" data-slide="prev" id="prev">prev</a>
      <a href="#carousel" data-slide="next" id="next">next</a>
    </div>`;
}

/** Let the Bootstrap slide classes finish. */
function finishSlide(): void {
  vi.advanceTimersByTime(CAROUSEL_SLIDE_MS);
}

describe("initializeCarousel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("advances on next and wraps on prev", () => {
    renderCarousel();
    initializeCarousel();

    document.getElementById("next")!.click();
    finishSlide();
    expect(
      document.getElementById("slide-a")!.classList.contains("active"),
    ).toBe(false);
    expect(
      document.getElementById("slide-b")!.classList.contains("active"),
    ).toBe(true);

    document.getElementById("next")!.click();
    finishSlide();
    expect(
      document.getElementById("slide-a")!.classList.contains("active"),
    ).toBe(true);

    document.getElementById("prev")!.click();
    finishSlide();
    expect(
      document.getElementById("slide-b")!.classList.contains("active"),
    ).toBe(true);
  });

  it("uses Bootstrap slide classes while transitioning forward", () => {
    renderCarousel();
    initializeCarousel();

    document.getElementById("next")!.click();

    expect(
      document
        .getElementById("slide-b")!
        .classList.contains("carousel-item-next"),
    ).toBe(true);
    expect(
      document
        .getElementById("slide-a")!
        .classList.contains("carousel-item-left"),
    ).toBe(true);
    expect(
      document
        .getElementById("slide-b")!
        .classList.contains("carousel-item-left"),
    ).toBe(true);
    expect(
      document.getElementById("slide-a")!.classList.contains("active"),
    ).toBe(true);

    finishSlide();

    expect(document.getElementById("slide-b")!.className).toBe(
      "carousel-item active",
    );
    expect(document.getElementById("slide-a")!.className).toBe("carousel-item");
  });

  it("auto-cycles toward the previous slide (incoming from the left)", () => {
    document.body.innerHTML = `
      <div id="carousel" class="carousel slide" data-ride="carousel">
        <div class="carousel-inner">
          <div class="carousel-item" id="slide-a"></div>
          <div class="carousel-item" id="slide-b"></div>
          <div class="carousel-item active" id="slide-c"></div>
        </div>
      </div>`;
    initializeCarousel();

    vi.advanceTimersByTime(AUTO_CYCLE_MS);

    expect(
      document
        .getElementById("slide-b")!
        .classList.contains("carousel-item-prev"),
    ).toBe(true);
    expect(
      document
        .getElementById("slide-c")!
        .classList.contains("carousel-item-right"),
    ).toBe(true);

    finishSlide();

    expect(
      document.getElementById("slide-b")!.classList.contains("active"),
    ).toBe(true);
    expect(
      document.getElementById("slide-c")!.classList.contains("active"),
    ).toBe(false);
  });

  it("is a no-op when the page has no carousel", () => {
    document.body.innerHTML = "<div></div>";
    expect(() => initializeCarousel()).not.toThrow();
  });
});
