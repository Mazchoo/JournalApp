import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  disableSaveButton,
  enableSaveButton,
  generateSaveEntry,
  getSaveData,
  saveEntryToDatabase,
  saveToDatabase,
  type MediaSavePayload,
  type ParagraphSavePayload,
} from "../src/entry/save";
import { stubAjax, type AjaxStub } from "./helpers/ajax";
import {
  CSRF_TOKEN,
  installModalStubs,
  renderDayPage,
  type ModalStubs,
} from "./helpers/dom";
import {
  installFakeTinyMCE,
  seedEditor,
  type FakeTinyMCE,
} from "./helpers/tinymce";

let tinymce: FakeTinyMCE;
let ajax: AjaxStub;
let modals: ModalStubs;

/** Set the `src` attribute of the element with the given id. */
function setSrc(id: string, src: string): void {
  document.getElementById(id)!.setAttribute("src", src);
}

/** Write a file name into the upload label for the given row. */
function setUploadLabel(index: string, fileName: string): void {
  document.getElementById(`upload-label${index}`)!.textContent = fileName;
}

beforeEach(() => {
  renderDayPage({ rows: ["paragraph", "image"] });
  tinymce = installFakeTinyMCE();
  ajax = stubAjax();
  modals = installModalStubs();
});

describe("generateSaveEntry", () => {
  it("collects paragraph text, height and the synthesis flag", () => {
    seedEditor(tinymce, "paragraph0", {
      content: "<p>A day in the life</p>",
      containerHeight: 298,
      synthesisEnabled: false,
    });

    const saveData = generateSaveEntry(
      document.querySelectorAll(".save-content"),
    )!;

    expect(saveData["paragraph0"]).toEqual<ParagraphSavePayload>({
      text: "<p>A day in the life</p>",
      height: 300,
      allow_ai_synthesis: 0,
      entry: "2024-03-15",
    });
  });

  it("defaults the paragraph synthesis flag to enabled", () => {
    seedEditor(tinymce, "paragraph0", { content: "text" });

    const saveData = generateSaveEntry(
      document.querySelectorAll(".save-content"),
    )!;

    expect(
      (saveData["paragraph0"] as ParagraphSavePayload).allow_ai_synthesis,
    ).toBe(1);
  });

  it("collects images that have a source, keyed by the image id", () => {
    seedEditor(tinymce, "paragraph0");
    setSrc("image1", "data:image/png;base64,AAA");
    setUploadLabel("1", "sunrise.png");
    document.getElementById("allow-syn1")!.classList.add("btn-primary");

    const saveData = generateSaveEntry(
      document.querySelectorAll(".save-content"),
    )!;

    expect(saveData["image1"]).toEqual<MediaSavePayload>({
      file_path: "sunrise.png",
      allow_ai_synthesis: 1,
      entry: "2024-03-15",
    });
  });

  it("skips media elements that have no source", () => {
    seedEditor(tinymce, "paragraph0");

    const saveData = generateSaveEntry(
      document.querySelectorAll(".save-content"),
    )!;

    expect(Object.keys(saveData)).toEqual(["paragraph0"]);
  });

  it("reads the synthesis flag from the Generate button state", () => {
    seedEditor(tinymce, "paragraph0");
    setSrc("image1", "data:image/png;base64,AAA");
    setUploadLabel("1", "sunrise.png");

    const saveData = generateSaveEntry(
      document.querySelectorAll(".save-content"),
    )!;

    expect((saveData["image1"] as MediaSavePayload).allow_ai_synthesis).toBe(0);
  });

  it("keys video content under a video id, whichever element carries it", () => {
    renderDayPage({ rows: ["video"] });
    tinymce = installFakeTinyMCE();
    setSrc("image0", "data:video/mp4;base64,AAA");
    setUploadLabel("0", "holiday.mp4");
    document.getElementById("allow-syn0")!.classList.add("btn-primary");

    const saveData = generateSaveEntry(
      document.querySelectorAll(".save-content"),
    )!;

    expect(saveData["video0"]).toEqual<MediaSavePayload>({
      file_path: "holiday.mp4",
      allow_ai_synthesis: 1,
      entry: "2024-03-15",
    });
    expect(saveData["image0"]).toBeUndefined();
  });

  it("returns undefined when there is no content to walk", () => {
    expect(generateSaveEntry(null)).toBeUndefined();
  });

  it("returns an empty payload for an empty selection", () => {
    renderDayPage({ rows: [] });

    expect(getSaveData()).toEqual({});
  });
});

describe("saveEntryToDatabase", () => {
  it("posts the content, the CSRF token and the date slug", () => {
    saveEntryToDatabase({
      paragraph0: {
        text: "x",
        height: 220,
        allow_ai_synthesis: 1,
        entry: "2024-03-15",
      },
    });

    const settings = ajax.last();
    expect(settings.type).toBe("POST");
    expect(settings.url).toBe("/save-entry/");
    expect(settings.data).toEqual({
      content: {
        paragraph0: {
          text: "x",
          height: 220,
          allow_ai_synthesis: 1,
          entry: "2024-03-15",
        },
      },
      csrfmiddlewaretoken: CSRF_TOKEN,
      name: "2024-03-15",
    });
  });

  it("does nothing when handed a null payload", () => {
    saveEntryToDatabase(null);

    expect(ajax.calls).toHaveLength(0);
  });

  it("reports success, enables deleting and rearms the image zoom", async () => {
    saveEntryToDatabase({});
    await ajax.succeed({ success: "Saved 2 items" });

    expect(modals.showMessageSimpleModal).toHaveBeenCalledWith(
      "Save Success",
      "Saved 2 items",
    );
    expect(
      document.getElementById("btn-delete")!.classList.contains("btn-danger"),
    ).toBe(true);
    expect(
      document.getElementById("spinner-save")!.classList.contains("invisible"),
    ).toBe(true);
  });

  it("reports server-side validation errors", async () => {
    saveEntryToDatabase({});
    await ajax.succeed({ error: "Bad image" });

    expect(modals.showMessageSimpleModal).toHaveBeenCalledWith(
      "Save Errors",
      "Bad image",
    );
  });

  it("reports transport errors and still hides the spinner", async () => {
    document.getElementById("spinner-save")!.classList.remove("invisible");
    saveEntryToDatabase({});
    await ajax.fail("Internal Server Error");

    expect(modals.showMessageSimpleModal).toHaveBeenCalledWith(
      "Unknown Error",
      "Internal Server Error",
    );
    expect(
      document.getElementById("spinner-save")!.classList.contains("invisible"),
    ).toBe(true);
  });
});

describe("saveToDatabase", () => {
  beforeEach(() => {
    seedEditor(tinymce, "paragraph0", { content: "text" });
  });

  it("does nothing while the save button is disabled", () => {
    saveToDatabase();

    expect(ajax.calls).toHaveLength(0);
  });

  it("does nothing while a save is already running", () => {
    enableSaveButton();
    document.getElementById("spinner-save")!.classList.remove("invisible");

    saveToDatabase();

    expect(ajax.calls).toHaveLength(0);
  });

  it("disables the button, shows the spinner, scrolls down and posts", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    enableSaveButton();

    saveToDatabase();

    expect(
      document.getElementById("btn-save")!.classList.contains("disabled"),
    ).toBe(true);
    expect(
      document.getElementById("spinner-save")!.classList.contains("invisible"),
    ).toBe(false);
    expect(scrollTo).toHaveBeenCalledWith(0, document.body.scrollHeight);
    expect(ajax.calls).toHaveLength(1);
    scrollTo.mockRestore();
  });
});

describe("save button state", () => {
  it("enableSaveButton makes both the button and the nav link actionable", () => {
    enableSaveButton();

    const button = document.getElementById("btn-save")!;
    expect(button.classList.contains("disabled")).toBe(false);
    expect(button.classList.contains("btn-outline-success")).toBe(false);
    expect(button.classList.contains("btn-success")).toBe(true);
    expect(
      document
        .getElementById("save-nav-button")!
        .classList.contains("disabled"),
    ).toBe(false);
  });

  it("disableSaveButton reverses it", () => {
    enableSaveButton();
    disableSaveButton();

    const button = document.getElementById("btn-save")!;
    expect(button.classList.contains("btn-success")).toBe(false);
    expect(button.classList.contains("disabled")).toBe(true);
    expect(button.classList.contains("btn-outline-success")).toBe(true);
    expect(
      document
        .getElementById("save-nav-button")!
        .classList.contains("disabled"),
    ).toBe(true);
  });
});
