import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaEntry } from "../src/components/media-entry";
import {
  forgetMeshView,
  markMeshFrameDirty,
  setMeshCamera,
} from "../src/entry/media/mesh";
import {
  disableSaveButton,
  enableSaveButton,
  generateSaveEntry,
  getSaveData,
  saveEntryToDatabase,
  saveToDatabase,
  type CameraSavePayload,
  type ImageSavePayload,
  type MeshSavePayload,
  type ParagraphSavePayload,
  type VideoSavePayload,
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
  forgetMeshView("0");
  forgetMeshView("1");
  tinymce = installFakeTinyMCE();
  ajax = stubAjax();
  modals = installModalStubs();
});

describe("generateSaveEntry", () => {
  it("collects paragraph text, height and the synthesis flag", async () => {
    seedEditor(tinymce, "paragraph0", {
      content: "<p>A day in the life</p>",
      containerHeight: 298,
      synthesisEnabled: false,
    });

    const saveData = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;

    expect(saveData["paragraph0"]).toEqual<ParagraphSavePayload>({
      text: "<p>A day in the life</p>",
      height: 300,
      allow_ai_synthesis: 0,
      entry: "2024-03-15",
    });
  });

  it("defaults the paragraph synthesis flag to enabled", async () => {
    seedEditor(tinymce, "paragraph0", { content: "text" });

    const saveData = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;

    expect(
      (saveData["paragraph0"] as ParagraphSavePayload).allow_ai_synthesis,
    ).toBe(1);
  });

  it("collects images that have a source, keyed by the image id", async () => {
    seedEditor(tinymce, "paragraph0");
    setSrc("image1", "data:image/png;base64,AAA");
    setUploadLabel("1", "sunrise.png");
    document.getElementById("allow-syn1")!.classList.add("btn-primary");

    const saveData = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;

    expect(saveData["image1"]).toEqual<ImageSavePayload>({
      file_path: "sunrise.png",
      allow_ai_synthesis: 1,
      entry: "2024-03-15",
    });
  });

  it("skips media elements that have no source", async () => {
    seedEditor(tinymce, "paragraph0");

    const saveData = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;

    expect(Object.keys(saveData)).toEqual(["paragraph0"]);
  });

  it("reads the synthesis flag from the Generate button state", async () => {
    seedEditor(tinymce, "paragraph0");
    setSrc("image1", "data:image/png;base64,AAA");
    setUploadLabel("1", "sunrise.png");

    const saveData = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;

    expect((saveData["image1"] as ImageSavePayload).allow_ai_synthesis).toBe(0);
  });

  it("keys video content under a video id, whichever element carries it", async () => {
    renderDayPage({ rows: ["video"] });
    tinymce = installFakeTinyMCE();
    setSrc("image0", "data:video/mp4;base64,AAA");
    setUploadLabel("0", "holiday.mp4");
    document.getElementById("allow-syn0")!.classList.add("btn-primary");

    const saveData = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;

    expect(saveData["video0"]).toEqual<VideoSavePayload>({
      file_path: "holiday.mp4",
      allow_ai_synthesis: 1,
      entry: "2024-03-15",
    });
    expect(saveData["image0"]).toBeUndefined();
  });

  it("keys mesh content under a mesh id with the frame JPEG and camera", async () => {
    seedEditor(tinymce, "paragraph0");
    const camera: CameraSavePayload = {
      right: [0, 1, 0],
      up: [0, 0, 1],
      forward: [-1, 0, 0],
      radius: 5,
      panX: 1.25,
      panY: -0.5,
    };
    const media = MediaEntry.fromIndex("1")!;
    MediaEntry.showCanvas(media);
    setMeshCamera(media.index, camera);
    markMeshFrameDirty(media.index);
    setUploadLabel("1", "scan.glb");
    vi.spyOn(media.canvas!, "toBlob").mockImplementation((cb) => {
      cb(
        new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }),
      );
    });

    const saveData = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;

    expect(saveData["mesh1"]).toEqual<MeshSavePayload>({
      file_path: "scan.glb",
      frame_image: expect.stringMatching(/^data:image\/jpeg;base64,/) as string,
      camera,
      entry: "2024-03-15",
    });
    expect(saveData["image1"]).toBeUndefined();
  });

  it("omits the frame JPEG when the mesh view has not changed", async () => {
    seedEditor(tinymce, "paragraph0");
    const camera: CameraSavePayload = {
      right: [1, 0, 0],
      up: [0, 1, 0],
      forward: [0, 0, -1],
      radius: 3,
      panX: 0,
      panY: 0,
    };
    const media = MediaEntry.fromIndex("1")!;
    setMeshCamera(media.index, camera);
    setUploadLabel("1", "scan.glb");
    document.getElementById("image1")!.setAttribute("data-mesh-id", "9");

    const saveData = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;

    expect(saveData["mesh1"]).toEqual<MeshSavePayload>({
      file_path: "scan.glb",
      camera,
      entry: "2024-03-15",
    });
    expect(saveData["mesh1"]?.frame_image).toBeUndefined();
  });

  it("omits the frame JPEG after a successful save until the view changes again", async () => {
    seedEditor(tinymce, "paragraph0");
    const camera: CameraSavePayload = {
      right: [1, 0, 0],
      up: [0, 1, 0],
      forward: [0, 0, -1],
      radius: 3,
      panX: 0,
      panY: 0,
    };
    const media = MediaEntry.fromIndex("1")!;
    MediaEntry.showCanvas(media);
    setMeshCamera(media.index, camera);
    markMeshFrameDirty(media.index);
    setUploadLabel("1", "scan.glb");
    vi.spyOn(media.canvas!, "toBlob").mockImplementation((cb) => {
      cb(
        new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }),
      );
    });

    const firstSave = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;
    expect(firstSave["mesh1"]?.frame_image).toMatch(
      /^data:image\/jpeg;base64,/,
    );

    saveEntryToDatabase(firstSave);
    await ajax.succeed({ success: "Saved" });

    const secondSave = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;
    expect(secondSave["mesh1"]).toEqual<MeshSavePayload>({
      file_path: "scan.glb",
      camera,
      entry: "2024-03-15",
    });
    expect(secondSave["mesh1"]?.frame_image).toBeUndefined();
  });

  it("skips a revealed mesh that has no camera", async () => {
    seedEditor(tinymce, "paragraph0");
    const media = MediaEntry.fromIndex("1")!;
    MediaEntry.showCanvas(media);
    setUploadLabel("1", "scan.glb");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const saveData = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;

    expect(saveData["mesh1"]).toBeUndefined();
    consoleError.mockRestore();
  });

  it("skips a mesh when the canvas cannot encode a JPEG", async () => {
    seedEditor(tinymce, "paragraph0");
    const media = MediaEntry.fromIndex("1")!;
    MediaEntry.showCanvas(media);
    setMeshCamera(media.index, {
      right: [1, 0, 0],
      up: [0, 1, 0],
      forward: [0, 0, -1],
      radius: 3,
      panX: 0,
      panY: 0,
    });
    markMeshFrameDirty(media.index);
    setUploadLabel("1", "scan.glb");
    vi.spyOn(media.canvas!, "toBlob").mockImplementation((cb) => {
      cb(null);
    });

    const saveData = (await generateSaveEntry(
      document.querySelectorAll(".save-content"),
    ))!;

    expect(saveData["mesh1"]).toBeUndefined();
  });

  it("returns undefined when there is no content to walk", async () => {
    expect(await generateSaveEntry(null)).toBeUndefined();
  });

  it("returns an empty payload for an empty selection", async () => {
    renderDayPage({ rows: [] });

    expect(await getSaveData()).toEqual({});
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

  it("reports success, enables deleting and hides the spinner", async () => {
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

  it("disables the button, shows the spinner, scrolls down and posts", async () => {
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
    await vi.waitFor(() => expect(ajax.calls).toHaveLength(1));
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
