import { beforeEach, describe, expect, it, vi } from "vitest";

import { PARAGRAPH_EDITOR_HEIGHT_PX } from "../src/display-config";
import {
  RAW_HTML_EDITOR_TOOLTIP,
  SYNTHESIS_BUTTON_TOOLTIP,
} from "../src/tooltip-messages";
import { importHtmlFromEditor, readHtmlResource } from "../src/entry/html";
import { initializeParagraphRow } from "../src/entry/paragraph";
import { enableSaveButton, generateSaveEntry } from "../src/entry/save";
import { HtmlEntry } from "../src/components/html-entry";
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

const RAW_HTML = `<!DOCTYPE html>
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

/** Visible raw-html-editor chrome from the paragraph template. */
function rawHtmlEditor(): HTMLElement {
  const host = document.querySelector<HTMLElement>(".raw-html-editor");
  if (host === null || host.classList.contains("d-none")) {
    throw new Error("raw-html-editor is missing");
  }
  return host;
}

/** Wait until the raw-html-editor host is showing. */
function waitForRawHtmlEditor(): Promise<HTMLElement> {
  return vi.waitFor(() => rawHtmlEditor());
}

beforeEach(() => {
  renderDayPage({ rows: ["paragraph"] });
  tinymce = installFakeTinyMCE();
});

describe("HtmlEntry.isRawHtml", () => {
  it("reads the raw-html marker on the textarea", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;

    expect(HtmlEntry.isRawHtml(paragraph)).toBe(false);

    paragraph.textarea!.setAttribute("data-raw-html", "1");
    expect(HtmlEntry.isRawHtml(paragraph)).toBe(true);
  });

  it("marks the textarea when replacing TinyMCE", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    expect(HtmlEntry.isPresent(paragraph.row)).toBe(false);

    HtmlEntry.replace(paragraph, RAW_HTML, true, () => {});

    expect(paragraph.textarea!.getAttribute("data-raw-html")).toBe("1");
    expect(HtmlEntry.isRawHtml(paragraph)).toBe(true);
    expect(HtmlEntry.isPresent(paragraph.row)).toBe(true);
  });
});

describe("importHtmlFromEditor", () => {
  it("replaces TinyMCE with the chosen HTML and keeps Generate on", async () => {
    createTinyMCE("#paragraph0", 260, true);
    const editor = tinymce.get("paragraph0")!;
    editor.containerHeight = 318;
    const click = chooseFileOnClick(
      fileNamed("page.html", RAW_HTML, "text/html"),
    );

    importHtmlFromEditor(asSynthesisEditor(editor));
    const host = await waitForRawHtmlEditor();
    click.mockRestore();

    expect(editor.removed).toBe(true);
    expect(tinymce.get("paragraph0")).toBeNull();
    expect(host.style.height).toBe("");
    expect(host.getAttribute("title")).toBe(RAW_HTML_EDITOR_TOOLTIP);

    const iframe = host.querySelector<HTMLIFrameElement>(".raw-html-frame")!;
    expect(iframe.srcdoc).toBe(RAW_HTML);

    const generate = document.getElementById("raw-html-generate0")!;
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
    expect(textarea.value).toBe(RAW_HTML);
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
    await waitForRawHtmlEditor();
    click.mockRestore();

    const generate = document.getElementById("raw-html-generate0")!;
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

    expect(
      document.querySelector(".raw-html-editor")!.classList.contains("d-none"),
    ).toBe(true);
    expect(tinymce.get("paragraph0")).not.toBeNull();
    click.mockRestore();
  });

  it("ignores a non-HTML file", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const click = chooseFileOnClick(fileNamed("notes.txt", "hello"));
    seedEditor(tinymce, "paragraph0");

    importHtmlFromEditor(asSynthesisEditor(tinymce.get("paragraph0")!));

    expect(
      document.querySelector(".raw-html-editor")!.classList.contains("d-none"),
    ).toBe(true);
    expect(log).toHaveBeenCalledWith("Unknown HTML type");
    click.mockRestore();
    log.mockRestore();
  });
});

describe("readHtmlResource", () => {
  it("swaps an existing document for a new file", async () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    seedEditor(tinymce, "paragraph0", { containerHeight: 200 });

    readHtmlResource(
      fileNamed("first.html", "<html>First</html>"),
      paragraph,
      true,
    );
    await waitForRawHtmlEditor();

    readHtmlResource(
      fileNamed("second.html", "<html>Second</html>"),
      paragraph,
      false,
    );
    await vi.waitFor(() => {
      expect(
        document.querySelector<HTMLIFrameElement>(".raw-html-frame")!.srcdoc,
      ).toBe("<html>Second</html>");
    });

    expect(document.querySelectorAll(".raw-html-editor")).toHaveLength(1);
    expect(
      document
        .getElementById("raw-html-generate0")!
        .classList.contains("btn-outline-secondary"),
    ).toBe(true);
  });
});

describe("raw-html-editor layout", () => {
  it("shows the file in an iframe and grows the frame to the document", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    HtmlEntry.replace(paragraph, RAW_HTML, true, () => {});

    const iframe =
      document.querySelector<HTMLIFrameElement>(".raw-html-frame")!;
    Object.defineProperty(
      iframe.contentDocument!.documentElement,
      "scrollHeight",
      {
        configurable: true,
        value: 480,
      },
    );
    iframe.dispatchEvent(new Event("load"));

    expect(iframe.srcdoc).toBe(RAW_HTML);
    expect(iframe.style.height).toBe("480px");
    expect(iframe.getAttribute("scrolling")).toBe("no");
    expect(iframe.contentDocument!.documentElement.style.overflowX).toBe(
      "hidden",
    );
  });
});

describe("raw-html-editor Generate button", () => {
  it("toggles synthesis state and enables saving", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    HtmlEntry.replace(paragraph, RAW_HTML, true, enableSaveButton);

    document.getElementById("raw-html-generate0")!.click();

    expect(
      document
        .getElementById("raw-html-generate0")!
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

describe("raw-html-editor source editing", () => {
  it("opens a source editor when the preview is clicked", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    HtmlEntry.replace(paragraph, RAW_HTML, true, () => {});

    const host = rawHtmlEditor();
    host.click();

    const source = host.querySelector<HTMLTextAreaElement>(".raw-html-source")!;
    const iframe = host.querySelector<HTMLIFrameElement>(".raw-html-frame")!;
    expect(source.classList.contains("d-none")).toBe(false);
    expect(iframe.classList.contains("d-none")).toBe(true);
    expect(source.value).toBe(RAW_HTML);
    expect(source.style.minHeight).toBe(`${PARAGRAPH_EDITOR_HEIGHT_PX}px`);
  });

  it("writes edits back and returns to the preview on blur", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    HtmlEntry.replace(paragraph, RAW_HTML, true, () => {});

    const host = rawHtmlEditor();
    host.click();

    const source = host.querySelector<HTMLTextAreaElement>(".raw-html-source")!;
    source.value = "<html>Edited</html>";
    source.dispatchEvent(new Event("input"));
    source.dispatchEvent(new FocusEvent("blur"));

    expect(paragraph.textarea!.value).toBe("<html>Edited</html>");
    expect(
      host.querySelector<HTMLIFrameElement>(".raw-html-frame")!.srcdoc,
    ).toBe("<html>Edited</html>");
    expect(
      host
        .querySelector<HTMLTextAreaElement>(".raw-html-source")!
        .classList.contains("d-none"),
    ).toBe(true);
    expect(
      host
        .querySelector<HTMLIFrameElement>(".raw-html-frame")!
        .classList.contains("d-none"),
    ).toBe(false);
  });

  it("enables saving when the raw HTML is edited", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    HtmlEntry.replace(paragraph, RAW_HTML, true, enableSaveButton);

    const host = rawHtmlEditor();
    host.click();
    const source = host.querySelector<HTMLTextAreaElement>(".raw-html-source")!;
    source.value = "<html>Changed</html>";
    source.dispatchEvent(new Event("input"));

    expect(paragraph.textarea!.value).toBe("<html>Changed</html>");
    expect(
      document.getElementById("btn-save")!.classList.contains("btn-success"),
    ).toBe(true);
  });

  it("does not enter edit mode when Generate is clicked", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    HtmlEntry.replace(paragraph, RAW_HTML, true, () => {});

    document.getElementById("raw-html-generate0")!.click();

    expect(
      rawHtmlEditor()
        .querySelector(".raw-html-source")!
        .classList.contains("d-none"),
    ).toBe(true);
  });
});

describe("serialize raw-html-editor", () => {
  it("reads the file contents, host height and Generate state", () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    HtmlEntry.replace(paragraph, RAW_HTML, false, () => {});
    Object.defineProperty(
      document.querySelector(".raw-html-editor")!,
      "clientHeight",
      {
        configurable: true,
        value: 318,
      },
    );

    const saveData = generateSaveEntry(
      document.querySelectorAll(".save-content"),
    )!;

    expect(saveData["paragraph0"]).toEqual({
      text: RAW_HTML,
      height: 320,
      allow_ai_synthesis: 0,
      raw_html: 1,
      entry: "2024-03-15",
    });
  });
});

describe("initializeParagraphRow", () => {
  it("shows the raw-html-editor when the textarea is marked raw HTML", () => {
    const textarea = document.getElementById(
      "paragraph0",
    ) as HTMLTextAreaElement;
    textarea.value = RAW_HTML;
    textarea.setAttribute("data-raw-html", "1");
    textarea.setAttribute("data-allow-ai-synthesis", "0");

    initializeParagraphRow(ParagraphEntry.fromIndex("0")!);

    expect(tinymce.initOptions).toHaveLength(0);
    const host = document.querySelector<HTMLElement>(".raw-html-editor")!;
    expect(host.style.height).toBe("");
    expect(
      document
        .getElementById("raw-html-generate0")!
        .classList.contains("btn-outline-secondary"),
    ).toBe(true);
  });

  it("still creates TinyMCE when the textarea is not marked raw HTML", () => {
    const textarea = document.getElementById(
      "paragraph0",
    ) as HTMLTextAreaElement;
    textarea.value = RAW_HTML;

    initializeParagraphRow(ParagraphEntry.fromIndex("0")!);

    expect(tinymce.initOptions).toHaveLength(1);
    expect(
      document.querySelector(".raw-html-editor")!.classList.contains("d-none"),
    ).toBe(true);
  });
});
