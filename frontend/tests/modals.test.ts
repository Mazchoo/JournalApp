import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bindModalBehaviors,
  hideModal,
  showCallbackModal,
  showDateCallbackModal,
  showMessageSimpleModal,
  showModal,
} from "../src/runtime/modals";

const modalsDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../templates/Modals",
);

/** Render the Django modal templates the page includes. */
function renderModals(): void {
  document.body.innerHTML = [
    "simpleModal.html",
    "callbackModal.html",
    "dateModal.html",
    "videoModal.html",
  ]
    .map((name) => readFileSync(resolve(modalsDir, name), "utf8"))
    .join("\n");
}

/** Fire a bubbling click the same way a user click reaches the document listener. */
function click(element: Element): void {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("showModal / hideModal", () => {
  beforeEach(() => {
    renderModals();
    bindModalBehaviors();
  });

  it("adds the show class and a backdrop", () => {
    showModal("simple-modal");

    expect(
      document.getElementById("simple-modal")!.classList.contains("show"),
    ).toBe(true);
    expect(document.querySelector(".modal-backdrop")).not.toBeNull();
    expect(document.body.classList.contains("modal-open")).toBe(true);
  });

  it("hides the modal and removes the backdrop", () => {
    showModal("simple-modal");
    hideModal("simple-modal");

    expect(
      document.getElementById("simple-modal")!.classList.contains("show"),
    ).toBe(false);
    expect(document.querySelector(".modal-backdrop")).toBeNull();
  });

  it("closes when a data-dismiss control is clicked", () => {
    showModal("simple-modal");

    document.getElementById("simple-modal-close")!.click();

    expect(
      document.getElementById("simple-modal")!.classList.contains("show"),
    ).toBe(false);
  });

  it("closes when the × inside the dismiss control is clicked", () => {
    showModal("simple-modal");

    document
      .querySelector("#simple-modal-close [aria-hidden='true']")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(
      document.getElementById("simple-modal")!.classList.contains("show"),
    ).toBe(false);
  });

  it("closes when the dimmed overlay around the card is clicked", () => {
    showModal("simple-modal");

    click(document.querySelector("#simple-modal .modal-dialog")!);

    expect(
      document.getElementById("simple-modal")!.classList.contains("show"),
    ).toBe(false);
  });

  it("closes when the .modal shell is clicked", () => {
    showModal("simple-modal");

    click(document.getElementById("simple-modal")!);

    expect(
      document.getElementById("simple-modal")!.classList.contains("show"),
    ).toBe(false);
  });

  it("stays open when the card itself is clicked", () => {
    showModal("simple-modal");

    click(document.querySelector("#simple-modal .modal-content")!);

    expect(
      document.getElementById("simple-modal")!.classList.contains("show"),
    ).toBe(true);
  });

  it("stays open when copy inside the card is clicked", () => {
    showModal("simple-modal");

    click(document.getElementById("simple-modal-title")!);

    expect(
      document.getElementById("simple-modal")!.classList.contains("show"),
    ).toBe(true);
  });

  it("closes when the backdrop is clicked", () => {
    showModal("simple-modal");

    click(document.querySelector(".modal-backdrop")!);

    expect(
      document.getElementById("simple-modal")!.classList.contains("show"),
    ).toBe(false);
  });

  it("stays open when the same click that opened it bubbles to document", () => {
    const opener = document.createElement("button");
    opener.type = "button";
    document.body.appendChild(opener);
    opener.addEventListener("click", () => showModal("simple-modal"));

    opener.click();

    expect(
      document.getElementById("simple-modal")!.classList.contains("show"),
    ).toBe(true);
  });
});

describe("showMessageSimpleModal", () => {
  beforeEach(() => {
    renderModals();
  });

  it("fills the title and body and shows the modal", () => {
    showMessageSimpleModal("Saved", "<b>ok</b>");

    expect(document.getElementById("simple-modal-title")!.innerText).toBe(
      "Saved",
    );
    expect(document.getElementById("simple-modal-body")!.innerHTML).toBe(
      "<b>ok</b>",
    );
    expect(
      document.getElementById("simple-modal")!.classList.contains("show"),
    ).toBe(true);
  });
});

describe("showCallbackModal", () => {
  beforeEach(() => {
    renderModals();
    bindModalBehaviors();
  });

  it("fills the copy and runs the callback on confirm", () => {
    const callback = vi.fn();

    showCallbackModal("Sure?", "Really delete?", "Delete", callback);
    document.getElementById("callback-modal-action")!.click();

    expect(document.getElementById("callback-modal-title")!.innerText).toBe(
      "Sure?",
    );
    expect(document.getElementById("callback-modal-body")!.innerText).toBe(
      "Really delete?",
    );
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe("showDateCallbackModal", () => {
  beforeEach(() => {
    renderModals();
  });

  it("fills the copy and shows the date modal", () => {
    showDateCallbackModal("Move", "Where to?", "Confirm", () => {});

    expect(document.getElementById("date-modal-title")!.innerText).toBe("Move");
    expect(document.getElementById("date-modal-action")!.innerText).toBe(
      "Confirm",
    );
    expect(
      document.getElementById("date-modal")!.classList.contains("show"),
    ).toBe(true);
  });
});

describe("video modal cleanup", () => {
  beforeEach(() => {
    renderModals();
    bindModalBehaviors();
  });

  it("stops playback when the video modal hides", () => {
    const video = document.getElementById("video-preview") as HTMLVideoElement;
    const pause = vi.spyOn(video, "pause").mockImplementation(() => {});
    showModal("video-modal");
    hideModal("video-modal");

    expect(pause).toHaveBeenCalled();
    expect(video.getAttribute("src")).toBe("");
  });
});
