import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  importMarkdownFromEditor,
  markdownToHtml,
  readMarkdownResource,
} from "../src/entry/paragraph/markdown";
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

const MARKDOWN = `# Title

A paragraph with **bold** text.
`;

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

beforeEach(() => {
  renderDayPage({ rows: ["paragraph"] });
  tinymce = installFakeTinyMCE();
});

describe("markdownToHtml", () => {
  it("converts headings, emphasis and paragraphs", () => {
    const html = markdownToHtml(MARKDOWN);

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<p>");
  });
});

describe("importMarkdownFromEditor", () => {
  it("writes converted HTML into TinyMCE and enables saving", async () => {
    createTinyMCE("#paragraph0", 260, true);
    const editor = tinymce.get("paragraph0")!;
    const click = chooseFileOnClick(
      fileNamed("notes.md", MARKDOWN, "text/markdown"),
    );

    importMarkdownFromEditor(asSynthesisEditor(editor));
    await vi.waitFor(() => {
      expect(editor.content).toContain("<h1>Title</h1>");
    });
    click.mockRestore();

    expect(editor.content).toContain("<strong>bold</strong>");
    expect(editor.removed).toBe(false);
    expect(tinymce.get("paragraph0")).not.toBeNull();
    expect(
      document.getElementById("btn-save")!.classList.contains("btn-success"),
    ).toBe(true);
  });

  it("accepts a .markdown file", async () => {
    createTinyMCE("#paragraph0", 220, true);
    const click = chooseFileOnClick(
      fileNamed("readme.markdown", "## Sub", "text/markdown"),
    );

    importMarkdownFromEditor(asSynthesisEditor(tinymce.get("paragraph0")!));
    await vi.waitFor(() => {
      expect(tinymce.get("paragraph0")!.content).toContain("<h2>Sub</h2>");
    });
    click.mockRestore();
  });

  it("does nothing when the file picker is cancelled", () => {
    const click = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => {});
    seedEditor(tinymce, "paragraph0", { content: "<p>Keep</p>" });

    importMarkdownFromEditor(asSynthesisEditor(tinymce.get("paragraph0")!));

    expect(tinymce.get("paragraph0")!.content).toBe("<p>Keep</p>");
    click.mockRestore();
  });

  it("ignores a non-markdown file", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const click = chooseFileOnClick(fileNamed("notes.txt", "# Hello"));
    seedEditor(tinymce, "paragraph0", { content: "<p>Keep</p>" });

    importMarkdownFromEditor(asSynthesisEditor(tinymce.get("paragraph0")!));

    expect(tinymce.get("paragraph0")!.content).toBe("<p>Keep</p>");
    expect(log).toHaveBeenCalledWith("Unknown markdown type");
    click.mockRestore();
    log.mockRestore();
  });
});

describe("readMarkdownResource", () => {
  it("replaces the current editor contents", async () => {
    const paragraph = ParagraphEntry.fromIndex("0")!;
    const editor = seedEditor(tinymce, "paragraph0", {
      content: "<p>Old</p>",
    });

    readMarkdownResource(fileNamed("first.md", "# First"), paragraph);
    await vi.waitFor(() => {
      expect(editor.content).toContain("<h1>First</h1>");
    });

    readMarkdownResource(fileNamed("second.md", "# Second"), paragraph);
    await vi.waitFor(() => {
      expect(editor.content).toContain("<h1>Second</h1>");
    });

    expect(editor.content).not.toContain("<h1>First</h1>");
    expect(editor.removed).toBe(false);
  });
});
