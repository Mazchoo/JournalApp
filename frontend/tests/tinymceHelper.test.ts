import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTinyMCE,
  getMCEComponentHeight,
  resetMCE,
} from "../src/tinymce/helper";
import { renderDayPage } from "./helpers/dom";
import {
  installFakeTinyMCE,
  seedEditor,
  toggleButtonApi,
  type FakeTinyMCE,
} from "./helpers/tinymce";

let tinymce: FakeTinyMCE;

beforeEach(() => {
  renderDayPage({ rows: ["paragraph", "image"] });
  tinymce = installFakeTinyMCE();
});

describe("createTinyMCE", () => {
  it("passes the editor configuration the app relies on", () => {
    createTinyMCE("#paragraph0", 260, true);

    const options = tinymce.initOptions[0];
    expect(options["selector"]).toBe("#paragraph0");
    expect(options["height"]).toBe(260);
    expect(options["license_key"]).toBe("gpl");
    expect(options["branding"]).toBe(false);
    expect(options["promotion"]).toBe(false);
    expect(options["browser_spellcheck"]).toBe(true);
    expect(options["deprecation_warnings"]).toBe(false);
    expect(options["toolbar"]).toBe(
      "bold italic | alignleft aligncenter alignright alignjustify | import allowSynthesis",
    );
  });

  it("runs the init callback once the editor reports it is ready", () => {
    const initCallback = vi.fn();

    createTinyMCE("#paragraph0", 220, true, initCallback);

    expect(initCallback).toHaveBeenCalledTimes(1);
  });

  it("registers the Import HTML and Generate toolbar buttons", () => {
    createTinyMCE("#paragraph0", 220, true);

    const editor = tinymce.get("paragraph0")!;
    expect(editor.buttons["import"]!.text).toBe("Import HTML");
    expect(editor.toggleButtons["allowSynthesis"]!.text).toBe("Generate");
  });

  it("seeds synthesisEnabled from the argument during setup", () => {
    createTinyMCE("#paragraph0", 220, false);

    const editor = tinymce.get("paragraph0")!;
    const api = toggleButtonApi();
    editor.toggleButtons["allowSynthesis"]!.onSetup(api);

    expect(api.active).toBe(false);
    expect(editor.synthesisEnabled).toBe(false);
  });

  it("flips synthesisEnabled and enables saving when the Generate button is used", () => {
    createTinyMCE("#paragraph0", 220, true);

    const editor = tinymce.get("paragraph0")!;
    const api = toggleButtonApi();
    editor.toggleButtons["allowSynthesis"]!.onAction(api);

    expect(api.active).toBe(false);
    expect(editor.synthesisEnabled).toBe(false);
    expect(
      document.getElementById("btn-save")!.classList.contains("btn-success"),
    ).toBe(true);
  });

  it("keeps toggling from the value it last stored", () => {
    createTinyMCE("#paragraph0", 220, true);

    const editor = tinymce.get("paragraph0")!;
    const api = toggleButtonApi();
    editor.toggleButtons["allowSynthesis"]!.onAction(api);
    editor.toggleButtons["allowSynthesis"]!.onAction(api);

    expect(editor.synthesisEnabled).toBe(true);
  });

  it("enables the save button when the user types", () => {
    createTinyMCE("#paragraph0", 220, true);

    tinymce.get("paragraph0")!.fire("input");

    expect(
      document.getElementById("btn-save")!.classList.contains("btn-success"),
    ).toBe(true);
  });

  it("logs when the Import HTML button is pressed", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    createTinyMCE("#paragraph0", 220, true);

    tinymce.get("paragraph0")!.buttons["import"]!.onAction();

    expect(log).toHaveBeenCalledWith("TinyMCE button clicked");
    log.mockRestore();
  });
});

describe("getMCEComponentHeight", () => {
  it("adds two pixels to the container height", () => {
    seedEditor(tinymce, "paragraph0", { containerHeight: 418 });

    expect(getMCEComponentHeight("paragraph0")).toBe(420);
  });
});

describe("resetMCE", () => {
  it("recreates the editor at its current height", () => {
    seedEditor(tinymce, "paragraph0", { containerHeight: 318 });
    const row = document.querySelector(".paragraph-entry")!;

    resetMCE(row);

    expect(tinymce.initOptions).toHaveLength(1);
    expect(tinymce.initOptions[0]!["selector"]).toBe("#paragraph0");
    expect(tinymce.initOptions[0]!["height"]).toBe(320);
  });

  it("carries the synthesis flag across the rebuild", () => {
    seedEditor(tinymce, "paragraph0", { synthesisEnabled: false });

    resetMCE(document.querySelector(".paragraph-entry"));

    const api = toggleButtonApi();
    tinymce.get("paragraph0")!.toggleButtons["allowSynthesis"]!.onSetup(api);
    expect(api.active).toBe(false);
  });

  it("defaults the synthesis flag to true when the editor never set one", () => {
    seedEditor(tinymce, "paragraph0");

    resetMCE(document.querySelector(".paragraph-entry"));

    const api = toggleButtonApi();
    tinymce.get("paragraph0")!.toggleButtons["allowSynthesis"]!.onSetup(api);
    expect(api.active).toBe(true);
  });

  it("ignores rows that are not paragraphs", () => {
    resetMCE(document.querySelector(".media-entry"));

    expect(tinymce.initOptions).toHaveLength(0);
  });

  it("ignores a missing row", () => {
    expect(() => resetMCE(undefined)).not.toThrow();
    expect(tinymce.initOptions).toHaveLength(0);
  });
});
