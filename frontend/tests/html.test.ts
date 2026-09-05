import { beforeEach, describe, expect, it, vi } from "vitest";

import { SYNTHESIS_BUTTON_TOOLTIP } from "../src/tooltip-messages";
import {
  importHtmlFromEditor,
  isStandaloneHtmlDocument,
  readHtmlResource,
} from "../src/entry/html";
import { initializeParagraphRow } from "../src/entry/paragraph";
import { enableSaveButton, generateSaveEntry } from "../src/entry/save";
import {
  generateImportedHtmlTemplate,
  HtmlEntry,
} from "../src/components/html-entry";
import { ParagraphEntry } from "../src/components/paragraph-entry";
import { createTinyMCE } from "../src/tinymce/helper";
import { fileNamed, renderDayPage } from "./helpers/dom";
import {
  asSynthesisEditor,
  installFakeTinyMCE,
  seedEditor,
  type FakeTinyMCE,
} from "./helpers/tinymce";

let tinymce: FakeTinyMCE;

const IMPORTED_HTML = `<!DOCTYPE html>
<html>
  <body><h1>Imported</h1></body>
</html>`;

/** Make the next file-input click choose `file`. */
function chooseFileOnClick(file: File): ReturnType<typeof vi.spyOn> {
  return vi
    .spyOn(HTMLInputElement.prototype, "click")
    .mockImplementation(function (this: HTMLInputElement) {
      Object.defineProperty(this, "files", {
        configurable: true,
        value: [file],
      });
      this.dispatchEvent(new Event("change"));
    });
}

/** Wait until the imported-HTML host is in the document. */
function waitForImportedEditor(): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const host = document.querySelector<HTMLElement>(".imported-html-editor");
    if (host === null) throw new Error("imported HTML editor is missing");
    return host;
  });
}

beforeEach(() => {
  renderDayPage({ rows: ["paragraph"] });
  tinymce = installFakeTinyMCE();
});

describe("generateImportedHtmlTemplate", () => {
  it("substitutes every index placeholder", () => {
    const markup = generateImportedHtmlTemplate("7");

    expect(markup).not.toContain("{{ item.index }}");
    expect(markup).toContain('id="imported-generate7"');
    expect(markup).toContain('class="imported-html-frame"');
  });
});

describe("isStandaloneHtmlDocument", () => {
  it("accepts a doctype or an html root element", () => {
    expect(isStandaloneHtmlDocument("<!DOCTYPE html><p>Hi</p>")).toBe(true);
    expect(isStandaloneHtmlDocument("<html lang='en'></html>")).toBe(true);
    expect(isStandaloneHtmlDocument("<p>TinyMCE fragment</p>")).toBe(false);
  });
});

describe("importHtmlFromEditor", () => {
  it("replaces TinyMCE with the chosen HTML and keeps Generate on", async () => {
    createTinyMCE("#paragraph0", 260, true);
    const editor = tinymce.get("paragraph0")!;
    editor.containerHeight = 318;
    const click = chooseFileOnClick(
      fileNamed("page.html", IMPORTED_HTML, "text/html"),
    );

    importHtmlFromEditor(asSynthesisEditor(editor));
    const host = await waitForImportedEditor();
    click.mockRestore();

    expect(editor.removed).toBe(true);
    expect(tinymce.get("paragraph0")).toBeNull();
    expect(host.style.height).toBe("");

    const iframe = host.querySelector<HTMLIFrameElement>(
      ".imported-html-frame",
    )!;
    expect(iframe.srcdoc).toBe(IMPORTED_HTML);

    const generate = document.getElementById("imported-generate0")!;
    expect(generate.textContent!.trim()).toBe("Generate");
    expect(generate.classList.contains("btn")).toBe(true);
    expect(generate.classList.contains("btn-sm")).toBe(true);
    expect(generate.classList.contains("allow-syn")).toBe(true);
    expect(generate.classList.contains("btn-primary")).toBe(true);
    expect(generate.classList.contains("btn-outline-secondary")).toBe(false);
    expect(generate.getAttribute("title")).toBe(SYNTHESIS_BUTTON_TOOLTIP);

    const textarea = document.getElementById(
      "paragraph0",
    ) as HTMLTextAreaElement;
    expect(textarea.style.display).toBe("none");
    expect(textarea.value).toBe(IMPORTED_HTML);
    expect(
      document.getElementById("btn-save")!.classList.contains("btn-success"),
    ).toBe(true);
  });

  it("keeps Generate off when the TinyMCE toggle was off", async () => {
    createTinyMCE("#paragraph0", 220, false);
    const click = chooseFileOnClick(
      fileNamed("note.htm", "<html>Off</html>", "text/html"),
    );

    importHtmlFromEditor(asSynthesisEditor(tinymce.get("paragraph0")!));
    await waitForImportedEditor();
    click.mockRestore();

    const generate = document.getElementById("imported-generate0")!;
    expect(generate.classList.contains("btn-primary")).toBe(false);
    expect(generate.classList.contains("btn-outline-secondary")).toBe(true);
    expect(
      document
        .getElementById("paragraph0")!
        .getAttribute("data-allow-ai-synthesis"),
    ).toBe("0");
  });

  it("does nothing when the file picker is cancelled", () => {
    const click = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});
    seedEditor(tinymce, "paragraph0");

    importHtmlFromEditor(asSynthesisEditor(tinymce.get("paragraph0")!));

    expect(document.querySelector(".imported-html-editor")).toBeNull();
    expect(tinymce.get("paragraph0")).not.toBeNull();
    click.mockRestore();
  });

  it("ignores a non-HTML file", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const click = chooseFileOnClick(fileNamed("notes.txt", "hello"));
    seedEditor(tinymce, "paragraph0");

    importHtmlFromEditor(asSynthesisEditor(tinymce.get("paragraph0")!));

    expect(document.querySelector(".imported-html-editor")).toBeNull();
    expect(log).toHaveBeenCalledWith("Unknown HTML type");
    click.mockRestore();
    log.mockRestore();
  });
});

describe("readHtmlResource", () => {
  it("swaps an existing imported document for a new file", async () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    seedEditor(tinymce, "paragraph0", { containerHeight: 200 });

    readHtmlResource(
      fileNamed("first.html", "<html>First</html>"),
      paragraph,
      true,
    );
    await waitForImportedEditor();

    readHtmlResource(
      fileNamed("second.html", "<html>Second</html>"),
      paragraph,
      false,
    );
    await vi.waitFor(() => {
      expect(
        document.querySelector<HTMLIFrameElement>(".imported-html-frame")!
          .srcdoc,
      ).toBe("<html>Second</html>");
    });

    expect(document.querySelectorAll(".imported-html-editor")).toHaveLength(1);
    expect(
      document
        .getElementById("imported-generate0")!
        .classList.contains("btn-outline-secondary"),
    ).toBe(true);
  });
});

describe("imported HTML layout", () => {
  it("shows the file in an iframe and grows the frame to the document", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    HtmlEntry.replace(paragraph, IMPORTED_HTML, true, () => {});

    const iframe = document.querySelector<HTMLIFrameElement>(
      ".imported-html-frame",
    )!;
    Object.defineProperty(
      iframe.contentDocument!.documentElement,
      "scrollHeight",
      {
        configurable: true,
        value: 480,
      },
    );
    iframe.dispatchEvent(new Event("load"));

    expect(iframe.srcdoc).toBe(IMPORTED_HTML);
    expect(iframe.style.height).toBe("480px");
    expect(iframe.getAttribute("scrolling")).toBe("no");
    expect(iframe.contentDocument!.documentElement.style.overflowX).toBe(
      "hidden",
    );
  });
});

describe("imported HTML Generate button", () => {
  it("toggles synthesis state and enables saving", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    HtmlEntry.replace(paragraph, IMPORTED_HTML, true, enableSaveButton);

    document.getElementById("imported-generate0")!.click();

    expect(
      document
        .getElementById("imported-generate0")!
        .classList.contains("btn-outline-secondary"),
    ).toBe(true);
    expect(
      document
        .getElementById("paragraph0")!
        .getAttribute("data-allow-ai-synthesis"),
    ).toBe("0");
    expect(
      document.getElementById("btn-save")!.classList.contains("btn-success"),
    ).toBe(true);
  });
});

describe("serialize imported HTML", () => {
  it("reads the file contents, host height and Generate state", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    HtmlEntry.replace(paragraph, IMPORTED_HTML, false, () => {});
    Object.defineProperty(
      document.querySelector(".imported-html-editor")!,
      "clientHeight",
      { configurable: true, value: 318 },
    );

    const saveData = generateSaveEntry(
      document.querySelectorAll(".save-content"),
    )!;

    expect(saveData["paragraph0"]).toEqual({
      text: IMPORTED_HTML,
      height: 320,
      allow_ai_synthesis: 0,
      entry: "2024-03-15",
    });
  });
});

describe("initializeParagraphRow", () => {
  it("shows imported HTML for a standalone document instead of TinyMCE", () => {
    const textarea = document.getElementById(
      "paragraph0",
    ) as HTMLTextAreaElement;
    textarea.value = IMPORTED_HTML;
    textarea.setAttribute("data-allow-ai-synthesis", "0");

    initializeParagraphRow(ParagraphEntry.fromIndex("0")!);

    expect(tinymce.initOptions).toHaveLength(0);
    const host = document.querySelector<HTMLElement>(".imported-html-editor")!;
    expect(host.style.height).toBe("");
    expect(
      document
        .getElementById("imported-generate0")!
        .classList.contains("btn-outline-secondary"),
    ).toBe(true);
  });

  it("still creates TinyMCE for a fragment", () => {
    (document.getElementById("paragraph0") as HTMLTextAreaElement).value =
      "<p>Hello</p>";

    initializeParagraphRow(ParagraphEntry.fromIndex("0")!);

    expect(tinymce.initOptions).toHaveLength(1);
    expect(document.querySelector(".imported-html-editor")).toBeNull();
  });
});
